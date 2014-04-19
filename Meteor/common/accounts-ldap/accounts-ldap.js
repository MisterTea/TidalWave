/*
if (Meteor.isClient) {
  Meteor.loginWithLdap = function(options, callback) {
    // support a callback without options
    if (! callback && typeof options === "function") {
      callback = options;
      options = null;
    }

    var credentialRequestCompleteCallback = Accounts.oauth.credentialRequestCompleteHandler(callback);
    Ldap.requestCredential(options, credentialRequestCompleteCallback);
  };
} else {
  Accounts.addAutopublishFields({
    // publish ldap object for all users
    forLoggedInUser: ['services.ldap'],
    forOtherUsers: [
      'services.ldap.uid'
    ]
  });
}
*/
