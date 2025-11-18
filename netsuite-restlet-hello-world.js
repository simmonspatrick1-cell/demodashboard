/**
 * Minimal NetSuite RESTlet for connectivity / hello-world testing.
 *
 * Upload this script to NetSuite (SuiteScript 2.1, RESTlet) and deploy it with
 * public permissions so you can confirm that OAuth + RESTlet plumbing works
 * before wiring in the full Demo Dashboard integration.
 *
 * @NApiVersion 2.1
 * @NScriptType Restlet
 */
define(['N/log'], function (log) {
  function respond(handlerName, payload) {
    var message = 'Hello from NetSuite RESTlet (' + handlerName + ')';

    log.audit(message, payload);

    return {
      success: true,
      message: message,
      timestamp: new Date().toISOString(),
      input: payload || {}
    };
  }

  function get(context) {
    return respond('GET', context);
  }

  function post(context) {
    return respond('POST', context);
  }

  function put(context) {
    return respond('PUT', context);
  }

  function del(context) {
    return respond('DELETE', context);
  }

  return {
    get: get,
    post: post,
    put: put,
    delete: del
  };
});
