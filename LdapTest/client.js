var ldap = require('ldapjs');
var assert = require('assert');

var client = ldap.createClient({
  url: 'ldaps://nod.apple.com:636'
});

var uid = 'jgauci';
var password = '';

console.log("BINDING");
client.bind('uid='+uid+',cn=users,dc=apple,dc=com', password, function(err) {
  console.log("RESULT");
  console.log(err.message);
  if (err) {
    client.unbind(function(err) {
      assert.ifError(err);
    });
  }
});

