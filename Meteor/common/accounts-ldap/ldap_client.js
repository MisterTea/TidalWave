Ldap = {};

// Request Ldap credentials for the user
//
// @param options {optional}
// @param credentialRequestCompleteCallback {Function} Callback function to call on
//   completion. Takes one argument, credentialToken on success, or Error on
//   error.
Ldap.requestCredential = function (options, credentialRequestCompleteCallback) {
  // support both (options, callback) and (callback).
  if (!credentialRequestCompleteCallback && typeof options === 'function') {
    credentialRequestCompleteCallback = options;
    options = {};
  }

  var config = ServiceConfiguration.configurations.findOne({service: 'ldap'});
  if (!config) {
    credentialRequestCompleteCallback && credentialRequestCompleteCallback(new ServiceConfiguration.ConfigError("Service not configured"));
    return;
  }

  var credentialToken = Random.id();
  var mobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry/i.test(navigator.userAgent);
  var display = mobile ? 'touch' : 'popup';

  var scope = "email";
  if (options && options.requestPermissions)
    scope = options.requestPermissions.join(',');

  var loginUrl =
        'https://www.ldap.com/dialog/oauth?client_id=' + config.appId +
        '&redirect_uri=' + Meteor.absoluteUrl('_oauth/ldap?close') +
        '&display=' + display + '&scope=' + scope + '&state=' + credentialToken;

  Oauth.initiateLogin(credentialToken, loginUrl, credentialRequestCompleteCallback);
};
