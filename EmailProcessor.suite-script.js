/**
 * @NApiVersion 2.1
 * @NScriptType ScheduledScript
 * @NModuleScope SameAccount
 *
 * Email Processor SuiteScript
 *
 * This scheduled script processes emails from Gmail API containing NetSuite data
 * formatted with hashtags. It parses the emails and creates NetSuite records:
 * - Customers
 * - Projects
 * - Tasks
 * - Estimates
 * - Checklists
 *
 * Setup:
 * 1. Configure Gmail API credentials (OAuth 2.0)
 * 2. Set up scheduled script to run every 15-30 minutes
 * 3. Configure email inbox to monitor (e.g., plaindad69@gmail.com)
 *
 * Email Format Expected:
 * #projectName: NTI Implementation
 * #estimateType: T&M
 * #customerName: Company Name
 * ...
 *
 * ==========================================================================
 * REQUIRED FIELDS FOR RECORD CREATION
 * ==========================================================================
 *
 * CUSTOMER RECORD (record.Type.CUSTOMER):
 * Required:
 *   - entityid: Customer ID/Code
 *   - companyname: Company Name
 *   - subsidiary: Subsidiary (defaults to 1)
 * Optional (Standard NetSuite Fields Only):
 *   - email: Email address
 *   - phone: Phone number
 *
 * PROJECT RECORD (record.Type.JOB):
 * Required:
 *   - entityid: Project Code/ID
 *   - companyname: Project Name
 *   - customer: Customer Internal ID (parent customer)
 * Optional:
 *   - startdate: Project Start Date
 *   - enddate: Project End Date
 *   - projectedtotalvalue: Budget
 *   - status: Project Status
 *   - comments: Description/Comments
 *
 * ESTIMATE RECORD (record.Type.ESTIMATE):
 * Required:
 *   - entity: Customer Internal ID
 *   - trandate: Transaction Date (defaults to today)
 * Optional:
 *   - job: Project Internal ID
 *   - duedate: Due Date
 *   - status: Estimate Status (A=Open, B=Pending, C=Closed, D=Expired)
 *   - memo: Memo/Message
 *   - Line items (sublist 'item'):
 *     - item: Item Internal ID
 *     - quantity: Quantity
 *     - rate: Rate/Price
 *     - description: Line item description
 *     - amount: Total amount (calculated)
 *
 * SEARCH OPTIMIZATION:
 * - Customer searches only pull 'internalid' column (minimal governance usage)
 * - Item searches pull 'internalid', 'name', 'itemid', 'type' columns only
 *
 * CUSTOM FIELDS:
 * - This script uses ONLY standard NetSuite fields
 * - No custom fields are required for basic customer/estimate/project creation
 * - If you need additional fields (industry, revenue, etc.), create custom entity
 *   fields in NetSuite first, then add them to the createOrFindCustomer function
 *
 * ==========================================================================
 */

