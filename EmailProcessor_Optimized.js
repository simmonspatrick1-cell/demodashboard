/**
 * @NApiVersion 2.1
 * @NScriptType ScheduledScript
 * @NModuleScope SameAccount
 *
 * Email Processor SuiteScript (Optimized)
 *
 * Improvements vs. baseline:
 * - Governance management: automatic reschedule when usage is low (safe threshold)
 * - Robust idempotency: reuse existing Estimates via externalId, optional for Projects
 * - Standard field logic:
 *    * Project Manager (employee) lookup by name/email and set on Job (project)
 *    * Billing Schedule lookup by name and set on Estimate (and Job if available)
 *    * Safer date parsing for start/end/due
 * - Conservative search columns to reduce governance
 * - Caching lookups (items/class/dept/location/employee/billing schedule)
 *
 * Records handled:
 *  - Customer (entity)
 *  - Project (job)
 *  - Project Task (projecttask)
 *  - Estimate (estimate)
 */

define(['N/record', 'N/search', 'N/log', 'N/https', 'N/email', 'N/encode', 'N/runtime', 'N/task'],
function(record, search, log, https, email, encode, runtime, task) {

  // ====== CONFIG ======
  var MAX_EMAILS_PER_RUN = 10;
  var RESCHEDULE_THRESHOLD = 300; // governance units to trigger reschedule

  // In-memory caches for this execution
  var CACHE = {
    itemByName: {},
    classByName: {},
    deptByName: {},
    locByName: {},
    employeeByKey: {},
    billSchedByName: {}
  };

  // Gmail configuration (loaded from script params)
  var GMAIL_CONFIG = {
    CLIENT_ID: '',
    CLIENT_SECRET: '',
    REFRESH_TOKEN: '',
    INBOX_EMAIL: '',
    QUERY: 'subject:"NetSuite Export" has:nouserlabels',
    USER_ID: 'me',
    ACCESS_TOKEN: ''
  };

  // ====== ENTRY POINT ======
  function execute(scriptContext) {
    try {
      initConfig();

      log.audit('Email Processor (Optimized)', 'Starting for inbox: ' + GMAIL_CONFIG.INBOX_EMAIL);

      // 1) Refresh Access Token
      if (!refreshAccessToken()) {
        throw new Error('Failed to refresh Gmail access token');
      }

      // 2) Fetch candidate emails
      var emails = fetchEmailsFromGmail();
      if (emails.length > MAX_EMAILS_PER_RUN) {
        emails = emails.slice(0, MAX_EMAILS_PER_RUN);
      }
      log.audit('Gmail', 'Processing ' + emails.length + ' email(s)');

      var processed = 0;
      var errors = [];

      for (var i = 0; i < emails.length; i++) {
        yieldIfNeeded('loop:emails (' + i + '/' + emails.length + ')');

        var emailData = emails[i];
        try {
          log.debug('Email', 'ID=' + emailData.id + ' Subject=' + emailData.subject);
          var parsedData = parseEmailContent(emailData.body);
          if (!parsedData) {
            log.error('Parse', 'No data parsed for email ' + emailData.id);
            continue;
          }

          var result = processParsedData(parsedData);
          if (result.success) {
            processed++;
            markEmailAsProcessed(emailData.id);
            log.audit('Processed', 'Email ' + emailData.id + ' ok');
          } else {
            errors.push({ emailId: emailData.id, error: result.error });
          }
        } catch (e) {
          log.error('Email Error', 'ID=' + emailData.id + ' error=' + e.toString());
          errors.push({ emailId: emailData.id, error: e.toString() });
        }
      }

      log.audit('Summary', 'Processed=' + processed + ' Errors=' + errors.length);
      if (errors.length) {
        sendErrorReport(errors);
      }

    } catch (e) {
      log.error('Execute Error', e.toString());
      throw e;
    }
  }

  // ====== GOVERNANCE / RESCHEDULE ======
  function yieldIfNeeded(context) {
    var remaining = runtime.getCurrentScript().getRemainingUsage();
    if (remaining <= RESCHEDULE_THRESHOLD) {
      log.audit('Reschedule', 'Low governance (' + remaining + '). ' + (context || ''));
      rescheduleSelf();
    }
  }

  function rescheduleSelf() {
    try {
      var cur = runtime.getCurrentScript();
      var t = task.create({
        taskType: task.TaskType.SCHEDULED_SCRIPT,
        scriptId: cur.id,
        deploymentId: cur.deploymentId,
        params: {} // pass-through if needed
      });
      var taskId = t.submit();
      log.audit('Reschedule', 'Submitted new run: ' + taskId);
    } catch (e) {
      log.error('Reschedule Error', e.toString());
    }
    // End this execution
    throw new Error('Rescheduling due to low governance');
  }

  // ====== PARAMS / AUTH ======
  function initConfig() {
    var s = runtime.getCurrentScript();
    GMAIL_CONFIG.CLIENT_ID = s.getParameter({ name: 'custscript_gmail_client_id' });
    GMAIL_CONFIG.CLIENT_SECRET = s.getParameter({ name: 'custscript_gmail_client_secret' });
    GMAIL_CONFIG.REFRESH_TOKEN = s.getParameter({ name: 'custscript_gmail_refresh_token' });
    GMAIL_CONFIG.INBOX_EMAIL = s.getParameter({ name: 'custscript_inbox_email' });

    if (!GMAIL_CONFIG.CLIENT_ID || !GMAIL_CONFIG.CLIENT_SECRET || !GMAIL_CONFIG.REFRESH_TOKEN) {
      throw new Error('Missing Gmail API credentials in script parameters');
    }
  }

  function refreshAccessToken() {
    try {
      var response = https.post({
        url: 'https://oauth2.googleapis.com/token',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: {
          client_id: GMAIL_CONFIG.CLIENT_ID,
          client_secret: GMAIL_CONFIG.CLIENT_SECRET,
          refresh_token: GMAIL_CONFIG.REFRESH_TOKEN,
          grant_type: 'refresh_token'
        }
      });
      if (response.code === 200) {
        var body = JSON.parse(response.body);
        GMAIL_CONFIG.ACCESS_TOKEN = body.access_token;
        return true;
      }
      log.error('Auth', 'Token refresh failed ' + response.code + ': ' + response.body);
    } catch (e) {
      log.error('Auth Exception', e.toString());
    }
    return false;
  }

  // ====== GMAIL ======
  function fetchEmailsFromGmail() {
    try {
      var url = 'https://gmail.googleapis.com/gmail/v1/users/' + GMAIL_CONFIG.USER_ID + '/messages';
      var headers = { 'Authorization': 'Bearer ' + GMAIL_CONFIG.ACCESS_TOKEN };
      var resp = https.get({ url: url + '?' + buildQueryString({ q: GMAIL_CONFIG.QUERY, maxResults: MAX_EMAILS_PER_RUN }), headers: headers });
      if (resp.code !== 200) {
        log.error('Gmail', 'List HTTP ' + resp.code + ': ' + resp.body);
        return [];
      }
      var listing = JSON.parse(resp.body);
      if (!listing.messages || !listing.messages.length) return [];

      var out = [];
      for (var i = 0; i < listing.messages.length; i++) {
        yieldIfNeeded('loop:fetchEmailDetails msg=' + i);
        var m = listing.messages[i];
        var ed = fetchEmailDetails(m.id);
        if (ed) out.push(ed);
      }
      return out;
    } catch (e) {
      log.error('Gmail List Error', e.toString());
      return [];
    }
  }

  function fetchEmailDetails(messageId) {
    try {
      var url = 'https://gmail.googleapis.com/gmail/v1/users/' + GMAIL_CONFIG.USER_ID + '/messages/' + messageId;
      var headers = { 'Authorization': 'Bearer ' + GMAIL_CONFIG.ACCESS_TOKEN };
      var r = https.get({ url: url, headers: headers });
      if (r.code !== 200) {
        log.error('Gmail Detail', 'HTTP ' + r.code);
        return null;
      }
      var messageData = JSON.parse(r.body);

      var subject = '';
      var body = '';

      if (messageData.payload) {
        if (messageData.payload.headers) {
          for (var i = 0; i < messageData.payload.headers.length; i++) {
            if (messageData.payload.headers[i].name === 'Subject') {
              subject = messageData.payload.headers[i].value;
              break;
            }
          }
        }
        body = extractEmailBody(messageData.payload);
      }

      return { id: messageId, subject: subject, body: body };
    } catch (e) {
      log.error('Gmail Detail Error', e.toString());
      return null;
    }
  }

  function extractEmailBody(payload) {
    var body = '';
    if (payload.body && payload.body.data) {
      body = base64Decode(payload.body.data);
    } else if (payload.parts) {
      for (var i = 0; i < payload.parts.length; i++) {
        var part = payload.parts[i];
        if (part.mimeType === 'text/plain' && part.body && part.body.data) {
          body = base64Decode(part.body.data);
          break;
        } else if (part.parts) {
          var nested = extractEmailBody(part);
          if (nested) { body = nested; break; }
        }
      }
    }
    return body;
  }

  function base64Decode(str) {
    try {
      var base64Str = str.replace(/-/g, '+').replace(/_/g, '/');
      return encode.convert({
        string: base64Str,
        inputEncoding: encode.Encoding.BASE_64,
        outputEncoding: encode.Encoding.UTF_8
      });
    } catch (e) {
      log.error('Base64', e.toString());
      return str;
    }
  }

  // ====== PARSE ======
  function parseEmailContent(emailBody) {
    var data = {};
    var clean = (emailBody || '').replace(/<[^>]*>/g, '');
    var lines = clean.split(/\r?\n/);

    for (var i = 0; i < lines.length; i++) {
      var line = (lines[i] || '').trim();
      if (!line) continue;

      // Hashtag pattern
      if (line.indexOf('#') !== -1) {
        var m = line.match(/#(\w+)\s*:\s*(.+)/);
        if (m) {
          var key = m[1], value = m[2].trim();
          switch (key) {
            case 'tasks': data.tasks = parseTasks(lines, i + 1); break;
            case 'checklists': data.checklists = parseChecklists(lines, i + 1); break;
            case 'estimateItems': data.estimateItems = parseEstimateItems(lines, i + 1); break;
            case 'resources': data.resources = parseResources(lines, i + 1); break;
            default: data[key] = value;
          }
        }
      }

      // JSON block
      if (line === '--- JSON DATA ---' && i < lines.length - 1) {
        try {
          var jsonText = lines.slice(i + 1).join('\n');
          var jsonData = JSON.parse(jsonText);
          data = Object.assign(data, jsonData);
        } catch (e) {
          log.error('JSON Parse', e.toString());
        }
        break;
      }
    }

    if (!Object.keys(data).length) return null;
    return data;
  }

  function parseTasks(lines, start) {
    var tasks = [], cur = null;
    for (var i = start; i < lines.length && !lines[i].startsWith('#'); i++) {
      var line = (lines[i] || '').trim();
      if (!line) continue;
      if (/^Task \d+:/i.test(line)) {
        if (cur) tasks.push(cur);
        cur = { name: line.replace(/^Task \d+:\s*/i, '') };
      } else if (line.startsWith('Estimated Hours:') && cur) {
        cur.estimatedHours = line.replace('Estimated Hours:', '').trim();
      } else if (line.startsWith('Assignee:') && cur) {
        cur.assignee = line.replace('Assignee:', '').trim();
      } else if (line.startsWith('Due Date:') && cur) {
        cur.dueDate = line.replace('Due Date:', '').trim();
      }
    }
    if (cur) tasks.push(cur);
    return tasks;
  }

  function parseChecklists(lines, start) {
    var list = [], cur = null;
    for (var i = start; i < lines.length && !lines[i].startsWith('#'); i++) {
      var line = (lines[i] || '').trim();
      if (/^Checklist \d+:/i.test(line)) {
        if (cur) list.push(cur);
        cur = { name: line.replace(/^Checklist \d+:\s*/i, ''), items: [] };
      } else if (/^[✓○]/.test(line) && cur) {
        cur.items.push({ name: line.replace(/^[✓○]\s*/, ''), completed: line.charAt(0) === '✓' });
      }
    }
    if (cur) list.push(cur);
    return list;
  }

  function parseEstimateItems(lines, start) {
    var items = [];
    for (var i = start; i < lines.length && !lines[i].startsWith('#'); i++) {
      var line = (lines[i] || '').trim();
      if (/^-/.test(line)) {
        var m = line.match(/^- (.+): Qty=(\d+), Rate=([\d.]+)/);
        if (m) items.push({ name: m[1].trim(), quantity: parseInt(m[2], 10), rate: parseFloat(m[3]) });
      }
    }
    return items;
  }

  function parseResources(lines, start) {
    var resources = [];
    for (var i = start; i < lines.length && !lines[i].startsWith('#'); i++) {
      var line = (lines[i] || '').trim();
      if (/^-/.test(line)) {
        var m = line.match(/^- (.+): ([\d.]+)hrs @ \$([\d.]+)\/hr/);
        if (m) resources.push({ name: m[1].trim(), hours: parseFloat(m[2]), rate: parseFloat(m[3]) });
      }
    }
    return resources;
  }

  // ====== PROCESS FLOW ======
  function processParsedData(data) {
    try {
      var customerId = null, projectId = null, estimateId = null;

      if (data.customerName || data.customerEntityId || (data.customer && (data.customer.name || data.customer.entityid))) {
        customerId = createOrFindCustomer(data);
        if (!customerId) return { success: false, error: 'Customer create/find failed' };
      }

      if ((data.project || data.projectName || data.entityid) && customerId) {
        projectId = createOrFindProject(data, customerId);
      }

      // Tasks under project
      if (data.tasks && projectId) {
        for (var i = 0; i < data.tasks.length; i++) {
          yieldIfNeeded('loop:tasks (' + i + ')');
        }
        createTasks(data.tasks, projectId);
      }

      // Estimate via JSON (preferred) or via hashtags
      if (data.estimate && customerId) {
        var estimateData = data.estimate;
        if (!estimateData.items && data.estimateItems) estimateData.items = data.estimateItems;

        var extId = estimateData.externalId || data.idempotencyKey || data.exportId;
        if (extId) {
          var exist = findEstimateByExternalId(extId);
          estimateId = exist || createEstimate(estimateData, customerId, projectId, extId, data);
        } else {
          estimateId = createEstimate(estimateData, customerId, projectId, null, data);
        }
      } else if (data.estimateType && customerId) {
        var extId2 = data.idempotencyKey || data.exportId;
        var exist2 = extId2 ? findEstimateByExternalId(extId2) : null;
        estimateId = exist2 || createEstimate(data, customerId, projectId, extId2 || null, data);
      }

      return { success: true, customerId: customerId, projectId: projectId, estimateId: estimateId };
    } catch (e) {
      log.error('Process Data Error', e.toString());
      return { success: false, error: e.toString() };
    }
  }

  // ====== CUSTOMER ======
  function createOrFindCustomer(data) {
    try {
      var c = data.customer || data;
      var entityid = (c.entityid || c.customerEntityId || c.name || c.customerName || '').trim();
      var company = (c.name || c.customerName || c.entityid || c.customerEntityId || '').trim();

      if (entityid) {
        var s1 = search.create({
          type: search.Type.CUSTOMER,
          filters: [['entityid', 'is', entityid]],
          columns: ['internalid']
        }).run().getRange({ start: 0, end: 1 });
        if (s1 && s1.length) return s1[0].id;
      }

      if (company && company !== entityid) {
        var s2 = search.create({
          type: search.Type.CUSTOMER,
          filters: [['companyname', 'is', company]],
          columns: ['internalid']
        }).run().getRange({ start: 0, end: 1 });
        if (s2 && s2.length) return s2[0].id;
      }

      var rec = record.create({ type: record.Type.CUSTOMER, isDynamic: true });
      rec.setValue({ fieldId: 'entityid', value: entityid || company });
      rec.setValue({ fieldId: 'companyname', value: company || entityid });

      var subsidiary = c.subsidiary || c.customerSubsidiary || 1;
      try { rec.setValue({ fieldId: 'subsidiary', value: subsidiary }); } catch (e) {}

      if (c.email || c.customerEmail) rec.setValue({ fieldId: 'email', value: c.email || c.customerEmail });
      if (c.phone || c.customerPhone) rec.setValue({ fieldId: 'phone', value: c.phone || c.customerPhone });

      var id = rec.save();
      return id;
    } catch (e) {
      log.error('Customer Error', e.toString());
      return null;
    }
  }

  // ====== PROJECT / JOB ======
  function createOrFindProject(data, customerId) {
    try {
      var p = data.project || data;

      var code = p.entityid || p.projectEntityid || p.code || p.projectCode || p.name || p.projectName;
      var name = p.name || p.projectName || code;

      // Optional idempotency for project: search by entityid under same customer
      if (code) {
        var s = search.create({
          type: search.Type.JOB,
          filters: [
            ['entityid', 'is', code],
            'AND',
            ['customer', 'anyof', customerId]
          ],
          columns: ['internalid']
        }).run().getRange({ start: 0, end: 1 });
        if (s && s.length) {
          var existing = s[0].id;
          // Try to backfill project manager / billingsched if added later
          backfillProjectFields(existing, p);
          return existing;
        }
      }

      var rec = record.create({ type: record.Type.JOB });
      rec.setValue({ fieldId: 'entityid', value: code || ('PROJ-' + Date.now()) });
      rec.setValue({ fieldId: 'companyname', value: name || 'Project' });
      rec.setValue({ fieldId: 'customer', value: customerId });

      // Dates
      var sd = parseDate(p.startDate || p.projectStartDate);
      var ed = parseDate(p.endDate || p.projectEndDate);
      if (sd) { try { rec.setValue({ fieldId: 'startdate', value: sd }); } catch (e) {} }
      if (ed) { try { rec.setValue({ fieldId: 'enddate', value: ed }); } catch (e) {} }

      // Budget
      var budget = p.budget || p.projectBudget;
      if (budget) {
        try {
          var b = (typeof budget === 'string') ? parseFloat(budget.replace(/[^0-9.]/g, '')) : budget;
          rec.setValue({ fieldId: 'projectedtotalvalue', value: b });
        } catch (e) {}
      }

      // Status (if account allows direct set)
      if (p.status || p.projectStatus) {
        try { rec.setValue({ fieldId: 'status', value: p.status || p.projectStatus }); } catch (e) {}
      }

      // Description
      if (p.description || p.projectDescription) {
        try { rec.setValue({ fieldId: 'comments', value: p.description || p.projectDescription }); } catch (e) {}
      }

      // Project Manager (employee)
      var pmKey = p.projectManager || p.manager || p.pm;
      var pmId = pmKey ? getEmployeeIdByNameOrEmail(pmKey) : null;
      if (pmId) {
        try { rec.setValue({ fieldId: 'projectmanager', value: pmId }); } catch (e) { log.debug('PM set fail', e.toString()); }
      }

      // Billing Schedule (if field is present on Job)
      var billName = p.billingSchedule || data.billingSchedule;
      var billId = billName ? getBillingScheduleIdByName(billName) : null;
      if (billId) {
        try { rec.setValue({ fieldId: 'billingschedule', value: billId }); } catch (e) { log.debug('Job billingschedule set fail', e.toString()); }
      }

      var id = rec.save();
      return id;

    } catch (e) {
      log.error('Project Error', e.toString());
      return null;
    }
  }

  function backfillProjectFields(projectId, p) {
    try {
      var doUpdate = false;
      var rec = record.load({ type: record.Type.JOB, id: projectId });

      // PM
      if (p.projectManager) {
        var pmId = getEmployeeIdByNameOrEmail(p.projectManager);
        if (pmId) {
          try { rec.setValue({ fieldId: 'projectmanager', value: pmId }); doUpdate = true; } catch (e) {}
        }
      }
      // Billing Schedule
      if (p.billingSchedule) {
        var b = getBillingScheduleIdByName(p.billingSchedule);
        if (b) {
          try { rec.setValue({ fieldId: 'billingschedule', value: b }); doUpdate = true; } catch (e) {}
        }
      }
      if (doUpdate) rec.save();
    } catch (e) {
      log.debug('Project Backfill', e.toString());
    }
  }

  // ====== PROJECT TASKS ======
  function createTasks(tasks, projectId) {
    for (var i = 0; i < tasks.length; i++) {
      yieldIfNeeded('loop:createTasks (' + i + ')');

      try {
        var t = tasks[i];
        var rec = record.create({ type: record.Type.PROJECT_TASK });
        rec.setValue({ fieldId: 'job', value: projectId });
        rec.setValue({ fieldId: 'title', value: t.name || ('Task ' + (i + 1)) });

        if (t.estimatedHours) {
          var hours = parseFloat(t.estimatedHours) || 0;
          rec.setValue({ fieldId: 'estimatedwork', value: hours });
        }
        if (t.dueDate) {
          var dd = parseDate(t.dueDate);
          if (dd) try { rec.setValue({ fieldId: 'enddate', value: dd }); } catch (e) {}
        }
        rec.save();
      } catch (e) {
        log.error('Task Error', 'task=' + (tasks[i].name || (i + 1)) + ' err=' + e.toString());
      }
    }
  }

  // ====== ESTIMATE ======
  function createEstimate(dataOrEstimate, customerId, projectId, externalId, root) {
    try {
      var est = dataOrEstimate.estimate || dataOrEstimate;

      var rec = record.create({ type: record.Type.ESTIMATE, isDynamic: true });
      rec.setValue({ fieldId: 'entity', value: customerId });
      rec.setValue({ fieldId: 'trandate', value: new Date() });

      if (projectId) {
        try { rec.setValue({ fieldId: 'job', value: projectId }); } catch (e) {}
      }

      // Due Date
      var due = est.dueDate || dataOrEstimate.estimateDueDate;
      var d = parseDate(due);
      if (d) { try { rec.setValue({ fieldId: 'duedate', value: d }); } catch (e) {} }

      // Status
      var statusValue = est.status || dataOrEstimate.estimateStatus;
      if (statusValue) {
        try {
          var mapped = mapEstimateStatus(statusValue);
          rec.setValue({ fieldId: 'status', value: mapped });
        } catch (e) {}
      }

      // Memo
      var memo = est.memo || est.message || dataOrEstimate.memo || dataOrEstimate.message || (root && (root.memo || root.message));
      if (memo) { try { rec.setValue({ fieldId: 'memo', value: memo }); } catch (e) {} }

      // External Id (idempotency)
      if (externalId) {
        try { rec.setValue({ fieldId: 'externalid', value: externalId }); } catch (e) {}
      }

      // Classification
      var classVal = est.class || est.classId || dataOrEstimate.estimateClass;
      var deptVal = est.department || est.departmentId || dataOrEstimate.estimateDepartment;
      var locVal = est.location || est.locationId || dataOrEstimate.estimateLocation;
      var cid = classVal ? getClassIdByName(classVal) : null;
      var did = deptVal ? getDepartmentIdByName(deptVal) : null;
      var lid = locVal ? getLocationIdByName(locVal) : null;
      if (cid) try { rec.setValue({ fieldId: 'class', value: cid }); } catch (e) {}
      if (did) try { rec.setValue({ fieldId: 'department', value: did }); } catch (e) {}
      if (lid) try { rec.setValue({ fieldId: 'location', value: lid }); } catch (e) {}

      // Billing Schedule on Estimate (optional)
      var billName = est.billingSchedule || (root && root.billingSchedule);
      var billId = billName ? getBillingScheduleIdByName(billName) : null;
      if (billId) {
        try { rec.setValue({ fieldId: 'billingschedule', value: billId }); } catch (e) { log.debug('Estimate billingschedule set fail', e.toString()); }
      }

      // Line items
      var items = est.items || dataOrEstimate.items || dataOrEstimate.estimateItems;
      if (items && items.length) {
        for (var i = 0; i < items.length; i++) {
          yieldIfNeeded('loop:estimateItems (' + i + ')');

          var it = items[i];
          var displayName = it.displayName || it.name;
          var customName = it.displayName && it.displayName !== it.name;

          rec.selectNewLine({ sublistId: 'item' });

          var itemId = null;
          if (it.nsItemId || it.itemId || it.internalId) itemId = parseInt(it.nsItemId || it.itemId || it.internalId, 10);

          if (!itemId) {
            if (customName) {
              // Check if already exists by custom display name
              itemId = getItemIdByName(displayName);
              if (!itemId) {
                var srcId = getItemIdByName(it.name);
                itemId = srcId ? copyAndRenameItem(srcId, displayName, it.description) : createServiceItem(displayName, it.description);
              }
            } else {
              itemId = getItemIdByName(it.name) || createServiceItem(displayName, it.description);
            }
          }
          if (!itemId) itemId = findGenericServiceItem();

          if (itemId) {
            rec.setCurrentSublistValue({ sublistId: 'item', fieldId: 'item', value: itemId });
            rec.setCurrentSublistValue({ sublistId: 'item', fieldId: 'quantity', value: it.quantity || 1 });
            rec.setCurrentSublistValue({ sublistId: 'item', fieldId: 'rate', value: it.rate || 0 });

            var desc = it.description || it.name || '';
            if (desc) rec.setCurrentSublistValue({ sublistId: 'item', fieldId: 'description', value: desc });

            var amount = (it.quantity || 1) * (it.rate || 0);
            try { rec.setCurrentSublistValue({ sublistId: 'item', fieldId: 'amount', value: amount }); } catch (e) {}

            rec.commitLine({ sublistId: 'item' });
          } else {
            log.error('Item Missing', 'Unable to resolve item for ' + (it.name || '(unnamed)'));
            rec.cancelLine({ sublistId: 'item' });
          }
        }
      }

      var id = rec.save();
      return id;

    } catch (e) {
      log.error('Estimate Error', e.toString());
      return null;
    }
  }

  function mapEstimateStatus(v) {
    // NetSuite estimate statuses: 'A'=Open, 'B'=Pending, 'C'=Closed, 'D'=Expired
    var s = (v || '').toString().toUpperCase();
    if (s === 'PENDING') return 'B';
    if (s === 'OPEN') return 'A';
    if (s === 'CLOSED') return 'C';
    if (s === 'EXPIRED') return 'D';
    return s; // if already code, use as-is
  }

  // ====== LOOKUPS ======
  function findEstimateByExternalId(externalId) {
    try {
      if (!externalId) return null;
      var r = search.create({
        type: search.Type.ESTIMATE,
        filters: [['externalidstring', 'is', externalId]],
        columns: ['internalid']
      }).run().getRange({ start: 0, end: 1 });
      return (r && r.length) ? parseInt(r[0].getValue('internalid'), 10) : null;
    } catch (e) {
      log.error('Find Estimate', e.toString());
      return null;
    }
  }

  var ITEM_NAME_MAPPINGS = {
    'PS - Post Go-Live Support': 'PS - Post Go-Live Support',
    'PS - Go-Live Support': 'PS - Go-Live Support',
    'PS - Training Services': 'PS - Training Services',
    'PS - Data Migration': 'PS - Data Migration',
    'PS - Discovery & Design Strategy': 'PS - Discovery & Design Strategy',
    'Professional Services': 'PS - Post Go-Live Support',
    'Implementation Services': 'PS - Post Go-Live Support',
    'Consulting Services': 'SVC_PR_Consulting',
    'Travel & Expenses': 'EXP_Travel Expenses',
    'Travel': 'SVC_PR_Travel',
    'Software Licensing': 'NIN_AA1: SaaS License A',
    'License': 'NIN_AA1: Perpetual License',
    'Subscription': 'NIN_AA1: SaaS License A',
    'Training': 'PS - Training Services',
    'Training Services': 'PS - Training Services',
    'Support Services': 'PS - Post Go-Live Support',
    'Hourly Support': 'SVC_PR_Hourly Support',
    'Project Management': 'SVC_PR_Project Management',
    'Development': 'SVC_PR_Development',
    'Custom Development': 'SVC_PR_Development',
    'Testing': 'SVC_PR_Testing',
    'QA Services': 'SVC_PR_Testing',
    'Data Migration': 'PS - Data Migration',
    'Business Analysis': 'SVC_PR_Business Analysis',
    'Integration': 'SVC_PR_Integration',
    'API Integration': 'SVC_PR_Integration'
  };

  function getItemIdByName(itemName) {
    try {
      var mapped = ITEM_NAME_MAPPINGS[itemName] || itemName;
      if (CACHE.itemByName[mapped]) return CACHE.itemByName[mapped];
      if (CACHE.itemByName[itemName]) return CACHE.itemByName[itemName];

      var s = search.create({
        type: search.Type.ITEM,
        filters: [
          ['isinactive', 'is', 'F'], 'AND',
          [
            ['name', 'is', mapped], 'OR',
            ['itemid', 'is', mapped], 'OR',
            ['displayname', 'is', mapped], 'OR',
            ['name', 'is', itemName], 'OR',
            ['itemid', 'is', itemName], 'OR',
            ['displayname', 'is', itemName]
          ]
        ],
        columns: ['internalid']
      }).run().getRange({ start: 0, end: 1 });

      if (s && s.length) {
        var id = parseInt(s[0].getValue('internalid'), 10);
        CACHE.itemByName[mapped] = id;
        CACHE.itemByName[itemName] = id;
        return id;
      }

      // partial fallback
      var p = search.create({
        type: search.Type.ITEM,
        filters: [
          ['isinactive', 'is', 'F'], 'AND',
          [
            ['name', 'contains', 'Service'], 'OR',
            ['displayname', 'contains', 'Service']
          ]
        ],
        columns: ['internalid']
      }).run().getRange({ start: 0, end: 1 });

      if (p && p.length) {
        var pid = parseInt(p[0].getValue('internalid'), 10);
        CACHE.itemByName[mapped] = pid;
        CACHE.itemByName[itemName] = pid;
        return pid;
      }
      return null;

    } catch (e) {
      log.error('Item Lookup', e.toString());
      return null;
    }
  }

  function copyAndRenameItem(sourceItemId, newDisplayName, description) {
    try {
      var src = record.load({ type: record.Type.SERVICE_ITEM, id: sourceItemId, isDynamic: false });
      var rec = record.create({ type: record.Type.SERVICE_ITEM, isDynamic: true });

      var safeId = (newDisplayName || 'ITEM').replace(/[^a-zA-Z0-9]/g, '_').substring(0, 40);
      rec.setValue({ fieldId: 'itemid', value: safeId });
      rec.setValue({ fieldId: 'displayname', value: newDisplayName });
      rec.setValue({ fieldId: 'description', value: description || newDisplayName });
      rec.setValue({ fieldId: 'salesdescription', value: description || newDisplayName });

      try { var rate = src.getValue('rate'); if (rate) rec.setValue({ fieldId: 'rate', value: rate }); } catch (e) {}
      try { var inc = src.getValue('incomeaccount'); if (inc) rec.setValue({ fieldId: 'incomeaccount', value: inc }); } catch (e) {}
      try { var exp = src.getValue('expenseaccount'); if (exp) rec.setValue({ fieldId: 'expenseaccount', value: exp }); } catch (e) {}
      try { var sub = src.getValue('subsidiary'); if (sub) rec.setValue({ fieldId: 'subsidiary', value: sub }); } catch (e) {}

      var id = rec.save();
      return id;
    } catch (e) {
      log.error('Copy Item', e.toString());
      return createServiceItem(newDisplayName, description);
    }
  }

  function createServiceItem(itemName, description) {
    try {
      var rec = record.create({ type: record.Type.SERVICE_ITEM, isDynamic: true });
      var safe = (itemName || 'ITEM').replace(/[^a-zA-Z0-9]/g, '_').substring(0, 40);
      rec.setValue({ fieldId: 'itemid', value: safe });
      rec.setValue({ fieldId: 'displayname', value: itemName });
      if (description) rec.setValue({ fieldId: 'description', value: description });
      rec.setValue({ fieldId: 'salesdescription', value: description || itemName });
      try { rec.setValue({ fieldId: 'rate', value: 0 }); } catch (e) {}
      return rec.save();
    } catch (e) {
      log.error('Create Item', e.toString());
      return null;
    }
  }

  function findGenericServiceItem() {
    try {
      var r = search.create({
        type: search.Type.SERVICE_ITEM,
        filters: [['isinactive', 'is', 'F']],
        columns: ['internalid']
      }).run().getRange({ start: 0, end: 1 });
      if (r && r.length) return r[0].getValue('internalid');
    } catch (e) {
      log.error('Generic Item', e.toString());
    }
    return null;
  }

  // ====== CLASSIFICATION LOOKUPS ======
  function getClassIdByName(val) {
    try {
      if (val == null) return null;
      if (typeof val === 'number' || !isNaN(val)) return parseInt(val, 10);
      if (CACHE.classByName[val]) return CACHE.classByName[val];

      var r = search.create({
        type: search.Type.CLASSIFICATION,
        filters: [
          ['isinactive', 'is', 'F'], 'AND',
          [['name', 'is', val], 'OR', ['displayname', 'is', val]]
        ],
        columns: ['internalid']
      }).run().getRange({ start: 0, end: 1 });

      var id = (r && r.length) ? parseInt(r[0].getValue('internalid'), 10) : null;
      if (id) CACHE.classByName[val] = id;
      return id;
    } catch (e) {
      log.error('Class Lookup', e.toString());
      return null;
    }
  }

  function getDepartmentIdByName(val) {
    try {
      if (val == null) return null;
      if (typeof val === 'number' || !isNaN(val)) return parseInt(val, 10);
      if (CACHE.deptByName[val]) return CACHE.deptByName[val];

      var r = search.create({
        type: search.Type.DEPARTMENT,
        filters: [
          ['isinactive', 'is', 'F'], 'AND',
          [['name', 'is', val], 'OR', ['displayname', 'is', val]]
        ],
        columns: ['internalid']
      }).run().getRange({ start: 0, end: 1 });

      var id = (r && r.length) ? parseInt(r[0].getValue('internalid'), 10) : null;
      if (id) CACHE.deptByName[val] = id;
      return id;
    } catch (e) {
      log.error('Dept Lookup', e.toString());
      return null;
    }
  }

  function getLocationIdByName(val) {
    try {
      if (val == null) return null;
      if (typeof val === 'number' || !isNaN(val)) return parseInt(val, 10);
      if (CACHE.locByName[val]) return CACHE.locByName[val];

      var r = search.create({
        type: search.Type.LOCATION,
        filters: [
          ['isinactive', 'is', 'F'], 'AND',
          [['name', 'is', val], 'OR', ['displayname', 'is', val]]
        ],
        columns: ['internalid']
      }).run().getRange({ start: 0, end: 1 });

      var id = (r && r.length) ? parseInt(r[0].getValue('internalid'), 10) : null;
      if (id) CACHE.locByName[val] = id;
      return id;
    } catch (e) {
      log.error('Loc Lookup', e.toString());
      return null;
    }
  }

  // ====== EMPLOYEE LOOKUP (Project Manager) ======
  function getEmployeeIdByNameOrEmail(key) {
    try {
      if (!key) return null;
      var norm = key.toString().trim().toLowerCase();
      if (CACHE.employeeByKey[norm]) return CACHE.employeeByKey[norm];

      var filters = [['isinactive', 'is', 'F'], 'AND'];
      if (norm.indexOf('@') !== -1) {
        // Email
        filters.push(['email', 'is', key]);
      } else {
        // Name (first/last/altname contains)
        filters.push([['firstname', 'is', key], 'OR', ['lastname', 'is', key], 'OR', ['altname', 'contains', key]]);
      }

      var r = search.create({
        type: search.Type.EMPLOYEE,
        filters: filters,
        columns: ['internalid', 'email', 'firstname', 'lastname', 'altname']
      }).run().getRange({ start: 0, end: 1 });

      var id = (r && r.length) ? parseInt(r[0].getValue('internalid'), 10) : null;
      if (id) CACHE.employeeByKey[norm] = id;
      return id;
    } catch (e) {
      log.debug('Employee Lookup', e.toString());
      return null;
    }
  }

  // ====== BILLING SCHEDULE LOOKUP ======
  function getBillingScheduleIdByName(name) {
    try {
      if (!name) return null;
      var key = name.toString().trim().toLowerCase();
      if (CACHE.billSchedByName[key]) return CACHE.billSchedByName[key];

      // search.Type.BILLING_SCHEDULE is supported in SS2.x
      var r = search.create({
        type: search.Type.BILLING_SCHEDULE,
        filters: [['isinactive', 'is', 'F'], 'AND', ['name', 'contains', name]],
        columns: ['internalid', 'name']
      }).run().getRange({ start: 0, end: 1 });

      var id = (r && r.length) ? parseInt(r[0].getValue('internalid'), 10) : null;
      if (id) CACHE.billSchedByName[key] = id;
      return id;
    } catch (e) {
      log.debug('Billing Schedule Lookup', e.toString());
      return null;
    }
  }

  // ====== UTIL ======
  function parseDate(v) {
    if (!v) return null;
    try {
      // Accept yyyy-mm-dd or Date-compatible string
      var d = new Date(v);
      if (isNaN(d.getTime())) return null;
      return d;
    } catch (e) { return null; }
  }

  function markEmailAsProcessed(messageId) {
    // For now just log; implement Gmail modify/removeLabel to archive if desired
    log.debug('Processed', 'Email ' + messageId + ' marked processed');
  }

  function sendErrorReport(errors) {
    try {
      var body = 'The following emails failed to process:\n\n';
      for (var i = 0; i < errors.length; i++) {
        body += 'Email ID: ' + errors[i].emailId + '\n';
        body += 'Error: ' + errors[i].error + '\n\n';
      }
      log.error('Error Report', body);
      // Optionally email.send(...) if you have an author ID
    } catch (e) {
      log.error('Error Report Send', e.toString());
    }
  }

  function buildQueryString(params) {
    var parts = [];
    for (var k in params) if (params.hasOwnProperty(k)) parts.push(encodeURIComponent(k) + '=' + encodeURIComponent(params[k]));
    return parts.join('&');
  }

  return { execute: execute };
});
