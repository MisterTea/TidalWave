var ldap = require('ldapjs');
var assert = require('assert');

var handleFailure = function(err) {
  console.log(err);
};

var handleSuccess = function() {
  console.log("SUCCESS");
};

exports.login = function(uid,password,successCallback,errorCallback) {
  var client = ldap.createClient({
    url: 'ldaps://nod.apple.com:636'
  });
  console.log("BINDING");
  client.bind('uid='+uid+',cn=users,dc=apple,dc=com', password, function(err) {
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

