Accounts.registerLoginHandler("LDAP", function(loginRequest) {
  console.log("REQUEST");
  console.log(loginRequest);

  if (!loginRequest.hasOwnProperty('ldappassword')) return undefined;
  console.log("CHECKING");

  if (LDAP.checkAccount(loginRequest)) {
    console.log("Login successful");
    var userId;
    var user = Meteor.users.findOne({ username : loginRequest.username });
    if (user) {
      userId = user._id;
    } else {
      // create new account
      userId = Meteor.users.insert({ username : loginRequest.username });
    }

    return {
      type: "LDAP",
      userId: userId
    };
  }

  return { type: "LDAP",
           error: new Meteor.Error(
             403,
             "Invalid LDAP password") };
});
