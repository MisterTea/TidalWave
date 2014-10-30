var ldap = Meteor.require('ldapjs');
ldap.Attribute.settings.guid_format = ldap.GUID_FORMAT_B;

LDAP = {};

LDAP.ldap = ldap;

// Settings
LDAP.serverIP = 'nod.apple.com';
LDAP.serverPort = 636;
LDAP.bindDn = ',cn=users,dc=apple,dc=com';

//Create Connection
console.log("CREATING CONNECTION");

LDAP.checkAccount = function(options) {
  console.log("IN CHECK");
  options = options || {};

  console.log(options);
  if (options.hasOwnProperty('username') && options.hasOwnProperty('ldappassword')) {
    return Async.runSync(function(done) {
      var client = ldap.createClient({
        url: 'ldaps://' + LDAP.serverIP + ':' + LDAP.serverPort
      });
      client.bind(
        'uid='+options.username.username.split("@")[0]+LDAP.bindDn,
        options.ldappassword,
        function (err) {
          if (err) {
            console.log("error in ldap:");
            console.log(err);
            client.unbind(function(err) {
              console.log(err);
              done(null,false);
            });
          } else {
            console.log("We're good");
            client.unbind(function(err) {
              console.log(err);
              done(null,true);
            });
          }
        });
    }).result;
  } else {
    throw new Meteor.Error(400, "Missing Parameter");
  }
};
