/**
 * NetSuite RESTlet for Demo Dashboard Integration - FIXED VERSION
 *
 * This version addresses critical issues found in code review:
 * - Issue 1: Customer ID type conversion
 * - Issue 3: Task status mapping enabled
 * - Issue 6: Custom fields enabled with error handling
 * - Issue 7: Array validation added
 *
 * @NApiVersion 2.1
 * @NScriptType Restlet
 */

define(['N/search', 'N/record', 'N/log'], function(search, record, log) {

    /**
     * GET Handler - Search for customers
     */
    function get(context) {
        var searchTerm = context.q || "";
        var results = [];

        log.audit('Customer Search', 'Searching for: ' + searchTerm);

        try {
            var customerSearch = search.create({
                type: search.Type.CUSTOMER,
                filters: searchTerm ? [
                    ['entityid', 'contains', searchTerm],
                    'OR',
                    ['email', 'contains', searchTerm],
                    'OR',
                    ['companyname', 'contains', searchTerm]
                ] : [],
                columns: [
                    search.createColumn({ name: 'entityid', sort: search.Sort.ASC }),
                    search.createColumn({ name: 'internalid' }),
                    search.createColumn({ name: 'email' }),
                    search.createColumn({ name: 'companyname' }),
                    search.createColumn({ name: 'phone' })
                ]
            });

            customerSearch.run().each(function(result) {
                results.push({
                    id: result.getValue('internalid'),
                    name: result.getValue('entityid'),
                    companyName: result.getValue('companyname') || result.getValue('entityid'),
                    email: result.getValue('email') || '',
                    phone: result.getValue('phone') || ''
                });
                return results.length < 50;
            });

            log.audit('Customer Search Complete', 'Found ' + results.length + ' customers');
            return results;

        } catch (e) {
            log.error('Customer Search Error', e.message + '\n' + e.stack);
            return {
                success: false,
                error: e.message,
                details: e.stack
            };
        }
    }

    /**
     * POST Handler - Create/Update Project with Tasks
     *
     * FIXES APPLIED:
     * - Customer ID type conversion (Issue 1)
     * - Task status mapping (Issue 3)
     * - Custom fields with error handling (Issue 6)
     * - Array validation (Issue 7)
     */
    function post(context) {
        log.audit('Project Sync Started', JSON.stringify(context));

        try {
            // Validate required fields
            if (!context.customerId) {
                throw new Error('customerId is required');
            }
            if (!context.projectName) {
                throw new Error('projectName is required');
            }

            // FIX 1: Convert customerId to number to prevent INVALID_RCRD_REF error
            var customerIdNum = parseInt(context.customerId, 10);
            if (isNaN(customerIdNum)) {
                throw new Error('customerId must be a valid number');
            }

            // Create new project (Job record)
            var projectRecord = record.create({
                type: record.Type.JOB
            });

            // Set required fields
            projectRecord.setValue({
                fieldId: 'parent',
                value: customerIdNum  // ✓ FIXED: Use numeric customer ID
            });

            projectRecord.setValue({
                fieldId: 'companyname',
                value: context.projectName || 'Demo Project'
            });

            // FIX 6: Enable standard NetSuite fields with error handling
            // Set website URL
            if (context.website) {
                try {
                    projectRecord.setValue({
                        fieldId: 'url',
                        value: context.website
                    });
                    log.debug('Website field set', context.website);
                } catch (e) {
                    log.debug('URL field not available or invalid', e.message);
                }
            }

            // Set notes/comments
            if (context.notes) {
                try {
                    projectRecord.setValue({
                        fieldId: 'comments',
                        value: context.notes
                    });
                    log.debug('Comments field set', context.notes);
                } catch (e) {
                    log.debug('Comments field not available', e.message);
                }
            }

            // Set custom fields if they exist in your instance
            // IMPORTANT: Verify these field IDs exist in your NetSuite account first!
            // Go to: Setup > Customization > Lists, Records, & Fields > Entity Fields

            if (context.industry) {
                try {
                    projectRecord.setValue({
                        fieldId: 'custentity_industry',  // ⚠️ Verify this field exists!
                        value: context.industry
                    });
                    log.debug('Industry field set', context.industry);
                } catch (e) {
                    log.debug('Industry custom field not available', e.message);
                    // Not a critical error - continue
                }
            }

            // Set external reference if provided
            if (context.externalRef || context.projectId) {
                try {
                    projectRecord.setValue({
                        fieldId: 'externalid',
                        value: context.externalRef || context.projectId
                    });
                    log.debug('External ref set', context.externalRef || context.projectId);
                } catch (e) {
                    log.debug('External ID field not available', e.message);
                }
            }

            // Save the project
            var projectInternalId = projectRecord.save();
            log.audit('Project Created', 'Internal ID: ' + projectInternalId);

            // FIX 3 & 7: Create tasks with status mapping and validation
            var createdTasks = [];

            // Task status mapping - adjust these values to match your NetSuite configuration
            // Check: Setup > Customization > Lists, Records, & Fields > Task Status
            var statusMap = {
                'Pending': 'NOTSTART',
                'Scheduled': 'PROGRESS',
                'Ready': 'PROGRESS',
                'Complete': 'COMPLETE',
                'Not Started': 'NOTSTART',
                'In Progress': 'PROGRESS'
            };

            if (context.tasks && Array.isArray(context.tasks)) {
                context.tasks.forEach(function(taskData, index) {
                    try {
                        // FIX 7: Validate task data structure
                        if (!taskData || typeof taskData !== 'object') {
                            log.error('Invalid task data', 'Task ' + index + ' is not a valid object');
                            return;
                        }

                        if (!taskData.name || typeof taskData.name !== 'string' || taskData.name.trim() === '') {
                            log.error('Invalid task name', 'Task ' + index + ' has invalid or empty name');
                            return;
                        }

                        // Create task record
                        var taskRecord = record.create({
                            type: record.Type.TASK
                        });

                        // Set task title
                        taskRecord.setValue({
                            fieldId: 'title',
                            value: taskData.name.trim()
                        });

                        // Link to project
                        taskRecord.setValue({
                            fieldId: 'company',
                            value: projectInternalId
                        });

                        // FIX 3: Set task status with mapping
                        if (taskData.status) {
                            var netsuiteStatus = statusMap[taskData.status] || 'NOTSTART';
                            try {
                                taskRecord.setValue({
                                    fieldId: 'status',
                                    value: netsuiteStatus
                                });
                                log.debug('Task status set', taskData.status + ' -> ' + netsuiteStatus);
                            } catch (e) {
                                log.debug('Could not set task status', e.message);
                            }
                        }

                        // Set assignee if provided and field exists
                        if (taskData.owner) {
                            try {
                                // Note: This would need to map to actual NetSuite employee IDs
                                // For now, just log it
                                log.debug('Task owner (not set)', taskData.owner);
                            } catch (e) {
                                log.debug('Could not set task owner', e.message);
                            }
                        }

                        // Save task
                        var taskId = taskRecord.save();

                        createdTasks.push({
                            id: taskId,
                            name: taskData.name,
                            status: taskData.status,
                            netsuiteStatus: statusMap[taskData.status] || 'NOTSTART'
                        });

                        log.debug('Task Created', 'ID: ' + taskId + ', Name: ' + taskData.name);

                    } catch (taskError) {
                        log.error('Task Creation Error',
                            'Failed to create task: ' + (taskData.name || 'unnamed') +
                            '\nError: ' + taskError.message +
                            '\nStack: ' + taskError.stack
                        );
                        // Continue with next task instead of failing entire sync
                    }
                });
            }

            // Return success response with created data
            var response = {
                success: true,
                data: {
                    projectId: projectInternalId,
                    projectName: context.projectName,
                    customerId: customerIdNum,
                    externalRef: context.externalRef || context.projectId,
                    tasks: createdTasks,
                    tasksCreated: createdTasks.length,
                    tasksRequested: (context.tasks && Array.isArray(context.tasks)) ? context.tasks.length : 0,
                    syncedAt: new Date().toISOString()
                }
            };

            log.audit('Project Sync Complete', JSON.stringify(response));
            return response;

        } catch (e) {
            log.error('Project Sync Error', e.message + '\n' + e.stack);

            // Return detailed error for debugging
            return {
                success: false,
                error: e.message,
                details: e.stack,
                context: {
                    customerId: context.customerId,
                    projectName: context.projectName,
                    hasWebsite: !!context.website,
                    hasNotes: !!context.notes,
                    taskCount: (context.tasks && Array.isArray(context.tasks)) ? context.tasks.length : 0
                }
            };
        }
    }

    /**
     * PUT Handler (Future Enhancement)
     */
    function put(context) {
        log.audit('PUT Request', JSON.stringify(context));
        return {
            success: false,
            error: 'PUT method not implemented yet'
        };
    }

    /**
     * DELETE Handler (Future Enhancement)
     */
    function doDelete(context) {
        log.audit('DELETE Request', JSON.stringify(context));
        return {
            success: false,
            error: 'DELETE method not implemented yet'
        };
    }

    // Export handlers
    return {
        get: get,
        post: post,
        put: put,
        delete: doDelete
    };
});
