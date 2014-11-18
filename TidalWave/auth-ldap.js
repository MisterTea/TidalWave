var ldap = require('ldapjs');
var assert = require('assert');
var options = require('./options-handler').options;

exports.login = function(uid,password,successCallback,errorCallback) {
  var client = ldap.createClient({
    url: options.ldap.server
  });
  console.log("BINDING");
  client.bind(options.ldap.userField+'='+uid+','+options.ldap.bindDN, password, function(err) {
    console.log("RESULT");
    if (err) {
      errorCallback(err.message);
    }
    client.unbind(function(err2) {
      if (err) {
        // Already reported this error.
      } else if (err2) {
        errorCallback(err2.message);
      } else {
        successCallback();
      }
    });
  });
};