define(['N/record', 'N/search', 'N/log', 'N/https', 'N/email', 'N/encode', 'N/runtime'], 
function(record, search, log, https, email, encode, runtime) {
    
    /**
     * Gmail API Configuration
     * Set these as script parameters or in a configuration file
     */
    var GMAIL_CONFIG = {
        CLIENT_ID: '',
        CLIENT_SECRET: '',
        REFRESH_TOKEN: '',
        INBOX_EMAIL: '',
        QUERY: 'subject:"NetSuite Export" has:nouserlabels',
        USER_ID: 'me',
        ACCESS_TOKEN: ''    // Will be populated at runtime
    };

    /**
     * Main execution function
     */
    function execute(scriptContext) {
        try {
            // Initialize config from script parameters
            var currentScript = runtime.getCurrentScript();
            GMAIL_CONFIG.CLIENT_ID = currentScript.getParameter({ name: 'custscript_gmail_client_id' });
            GMAIL_CONFIG.CLIENT_SECRET = currentScript.getParameter({ name: 'custscript_gmail_client_secret' });
            GMAIL_CONFIG.REFRESH_TOKEN = currentScript.getParameter({ name: 'custscript_gmail_refresh_token' });
            GMAIL_CONFIG.INBOX_EMAIL = currentScript.getParameter({ name: 'custscript_inbox_email' });

            if (!GMAIL_CONFIG.CLIENT_ID || !GMAIL_CONFIG.CLIENT_SECRET || !GMAIL_CONFIG.REFRESH_TOKEN) {
                throw new Error('Missing Gmail API credentials in script parameters. Please configure custscript_gmail_client_id, custscript_gmail_client_secret, and custscript_gmail_refresh_token.');
            }

            log.audit('Email Processor', 'Starting email processing for: ' + GMAIL_CONFIG.INBOX_EMAIL);
            
            // 1. Get fresh Access Token using Refresh Token
            if (!refreshAccessToken()) {
                throw new Error('Failed to refresh access token. Check credentials.');
            }
            
            // 2. Fetch unprocessed emails from Gmail
            var emails = fetchEmailsFromGmail();
            log.audit('Email Processor', 'Found ' + emails.length + ' emails to process');
            
            var processed = 0;
            var errors = [];
            
            // 3. Process each email
            for (var i = 0; i < emails.length; i++) {
                try {
                    var emailData = emails[i];
                    log.debug('Processing Email', 'Email ID: ' + emailData.id + ', Subject: ' + emailData.subject);
                    
                    // Parse email body to extract hashtag data
                    var parsedData = parseEmailContent(emailData.body);
                    
                    if (!parsedData) {
                        log.error('Parse Error', 'Could not parse email: ' + emailData.id);
                        continue;
                    }
                    
                    // Process the parsed data and create NetSuite records
                    var result = processParsedData(parsedData);
                    
                    if (result.success) {
                        processed++;
                        // Mark email as processed in Gmail (add label or archive)
                        markEmailAsProcessed(emailData.id);
                        log.audit('Success', 'Processed email: ' + emailData.id);
                    } else {
                        errors.push({
                            emailId: emailData.id,
                            error: result.error
                        });
                    }
                } catch (e) {
                    log.error('Processing Error', 'Email ID: ' + emails[i].id + ', Error: ' + e.toString());
                    errors.push({
                        emailId: emails[i].id,
                        error: e.toString()
                    });
                }
            }
            
            log.audit('Email Processor', 'Completed. Processed: ' + processed + ', Errors: ' + errors.length);
            
            // Send summary email if configured
            if (errors.length > 0) {
                sendErrorReport(errors);
            }
            
        } catch (e) {
            log.error('Execute Error', e.toString());
            throw e;
        }
    }

    /**
     * Exchange Refresh Token for new Access Token
     * @returns {boolean} success
     */
    function refreshAccessToken() {
        try {
            if (!GMAIL_CONFIG.REFRESH_TOKEN || !GMAIL_CONFIG.CLIENT_ID) {
                log.error('Auth Error', 'Missing OAuth credentials in script');
                return false;
            }

            log.debug('Auth', 'Refreshing access token...');
            
            var response = https.post({
                url: 'https://oauth2.googleapis.com/token',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded'
                },
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
                log.debug('Auth', 'Access token refreshed successfully');
                return true;
            } else {
                log.error('Auth Error', 'Failed to refresh token: ' + response.body);
                return false;
            }
        } catch (e) {
            log.error('Auth Exception', e.toString());
            return false;
        }
    }

    /**
     * Fetch emails from Gmail API
     * @returns {Array} Array of email objects
     */
    function fetchEmailsFromGmail() {
        try {
            var url = 'https://gmail.googleapis.com/gmail/v1/users/' + GMAIL_CONFIG.USER_ID + '/messages';
            var params = {
                q: GMAIL_CONFIG.QUERY,
                maxResults: 10
            };
            
            var headers = {
                'Authorization': 'Bearer ' + GMAIL_CONFIG.ACCESS_TOKEN
            };
            
            var response = https.get({
                url: url + '?' + buildQueryString(params),
                headers: headers
            });
            
            if (response.code !== 200) {
                log.error('Gmail API Error', 'HTTP ' + response.code + ': ' + response.body);
                return [];
            }
            
            var messagesData = JSON.parse(response.body);
            var emails = [];
            
            if (!messagesData.messages) {
                return [];
            }
            
            // Fetch full email content for each message ID
            for (var i = 0; i < messagesData.messages.length; i++) {
                var messageId = messagesData.messages[i].id;
                var emailData = fetchEmailDetails(messageId);
                if (emailData) {
                    emails.push(emailData);
                }
            }
            
            return emails;
            
        } catch (e) {
            log.error('Fetch Emails Error', e.toString());
            return [];
        }
    }

    /**
     * Fetch full email details
     * @param {string} messageId - Gmail message ID
     * @returns {Object} Email data object
     */
    function fetchEmailDetails(messageId) {
        try {
            var url = 'https://gmail.googleapis.com/gmail/v1/users/' + GMAIL_CONFIG.USER_ID + '/messages/' + messageId;
            
            var headers = {
                'Authorization': 'Bearer ' + GMAIL_CONFIG.ACCESS_TOKEN
            };
            
            var response = https.get({
                url: url,
                headers: headers
            });
            
            if (response.code !== 200) {
                log.error('Gmail Details Error', 'HTTP ' + response.code);
                return null;
            }
            
            var messageData = JSON.parse(response.body);
            
            // Extract subject and body
            var subject = '';
            var body = '';
            
            if (messageData.payload) {
                // Get subject from headers
                if (messageData.payload.headers) {
                    for (var i = 0; i < messageData.payload.headers.length; i++) {
                        if (messageData.payload.headers[i].name === 'Subject') {
                            subject = messageData.payload.headers[i].value;
                            break;
                        }
                    }
                }
                
                // Extract body text
                body = extractEmailBody(messageData.payload);
            }
            
            return {
                id: messageId,
                subject: subject,
                body: body
            };
            
        } catch (e) {
            log.error('Fetch Email Details Error', e.toString());
            return null;
        }
    }

    /**
     * Extract email body text from Gmail message payload
     * @param {Object} payload - Gmail message payload
     * @returns {string} Email body text
     */
    function extractEmailBody(payload) {
        var body = '';
        
        if (payload.body && payload.body.data) {
            // Simple text body
            body = base64Decode(payload.body.data);
        } else if (payload.parts) {
            // Multipart message
            for (var i = 0; i < payload.parts.length; i++) {
                var part = payload.parts[i];
                if (part.mimeType === 'text/plain' && part.body && part.body.data) {
                    body = base64Decode(part.body.data);
                    break;
                } else if (part.parts) {
                    // Nested parts
                    var nestedBody = extractEmailBody(part);
                    if (nestedBody) {
                        body = nestedBody;
                        break;
                    }
                }
            }
        }
        
        return body;
    }

    /**
     * Base64 decode helper for NetSuite
     * NetSuite doesn't have atob(), so we use the encode module
     */
    function base64Decode(str) {
        try {
            // Replace URL-safe characters with standard base64
            var base64Str = str.replace(/-/g, '+').replace(/_/g, '/');
            
            // Use NetSuite's built-in encode module
            var decoded = encode.convert({
                string: base64Str,
                inputEncoding: encode.Encoding.BASE_64,
                outputEncoding: encode.Encoding.UTF_8
            });
            
            return decoded;
        } catch (e) {
            log.error('Base64 Decode Error', e.toString());
            return str; // Return as-is if decode fails
        }
    }

    /**
     * Parse email content to extract hashtag data
     * @param {string} emailBody - Email body text
     * @returns {Object} Parsed data object
     */
    function parseEmailContent(emailBody) {
        var data = {};
        
        // Log the first 500 chars for debugging
        log.debug('Email Body Preview', emailBody.substring(0, 500));
        
        // Clean up email body - remove HTML tags if present
        var cleanBody = emailBody.replace(/<[^>]*>/g, '');
        
        // Split by lines, handling both \n and \r\n
        var lines = cleanBody.split(/\r?\n/);
        
        var hashtagCount = 0;
        
        for (var i = 0; i < lines.length; i++) {
            var line = lines[i].trim();
            
            // Skip empty lines and instructions
            if (!line || line.startsWith('This email') || line.startsWith('---') || line.startsWith('The SuiteScript')) {
                continue;
            }
            
            // Parse hashtag lines - more flexible regex
            if (line.indexOf('#') !== -1) {
                // Try to match #key: value pattern (more flexible)
                var match = line.match(/#(\w+)\s*:\s*(.+)/);
                if (match) {
                    hashtagCount++;
                    var key = match[1];
                    var value = match[2].trim();
                    
                    log.debug('Found hashtag', key + ' = ' + value);
                    
                    // Handle special cases
                    switch (key) {
                        case 'tasks':
                            data.tasks = parseTasks(lines, i + 1);
                            break;
                        case 'checklists':
                            data.checklists = parseChecklists(lines, i + 1);
                            break;
                        case 'estimateItems':
                            data.estimateItems = parseEstimateItems(lines, i + 1);
                            break;
                        case 'resources':
                            data.resources = parseResources(lines, i + 1);
                            break;
                        default:
                            data[key] = value;
                    }
                }
            }
            
            // Parse JSON section if present
            if (line === '--- JSON DATA ---' && i < lines.length - 1) {
                try {
                    var jsonText = lines.slice(i + 1).join('\n');
                    var jsonData = JSON.parse(jsonText);
                    
                    // Log what we're getting from JSON
                    log.debug('JSON Keys', 'Keys: ' + Object.keys(jsonData).join(', '));
                    log.debug('JSON has estimate', 'Has estimate: ' + !!jsonData.estimate);
                    if (jsonData.estimate && jsonData.estimate.items) {
                        log.debug('JSON estimate items', 'Item count: ' + jsonData.estimate.items.length);
                    }
                    
                    data = Object.assign(data, jsonData);
                    log.debug('JSON parsed successfully', 'Found ' + Object.keys(jsonData).length + ' keys');
                } catch (e) {
                    log.error('JSON Parse Error', e.toString());
                }
                break;
            }
        }
        
        log.audit('Parse Summary', 'Found ' + hashtagCount + ' hashtags, ' + Object.keys(data).length + ' data fields');
        
        if (Object.keys(data).length === 0) {
            log.error('Parse Failed', 'No data extracted from email. Check email format.');
            return null;
        }
        
        return data;
    }

    /**
     * Parse tasks section
     */
    function parseTasks(lines, startIndex) {
        var tasks = [];
        var currentTask = null;
        
        for (var i = startIndex; i < lines.length && !lines[i].startsWith('#'); i++) {
            var line = lines[i].trim();
            if (line.match(/^Task \d+:/)) {
                if (currentTask) tasks.push(currentTask);
                currentTask = { name: line.replace(/^Task \d+:\s*/, '') };
            } else if (line.startsWith('Estimated Hours:')) {
                if (currentTask) currentTask.estimatedHours = line.replace('Estimated Hours:', '').trim();
            } else if (line.startsWith('Assignee:')) {
                if (currentTask) currentTask.assignee = line.replace('Assignee:', '').trim();
            } else if (line.startsWith('Due Date:')) {
                if (currentTask) currentTask.dueDate = line.replace('Due Date:', '').trim();
            }
        }
        
        if (currentTask) tasks.push(currentTask);
        return tasks;
    }

    /**
     * Parse checklists section
     */
    function parseChecklists(lines, startIndex) {
        var checklists = [];
        var currentChecklist = null;
        
        for (var i = startIndex; i < lines.length && !lines[i].startsWith('#'); i++) {
            var line = lines[i].trim();
            if (line.match(/^Checklist \d+:/)) {
                if (currentChecklist) checklists.push(currentChecklist);
                currentChecklist = {
                    name: line.replace(/^Checklist \d+:\s*/, ''),
                    items: []
                };
            } else if (line.match(/^[✓○]/)) {
                if (currentChecklist) {
                    currentChecklist.items.push({
                        name: line.replace(/^[✓○]\s*/, ''),
                        completed: line.startsWith('✓')
                    });
                }
            }
        }
        
        if (currentChecklist) checklists.push(currentChecklist);
        return checklists;
    }

    /**
     * Parse estimate items section
     */
    function parseEstimateItems(lines, startIndex) {
        var items = [];
        
        for (var i = startIndex; i < lines.length && !lines[i].startsWith('#'); i++) {
            var line = lines[i].trim();
            if (line.match(/^-/)) {
                var match = line.match(/^- (.+): Qty=(\d+), Rate=([\d.]+)/);
                if (match) {
                    items.push({
                        name: match[1].trim(),
                        quantity: parseInt(match[2]),
                        rate: parseFloat(match[3])
                    });
                }
            }
        }
        
        return items;
    }

    /**
     * Parse resources section
     */
    function parseResources(lines, startIndex) {
        var resources = [];
        
        for (var i = startIndex; i < lines.length && !lines[i].startsWith('#'); i++) {
            var line = lines[i].trim();
            if (line.match(/^-/)) {
                var match = line.match(/^- (.+): ([\d.]+)hrs @ \$([\d.]+)\/hr/);
                if (match) {
                    resources.push({
                        name: match[1].trim(),
                        hours: parseFloat(match[2]),
                        rate: parseFloat(match[3])
                    });
                }
            }
        }
        
        return resources;
    }

    /**
     * Process parsed data and create NetSuite records
     * @param {Object} data - Parsed email data
     * @returns {Object} Result object with success status
     */
    function processParsedData(data) {
        try {
            var customerId = null;
            var projectId = null;
            var estimateId = null;
            
            // Step 1: Create or find Customer
            if (data.customerName || data.customerEntityId) {
                customerId = createOrFindCustomer(data);
                if (!customerId) {
                    return { success: false, error: 'Failed to create/find customer' };
                }
            }
            
            // Step 2: Create Project
            if (data.projectName && customerId) {
                projectId = createProject(data, customerId);
                if (!projectId) {
                    log.error('Project Creation', 'Failed to create project');
                }
            }
            
            // Step 3: Create Tasks
            if (data.tasks && projectId) {
                createTasks(data.tasks, projectId);
            }
            
            // Step 4: Create Estimate
            log.debug('Estimate Check', 'estimateType=' + data.estimateType + ', has estimate obj=' + !!data.estimate + ', customerId=' + customerId);
            
            // If estimate object exists in JSON data, use it
            if (data.estimate && customerId) {
                log.audit('Creating Estimate from JSON', 'Customer: ' + customerId + ', Type: ' + data.estimate.type);
                log.debug('Estimate Object', 'Has items: ' + !!data.estimate.items + ', Item count: ' + (data.estimate.items ? data.estimate.items.length : 0));
                
                // Merge estimate data with estimateItems if they exist separately
                var estimateData = data.estimate;
                if (!estimateData.items && data.estimateItems) {
                    log.debug('Using estimateItems', 'Count: ' + data.estimateItems.length);
                    estimateData.items = data.estimateItems;
                }
                
                // Log the first item if available
                if (estimateData.items && estimateData.items.length > 0) {
                    log.debug('First Item', JSON.stringify(estimateData.items[0]));
                }
                
                estimateId = createEstimate(estimateData, customerId, projectId);
                if (!estimateId) {
                    log.error('Estimate Creation', 'Failed to create estimate from JSON');
                } else {
                    log.audit('Estimate Created', 'Estimate ID: ' + estimateId);
                }
            } else if (data.estimateType && customerId) {
                log.audit('Creating Estimate from hashtags', 'Customer: ' + customerId + ', Type: ' + data.estimateType);
                log.debug('Hashtag estimateItems', 'Has estimateItems: ' + !!data.estimateItems + ', Count: ' + (data.estimateItems ? data.estimateItems.length : 0));
                estimateId = createEstimate(data, customerId, projectId);
                if (!estimateId) {
                    log.error('Estimate Creation', 'Failed to create estimate');
                } else {
                    log.audit('Estimate Created', 'Estimate ID: ' + estimateId);
                }
            } else {
                log.debug('Estimate Skipped', 'Missing estimate data or customerId');
            }
            
            // Step 5: Create Checklists (as custom records or saved searches)
            if (data.checklists && projectId) {
                createChecklists(data.checklists, projectId);
            }
            
            return {
                success: true,
                customerId: customerId,
                projectId: projectId,
                estimateId: estimateId
            };
            
        } catch (e) {
            log.error('Process Data Error', e.toString());
            return { success: false, error: e.toString() };
        }
    }

    /**
     * Create or find customer record
     * Only pulls/sets required and specified optional fields
     */
    function createOrFindCustomer(data) {
        try {
            // Extract customer data from either top-level or nested customer object
            var customerData = data.customer || data;

            var searchEntityId = (customerData.entityid || customerData.customerEntityId || customerData.name || customerData.customerName || '').trim();
            var searchCompanyName = (customerData.name || customerData.customerName || customerData.entityid || customerData.customerEntityId || '').trim();

            // First, try to find existing customer by Entity ID
            if (searchEntityId) {
                var customerSearch = search.create({
                    type: search.Type.CUSTOMER,
                    filters: [
                        ['entityid', 'is', searchEntityId]
                    ],
                    columns: ['internalid']  // Only pull the ID
                });

                var customerResult = customerSearch.run().getRange(0, 1);
                if (customerResult.length > 0) {
                    log.audit('Customer Found', 'Using existing customer by Entity ID: ' + customerResult[0].id);
                    return customerResult[0].id;
                }
            }

            // If not found, try searching by Company Name
            if (searchCompanyName && searchCompanyName !== searchEntityId) {
                var nameSearch = search.create({
                    type: search.Type.CUSTOMER,
                    filters: [
                        ['companyname', 'is', searchCompanyName]
                    ],
                    columns: ['internalid']  // Only pull the ID
                });

                var nameResult = nameSearch.run().getRange(0, 1);
                if (nameResult.length > 0) {
                    log.audit('Customer Found', 'Using existing customer by Company Name: ' + nameResult[0].id);
                    return nameResult[0].id;
                }
            }

            log.debug('Customer Search', 'No existing customer found for Entity ID: ' + searchEntityId + ', Company: ' + searchCompanyName);

            // Create new customer with only required fields
            var customerRecord = record.create({
                type: record.Type.CUSTOMER,
                isDynamic: true
            });

            // REQUIRED: Entity ID
            customerRecord.setValue({
                fieldId: 'entityid',
                value: customerData.entityid || customerData.customerEntityId || customerData.name || customerData.customerName
            });

            // REQUIRED: Company Name
            customerRecord.setValue({
                fieldId: 'companyname',
                value: customerData.name || customerData.customerName || customerData.entityid || customerData.customerEntityId
            });

            // REQUIRED: Subsidiary (defaults to 1 if not provided)
            if (customerData.subsidiary || customerData.customerSubsidiary) {
                customerRecord.setValue({
                    fieldId: 'subsidiary',
                    value: customerData.subsidiary || customerData.customerSubsidiary
                });
            } else {
                try {
                    customerRecord.setValue({
                        fieldId: 'subsidiary',
                        value: 1  // Default to subsidiary ID 1
                    });
                } catch (e) {
                    log.error('Subsidiary Error', 'Could not set default subsidiary: ' + e.toString());
                }
            }

            // OPTIONAL: Email
            if (customerData.email || customerData.customerEmail) {
                customerRecord.setValue({
                    fieldId: 'email',
                    value: customerData.email || customerData.customerEmail
                });
            }

            // OPTIONAL: Phone
            if (customerData.phone || customerData.customerPhone) {
                customerRecord.setValue({
                    fieldId: 'phone',
                    value: customerData.phone || customerData.customerPhone
                });
            }

            // Note: Custom fields (industry, revenue, size) removed
            // If you need these fields, create custom entity fields in NetSuite first
            // Then add them here with the correct field IDs (e.g., custentity_xxxxx)

            var customerId = customerRecord.save();
            log.audit('Customer Created', 'Created customer: ' + customerId);

            return customerId;

        } catch (e) {
            log.error('Create Customer Error', e.toString());
            return null;
        }
    }

    /**
     * Create project (job) record
     * Only sets required and specified optional fields
     */
    function createProject(data, customerId) {
        try {
            // Extract project data from nested object if present
            var projectData = data.project || data;

            var projectRecord = record.create({
                type: record.Type.JOB
            });

            // REQUIRED: Entity ID (Project Code/ID)
            // Check multiple possible field names for flexibility
            var projectCode = projectData.entityid || projectData.projectEntityid ||
                             projectData.code || projectData.projectCode ||
                             projectData.name || projectData.projectName ||
                             'PROJ-' + Date.now();

            projectRecord.setValue({
                fieldId: 'entityid',
                value: projectCode
            });
            log.debug('Project', 'Set entityid: ' + projectCode);

            // REQUIRED: Company Name (Project Name)
            // Check multiple possible field names for flexibility
            var projectName = projectData.name || projectData.projectName ||
                             projectData.companyname || projectData.projectCompanyName ||
                             projectData.code || projectData.projectCode;

            projectRecord.setValue({
                fieldId: 'companyname',
                value: projectName
            });
            log.debug('Project', 'Set companyname: ' + projectName);

            // REQUIRED: Customer (Parent Customer)
            projectRecord.setValue({
                fieldId: 'customer',
                value: customerId
            });

            // OPTIONAL: Start Date
            if (projectData.startDate || projectData.projectStartDate) {
                try {
                    projectRecord.setValue({
                        fieldId: 'startdate',
                        value: new Date(projectData.startDate || projectData.projectStartDate)
                    });
                } catch (e) {
                    log.debug('Project Start Date', 'Could not set start date: ' + e.toString());
                }
            }

            // OPTIONAL: End Date
            if (projectData.endDate || projectData.projectEndDate) {
                try {
                    projectRecord.setValue({
                        fieldId: 'enddate',
                        value: new Date(projectData.endDate || projectData.projectEndDate)
                    });
                } catch (e) {
                    log.debug('Project End Date', 'Could not set end date: ' + e.toString());
                }
            }

            // OPTIONAL: Budget (Projected Total Value)
            if (projectData.budget || projectData.projectBudget) {
                try {
                    var budgetValue = projectData.budget || projectData.projectBudget;
                    if (typeof budgetValue === 'string') {
                        budgetValue = parseFloat(budgetValue.replace(/[^0-9.]/g, ''));
                    }
                    projectRecord.setValue({
                        fieldId: 'projectedtotalvalue',
                        value: budgetValue
                    });
                } catch (e) {
                    log.debug('Project Budget', 'Could not set budget: ' + e.toString());
                }
            }

            // OPTIONAL: Project Status
            if (projectData.status || projectData.projectStatus) {
                try {
                    projectRecord.setValue({
                        fieldId: 'status',
                        value: projectData.status || projectData.projectStatus
                    });
                } catch (e) {
                    log.debug('Project Status', 'Could not set status: ' + e.toString());
                }
            }

            // OPTIONAL: Description/Comments
            if (projectData.description || projectData.projectDescription) {
                try {
                    projectRecord.setValue({
                        fieldId: 'comments',
                        value: projectData.description || projectData.projectDescription
                    });
                } catch (e) {
                    log.debug('Project Description', 'Could not set description: ' + e.toString());
                }
            }

            var projectId = projectRecord.save();
            log.audit('Project Created', 'Created project: ' + projectId);

            return projectId;

        } catch (e) {
            log.error('Create Project Error', e.toString());
            return null;
        }
    }

    /**
     * Create tasks (project task records)
     */
    function createTasks(tasks, projectId) {
        for (var i = 0; i < tasks.length; i++) {
            try {
                var taskRecord = record.create({
                    type: record.Type.PROJECT_TASK
                });
                
                taskRecord.setValue({
                    fieldId: 'job',
                    value: projectId
                });
                
                taskRecord.setValue({
                    fieldId: 'title',
                    value: tasks[i].name
                });
                
                if (tasks[i].estimatedHours) {
                    taskRecord.setValue({
                        fieldId: 'estimatedwork',
                        value: parseFloat(tasks[i].estimatedHours)
                    });
                }
                
                if (tasks[i].dueDate) {
                    taskRecord.setValue({
                        fieldId: 'enddate',
                        value: new Date(tasks[i].dueDate)
                    });
                }
                
                taskRecord.save();
                
            } catch (e) {
                log.error('Create Task Error', 'Task: ' + tasks[i].name + ', Error: ' + e.toString());
            }
        }
    }

    /**
     * Create estimate record
     * Only sets required and specified optional fields
     */
    function createEstimate(data, customerId, projectId) {
        try {
            log.debug('Create Estimate', 'Starting estimate creation for customer: ' + customerId);
            log.debug('Create Estimate Data', JSON.stringify(data));

            // Extract estimate data from nested object if present
            var estimateData = data.estimate || data;

            var estimateRecord = record.create({
                type: record.Type.ESTIMATE,
                isDynamic: true
            });

            // REQUIRED: Customer/Entity
            estimateRecord.setValue({
                fieldId: 'entity',
                value: customerId
            });
            log.debug('Estimate', 'Set customer: ' + customerId);

            // REQUIRED: Transaction Date (defaults to today)
            estimateRecord.setValue({
                fieldId: 'trandate',
                value: new Date()
            });
            log.debug('Estimate', 'Set transaction date to today');

            // OPTIONAL: Project/Job
            if (projectId) {
                estimateRecord.setValue({
                    fieldId: 'job',
                    value: projectId
                });
                log.debug('Estimate', 'Set project: ' + projectId);
            }

            // OPTIONAL: Due Date
            if (estimateData.dueDate || data.estimateDueDate) {
                try {
                    var dueDate = estimateData.dueDate || data.estimateDueDate;
                    estimateRecord.setValue({
                        fieldId: 'duedate',
                        value: new Date(dueDate)
                    });
                    log.debug('Estimate', 'Set due date: ' + dueDate);
                } catch (e) {
                    log.error('Estimate Due Date', 'Could not set due date: ' + e.toString());
                }
            }

            // OPTIONAL: Estimate Status
            // NetSuite estimate statuses: 'A' = Open, 'B' = Pending, 'C' = Closed, 'D' = Expired
            if (estimateData.status || data.estimateStatus) {
                try {
                    var statusValue = estimateData.status || data.estimateStatus;
                    // Map common status names to NetSuite values
                    if (statusValue === 'PENDING' || statusValue === 'Pending') {
                        statusValue = 'B';
                    } else if (statusValue === 'OPEN' || statusValue === 'Open') {
                        statusValue = 'A';
                    } else if (statusValue === 'CLOSED' || statusValue === 'Closed') {
                        statusValue = 'C';
                    } else if (statusValue === 'EXPIRED' || statusValue === 'Expired') {
                        statusValue = 'D';
                    }

                    estimateRecord.setValue({
                        fieldId: 'status',
                        value: statusValue
                    });
                    log.debug('Estimate', 'Set status: ' + statusValue);
                } catch (e) {
                    log.error('Estimate Status', 'Could not set status: ' + e.toString());
                }
            }

            // OPTIONAL: Memo/Message
            if (estimateData.memo || estimateData.message || data.memo || data.message) {
                try {
                    estimateRecord.setValue({
                        fieldId: 'memo',
                        value: estimateData.memo || estimateData.message || data.memo || data.message
                    });
                    log.debug('Estimate', 'Set memo');
                } catch (e) {
                    log.error('Estimate Memo', 'Could not set memo: ' + e.toString());
                }
            }

            // OPTIONAL: Class
            if (estimateData.class || estimateData.classId || data.estimateClass) {
                try {
                    var classValue = estimateData.class || estimateData.classId || data.estimateClass;
                    // If it's a name, try to find the ID
                    var classId = getClassIdByName(classValue);
                    if (classId) {
                        estimateRecord.setValue({
                            fieldId: 'class',
                            value: classId
                        });
                        log.debug('Estimate', 'Set class: ' + classValue + ' (ID: ' + classId + ')');
                    }
                } catch (e) {
                    log.error('Estimate Class', 'Could not set class: ' + e.toString());
                }
            }

            // OPTIONAL: Department
            if (estimateData.department || estimateData.departmentId || data.estimateDepartment) {
                try {
                    var deptValue = estimateData.department || estimateData.departmentId || data.estimateDepartment;
                    // If it's a name, try to find the ID
                    var deptId = getDepartmentIdByName(deptValue);
                    if (deptId) {
                        estimateRecord.setValue({
                            fieldId: 'department',
                            value: deptId
                        });
                        log.debug('Estimate', 'Set department: ' + deptValue + ' (ID: ' + deptId + ')');
                    }
                } catch (e) {
                    log.error('Estimate Department', 'Could not set department: ' + e.toString());
                }
            }

            // OPTIONAL: Location
            if (estimateData.location || estimateData.locationId || data.estimateLocation) {
                try {
                    var locValue = estimateData.location || estimateData.locationId || data.estimateLocation;
                    // If it's a name, try to find the ID
                    var locId = getLocationIdByName(locValue);
                    if (locId) {
                        estimateRecord.setValue({
                            fieldId: 'location',
                            value: locId
                        });
                        log.debug('Estimate', 'Set location: ' + locValue + ' (ID: ' + locId + ')');
                    }
                } catch (e) {
                    log.error('Estimate Location', 'Could not set location: ' + e.toString());
                }
            }

            // OPTIONAL: Line Items (check both items and estimateItems)
            var itemsArray = estimateData.items || data.items || data.estimateItems;
            if (itemsArray && itemsArray.length > 0) {
                log.debug('Estimate Items', 'Adding ' + itemsArray.length + ' line items');
                
                for (var i = 0; i < itemsArray.length; i++) {
                    var item = itemsArray[i];
                    var displayName = item.displayName || item.name;  // Use displayName if provided, otherwise use name
                    var hasCustomName = item.displayName && item.displayName !== item.name;  // Check if user renamed the item
                    
                    log.debug('Estimate Item ' + i, 'NetSuite Item: ' + item.name + ', Display Name: ' + displayName + ', Custom Name: ' + hasCustomName + ', Description: ' + item.description + ', Qty: ' + item.quantity + ', Rate: ' + item.rate);
                    
                    try {
                        estimateRecord.selectNewLine({
                            sublistId: 'item'
                        });
                        
                        var itemId = null;
                        
                        // If user provided a custom display name, check if an item with that name already exists
                        if (hasCustomName) {
                            log.debug('Custom Name Detected', 'Checking if item "' + displayName + '" already exists');
                            itemId = getItemIdByName(displayName);
                            
                            // If the custom-named item doesn't exist, copy the source item and rename it
                            if (!itemId) {
                                log.audit('Copy & Rename', 'Item "' + displayName + '" not found. Will copy source item "' + item.name + '"');
                                
                                // First, get the source item ID
                                var sourceItemId = getItemIdByName(item.name);
                                
                                if (sourceItemId) {
                                    // Copy the source item with the new display name
                                    itemId = copyAndRenameItem(sourceItemId, displayName, item.description);
                                } else {
                                    // Source item not found, create a basic service item
                                    log.debug('Source Item Not Found', 'Creating basic service item: ' + displayName);
                                    itemId = createServiceItem(displayName, item.description);
                                }
                            } else {
                                log.debug('Custom Item Found', 'Using existing item "' + displayName + '" with ID: ' + itemId);
                            }
                        } else {
                            // No custom name, use standard lookup
                            itemId = getItemIdByName(item.name);
                            
                            // If not found, create it
                            if (!itemId) {
                                log.debug('Item Not Found', 'Creating service item: ' + displayName);
                                itemId = createServiceItem(displayName, item.description);
                            }
                        }
                        
                        // If still not found, use a generic service item
                        if (!itemId) {
                            log.debug('Item Creation Failed', 'Falling back to generic service item');
                            itemId = findGenericServiceItem();
                        }
                        
                        if (itemId) {
                            // Set the NetSuite item
                            estimateRecord.setCurrentSublistValue({
                                sublistId: 'item',
                                fieldId: 'item',
                                value: itemId
                            });
                            
                            // Set quantity
                            estimateRecord.setCurrentSublistValue({
                                sublistId: 'item',
                                fieldId: 'quantity',
                                value: item.quantity || 1
                            });
                            
                            // Set rate/price
                            estimateRecord.setCurrentSublistValue({
                                sublistId: 'item',
                                fieldId: 'rate',
                                value: item.rate || 0
                            });
                            
                            // Set description from dashboard (this is the detailed description)
                            // If no description provided, use the item name as fallback
                            var descriptionText = item.description || item.name || '';
                            if (descriptionText) {
                                estimateRecord.setCurrentSublistValue({
                                    sublistId: 'item',
                                    fieldId: 'description',
                                    value: descriptionText
                                });
                            }
                            
                            // Set amount (calculated field, but we can set it explicitly)
                            var amount = (item.quantity || 1) * (item.rate || 0);
                            estimateRecord.setCurrentSublistValue({
                                sublistId: 'item',
                                fieldId: 'amount',
                                value: amount
                            });
                            
                            estimateRecord.commitLine({
                                sublistId: 'item'
                            });
                            
                            log.debug('Estimate Item Added', 'Item ' + i + ' added successfully - Amount: ' + amount);
                        } else {
                            log.error('Estimate Item Error', 'Could not find item ID for: ' + item.name);
                        }
                    } catch (e) {
                        log.error('Estimate Item Error', 'Failed to add item ' + i + ': ' + e.toString());
                    }
                }
            } else {
                log.debug('Estimate Items', 'No items provided, creating estimate without line items');
            }
            
            var estimateId = estimateRecord.save();
            log.audit('Estimate Created', 'Successfully created estimate: ' + estimateId);
            
            return estimateId;
            
        } catch (e) {
            log.error('Create Estimate Error', 'Error: ' + e.toString() + ', Stack: ' + (e.stack || 'No stack trace'));
            return null;
        }
    }
    
    /**
     * Find a generic service item to use as a placeholder
     */
    function findGenericServiceItem() {
        try {
            var itemSearch = search.create({
                type: search.Type.SERVICE_ITEM,
                filters: [
                    ['isinactive', 'is', 'F']
                ],
                columns: ['internalid']
            });
            
            var results = itemSearch.run().getRange({ start: 0, end: 1 });
            if (results && results.length > 0) {
                return results[0].getValue('internalid');
            }
        } catch (e) {
            log.error('Find Service Item', e.toString());
        }
        return null;
    }

    /**
     * Create checklists (as custom records or saved searches)
     * This is a placeholder - implement based on your checklist structure
     */
    function createChecklists(checklists, projectId) {
        // Implement checklist creation logic
        // This might be custom records, saved searches, or project task dependencies
        log.audit('Checklists', 'Creating ' + checklists.length + ' checklists for project: ' + projectId);
    }

    /**
     * Item name mapping - Maps dashboard item names to NetSuite item names/IDs
     * Add your NetSuite item mappings here based on your actual NetSuite items
     */
    var ITEM_NAME_MAPPINGS = {
        // Dashboard item name : NetSuite item name or ID (from ItemSearchResults891.xls)
        
        // Professional Services items
        'PS - Post Go-Live Support': 'PS - Post Go-Live Support',  // Exact match - exists in NS
        'PS - Go-Live Support': 'PS - Go-Live Support',
        'PS - Training Services': 'PS - Training Services',
        'PS - Data Migration': 'PS - Data Migration',
        'PS - Discovery & Design Strategy': 'PS - Discovery & Design Strategy',
        'Professional Services': 'PS - Post Go-Live Support',
        'Implementation Services': 'PS - Post Go-Live Support',
        'Consulting Services': 'SVC_PR_Consulting',
        
        // Travel & Expenses
        'Travel & Expenses': 'EXP_Travel Expenses',
        'Travel': 'SVC_PR_Travel',
        
        // Software/Licensing
        'Software Licensing': 'NIN_AA1: SaaS License A',
        'License': 'NIN_AA1: Perpetual License',
        'Subscription': 'NIN_AA1: SaaS License A',
        
        // Training
        'Training': 'PS - Training Services',
        'Training Services': 'PS - Training Services',
        
        // Support Services
        'Support Services': 'PS - Post Go-Live Support',
        'Hourly Support': 'SVC_PR_Hourly Support',
        
        // Project Management
        'Project Management': 'SVC_PR_Project Management',
        
        // Development
        'Development': 'SVC_PR_Development',
        'Custom Development': 'SVC_PR_Development',
        
        // Testing
        'Testing': 'SVC_PR_Testing',
        'QA Services': 'SVC_PR_Testing',
        
        // Data Migration
        'Data Migration': 'PS - Data Migration',
        
        // Business Analysis
        'Business Analysis': 'SVC_PR_Business Analysis',
        
        // Integration
        'Integration': 'SVC_PR_Integration',
        'API Integration': 'SVC_PR_Integration'
    };

    /**
     * Get NetSuite item ID by name with fallback logic
     * @param {string} itemName - Item name from dashboard
     * @returns {number} Item internal ID or null
     */
    function getItemIdByName(itemName) {
        try {
            log.debug('Get Item ID', 'Searching for item: ' + itemName);
            
            // Step 1: Check if there's a mapping for this item name
            var mappedName = ITEM_NAME_MAPPINGS[itemName] || itemName;
            if (mappedName !== itemName) {
                log.debug('Item Mapping', 'Mapped "' + itemName + '" to "' + mappedName + '"');
            }
            
            // Step 2: Search by exact name or itemid
            var itemSearch = search.create({
                type: search.Type.ITEM,
                filters: [
                    ['isinactive', 'is', 'F'],
                    'AND',
                    [
                        ['name', 'is', mappedName],
                        'OR',
                        ['itemid', 'is', mappedName],
                        'OR',
                        ['name', 'is', itemName],
                        'OR',
                        ['itemid', 'is', itemName]
                    ]
                ],
                columns: ['internalid', 'name', 'itemid', 'type']
            });
            
            var results = itemSearch.run().getRange({ start: 0, end: 1 });
            if (results && results.length > 0) {
                var itemId = results[0].getValue('internalid');
                var foundName = results[0].getValue('name');
                log.debug('Item Found', 'Item ID: ' + itemId + ' (' + foundName + ') for search: ' + itemName);
                return itemId;
            }
            
            // Step 3: Try partial match (contains)
            log.debug('Item Search', 'Exact match not found, trying partial match');
            var partialSearch = search.create({
                type: search.Type.ITEM,
                filters: [
                    ['isinactive', 'is', 'F'],
                    'AND',
                    [
                        ['name', 'contains', 'Professional'],
                        'OR',
                        ['name', 'contains', 'Service'],
                        'OR',
                        ['name', 'contains', 'Consulting']
                    ]
                ],
                columns: ['internalid', 'name', 'itemid', 'type']
            });
            
            var partialResults = partialSearch.run().getRange({ start: 0, end: 1 });
            if (partialResults && partialResults.length > 0) {
                var itemId = partialResults[0].getValue('internalid');
                var foundName = partialResults[0].getValue('name');
                log.debug('Item Found (Partial)', 'Using item ID: ' + itemId + ' (' + foundName + ') for: ' + itemName);
                return itemId;
            }
            
            log.debug('Item Not Found', 'No item found for: ' + itemName);
            return null;
        } catch (e) {
            log.error('Get Item Error', e.toString());
            return null;
        }
    }
    
    /**
     * Create a service item if it doesn't exist
     * @param {string} itemName - Name for the new item
     * @param {string} description - Description for the item
     * @returns {number} Item internal ID or null
     */
    /**
     * Copy an existing NetSuite item and rename it
     * @param {number} sourceItemId - Internal ID of the item to copy
     * @param {string} newDisplayName - New display name for the copied item
     * @param {string} description - Description for the new item
     * @returns {number} New item internal ID or null
     */
    function copyAndRenameItem(sourceItemId, newDisplayName, description) {
        try {
            log.audit('Copy Item', 'Copying item ' + sourceItemId + ' with new name: ' + newDisplayName);
            
            // Load the source item to get its properties
            var sourceItem = record.load({
                type: record.Type.SERVICE_ITEM,
                id: sourceItemId,
                isDynamic: false
            });
            
            // Create a new service item
            var newItem = record.create({
                type: record.Type.SERVICE_ITEM,
                isDynamic: true
            });
            
            // Generate a safe item ID
            var itemId = newDisplayName.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 40);
            
            // Set basic fields
            newItem.setValue({
                fieldId: 'itemid',
                value: itemId
            });
            
            newItem.setValue({
                fieldId: 'displayname',
                value: newDisplayName
            });
            
            newItem.setValue({
                fieldId: 'description',
                value: description || newDisplayName
            });
            
            newItem.setValue({
                fieldId: 'salesdescription',
                value: description || newDisplayName
            });
            
            // Copy rate from source item if available
            try {
                var sourceRate = sourceItem.getValue('rate');
                if (sourceRate) {
                    newItem.setValue({
                        fieldId: 'rate',
                        value: sourceRate
                    });
                    log.debug('Copy Item', 'Copied rate: ' + sourceRate);
                }
            } catch (e) {
                log.debug('Copy Item', 'Could not copy rate: ' + e.toString());
            }
            
            // Copy income account if available
            try {
                var incomeAccount = sourceItem.getValue('incomeaccount');
                if (incomeAccount) {
                    newItem.setValue({
                        fieldId: 'incomeaccount',
                        value: incomeAccount
                    });
                }
            } catch (e) {
                log.debug('Copy Item', 'Could not copy income account: ' + e.toString());
            }
            
            // Copy expense account if available
            try {
                var expenseAccount = sourceItem.getValue('expenseaccount');
                if (expenseAccount) {
                    newItem.setValue({
                        fieldId: 'expenseaccount',
                        value: expenseAccount
                    });
                }
            } catch (e) {
                log.debug('Copy Item', 'Could not copy expense account: ' + e.toString());
            }
            
            // Copy subsidiary if OneWorld
            try {
                var subsidiary = sourceItem.getValue('subsidiary');
                if (subsidiary) {
                    newItem.setValue({
                        fieldId: 'subsidiary',
                        value: subsidiary
                    });
                }
            } catch (e) {
                log.debug('Copy Item', 'Could not copy subsidiary: ' + e.toString());
            }
            
            var newItemId = newItem.save();
            log.audit('Item Copied', 'Created new item: ' + newItemId + ' (' + newDisplayName + ') based on source: ' + sourceItemId);
            
            return newItemId;
            
        } catch (e) {
            log.error('Copy Item Error', 'Failed to copy item ' + sourceItemId + ' with name "' + newDisplayName + '": ' + e.toString());
            // Fallback to creating a basic service item
            return createServiceItem(newDisplayName, description);
        }
    }

    function createServiceItem(itemName, description) {
        try {
            log.debug('Create Service Item', 'Attempting to create: ' + itemName);
            
            // Generate a safe item ID (alphanumeric, no spaces)
            var itemId = itemName.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 40);
            
            var serviceItem = record.create({
                type: record.Type.SERVICE_ITEM,
                isDynamic: true
            });
            
            // Set basic fields
            serviceItem.setValue({
                fieldId: 'itemid',
                value: itemId
            });
            
            serviceItem.setValue({
                fieldId: 'displayname',
                value: itemName
            });
            
            if (description) {
                serviceItem.setValue({
                    fieldId: 'description',
                    value: description
                });
            }
            
            // Set as purchasable/saleable
            serviceItem.setValue({
                fieldId: 'salesdescription',
                value: description || itemName
            });
            
            // Try to set a default rate (optional, may fail based on account settings)
            try {
                serviceItem.setValue({
                    fieldId: 'rate',
                    value: 0
                });
            } catch (e) {
                log.debug('Item Rate', 'Could not set default rate: ' + e.toString());
            }
            
            var newItemId = serviceItem.save();
            log.audit('Service Item Created', 'Created new service item: ' + newItemId + ' (' + itemName + ')');
            
            return newItemId;
            
        } catch (e) {
            log.error('Create Service Item Error', 'Failed to create item "' + itemName + '": ' + e.toString());
            return null;
        }
    }

    /**
     * Mark email as processed in Gmail
     */
    function markEmailAsProcessed(messageId) {
        try {
            // Add a label or archive the email
            // You'll need to implement this based on your Gmail labels setup
            // Example: Modify message to add 'PROCESSED' label
            // This requires an additional API call using https.post to /batchModify
            
            // Simplified: Just log it
            log.debug('Mark Processed', 'Marking email as processed: ' + messageId);
            
            // To implement fully:
            // var url = 'https://gmail.googleapis.com/gmail/v1/users/me/messages/' + messageId + '/modify';
            // https.post({ url: url, body: { removeLabelIds: ['UNREAD'] }, headers: ... });
            
        } catch (e) {
            log.error('Mark Processed Error', e.toString());
        }
    }

    /**
     * Send error report email
     */
    function sendErrorReport(errors) {
        try {
            var subject = 'Email Processor Errors';
            var body = 'The following emails failed to process:\n\n';
            
            for (var i = 0; i < errors.length; i++) {
                body += 'Email ID: ' + errors[i].emailId + '\n';
                body += 'Error: ' + errors[i].error + '\n\n';
            }
            
            // Just log errors instead of sending email (which requires employee author)
            log.error('Error Report', body);
            
            // Uncomment below to send email (set author to a valid employee ID in your account)
            /*
            email.send({
                author: -5, // Use -5 for current user, or replace with valid employee ID
                recipients: 'admin@yourcompany.com',
                subject: subject,
                body: body
            });
            */
        } catch (e) {
            log.error('Send Error Report', e.toString());
        }
    }

    /**
     * Build query string helper
     */
    function buildQueryString(params) {
        var parts = [];
        for (var key in params) {
            if (params.hasOwnProperty(key)) {
                parts.push(encodeURIComponent(key) + '=' + encodeURIComponent(params[key]));
            }
        }
        return parts.join('&');
    }

    /**
     * Get NetSuite Class ID by name or ID
     * @param {string|number} classNameOrId - Class name or internal ID
     * @returns {number} Class internal ID or null
     */
    function getClassIdByName(classNameOrId) {
        try {
            // If it's already a number, assume it's an ID
            if (typeof classNameOrId === 'number' || !isNaN(classNameOrId)) {
                return parseInt(classNameOrId);
            }

            log.debug('Get Class ID', 'Searching for class: ' + classNameOrId);

            var classSearch = search.create({
                type: search.Type.CLASSIFICATION,
                filters: [
                    ['isinactive', 'is', 'F'],
                    'AND',
                    [
                        ['name', 'is', classNameOrId],
                        'OR',
                        ['displayname', 'is', classNameOrId]
                    ]
                ],
                columns: ['internalid', 'name']
            });

            var results = classSearch.run().getRange({ start: 0, end: 1 });
            if (results && results.length > 0) {
                var classId = results[0].getValue('internalid');
                log.debug('Class Found', 'Class ID: ' + classId + ' for name: ' + classNameOrId);
                return classId;
            }

            log.debug('Class Not Found', 'No class found for: ' + classNameOrId);
            return null;
        } catch (e) {
            log.error('Get Class Error', e.toString());
            return null;
        }
    }

    /**
     * Get NetSuite Department ID by name or ID
     * @param {string|number} deptNameOrId - Department name or internal ID
     * @returns {number} Department internal ID or null
     */
    function getDepartmentIdByName(deptNameOrId) {
        try {
            // If it's already a number, assume it's an ID
            if (typeof deptNameOrId === 'number' || !isNaN(deptNameOrId)) {
                return parseInt(deptNameOrId);
            }

            log.debug('Get Department ID', 'Searching for department: ' + deptNameOrId);

            var deptSearch = search.create({
                type: search.Type.DEPARTMENT,
                filters: [
                    ['isinactive', 'is', 'F'],
                    'AND',
                    [
                        ['name', 'is', deptNameOrId],
                        'OR',
                        ['displayname', 'is', deptNameOrId]
                    ]
                ],
                columns: ['internalid', 'name']
            });

            var results = deptSearch.run().getRange({ start: 0, end: 1 });
            if (results && results.length > 0) {
                var deptId = results[0].getValue('internalid');
                log.debug('Department Found', 'Department ID: ' + deptId + ' for name: ' + deptNameOrId);
                return deptId;
            }

            log.debug('Department Not Found', 'No department found for: ' + deptNameOrId);
            return null;
        } catch (e) {
            log.error('Get Department Error', e.toString());
            return null;
        }
    }

    /**
     * Get NetSuite Location ID by name or ID
     * @param {string|number} locNameOrId - Location name or internal ID
     * @returns {number} Location internal ID or null
     */
    function getLocationIdByName(locNameOrId) {
        try {
            // If it's already a number, assume it's an ID
            if (typeof locNameOrId === 'number' || !isNaN(locNameOrId)) {
                return parseInt(locNameOrId);
            }

            log.debug('Get Location ID', 'Searching for location: ' + locNameOrId);

            var locSearch = search.create({
                type: search.Type.LOCATION,
                filters: [
                    ['isinactive', 'is', 'F'],
                    'AND',
                    [
                        ['name', 'is', locNameOrId],
                        'OR',
                        ['displayname', 'is', locNameOrId]
                    ]
                ],
                columns: ['internalid', 'name']
            });

            var results = locSearch.run().getRange({ start: 0, end: 1 });
            if (results && results.length > 0) {
                var locId = results[0].getValue('internalid');
                log.debug('Location Found', 'Location ID: ' + locId + ' for name: ' + locNameOrId);
                return locId;
            }

            log.debug('Location Not Found', 'No location found for: ' + locNameOrId);
            return null;
        } catch (e) {
            log.error('Get Location Error', e.toString());
            return null;
        }
    }

    return {
        execute: execute
    };
});
