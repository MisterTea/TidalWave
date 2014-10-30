var elementValueById = function(id) {                                                                                // 319
  var element = document.getElementById(id);                                                                         // 320
  if (!element)                                                                                                      // 321
    return null;                                                                                                     // 322
  else                                                                                                               // 323
    return element.value;                                                                                            // 324
};                                                                                                                   // 325
// 326
var trimmedElementValueById = function(id) {                                                                         // 327
  var element = document.getElementById(id);                                                                         // 328
  if (!element)                                                                                                      // 329
    return null;                                                                                                     // 330
  else                                                                                                               // 331
    return element.value.replace(/^\s*|\s*$/g, ""); // trim() doesn't work on IE8;                                   // 332
};                                                                                                                   // 333
// 334
var loginOrSignup = function () {                                                                                    // 335
  if (loginButtonsSession.get('inSignupFlow'))                                                                       // 336
    signup();                                                                                                        // 337
  else                                                                                                               // 338
    login();                                                                                                         // 339
};                                                                                                                   // 340
// 341
var login = function () {
  loginButtonsSession.resetMessages();                                                                               // 343
  // 344
  var username = trimmedElementValueById('login-username');                                                          // 345
  var email = trimmedElementValueById('login-email');                                                                // 346
  var usernameOrEmail = trimmedElementValueById('login-username-or-email');                                          // 347
  // notably not trimmed. a password could (?) start or end with a space                                             // 348
  var password = elementValueById('login-password');                                                                 // 349
  // 350
  var loginSelector;                                                                                                 // 351
  if (username !== null) {                                                                                           // 352
    if (!validateUsername(username))                                                                                 // 353
      return;                                                                                                        // 354
    else                                                                                                             // 355
      loginSelector = {username: username};                                                                          // 356
  } else if (email !== null) {                                                                                       // 357
    if (!validateEmail(email))                                                                                       // 358
      return;                                                                                                        // 359
    else                                                                                                             // 360
      loginSelector = {email: email};                                                                                // 361
  } else if (usernameOrEmail !== null) {                                                                             // 362
    // XXX not sure how we should validate this. but this seems good enough (for now),                               // 363
    // since an email must have at least 3 characters anyways                                                        // 364
    if (!validateUsername(usernameOrEmail))                                                                          // 365
      return;                                                                                                        // 366
    else                                                                                                             // 367
      loginSelector = usernameOrEmail;                                                                               // 368
  } else {                                                                                                           // 369
    throw new Error("Unexpected -- no element to use as a login user selector");                                     // 370
  }

  var loginRequest = {
    username: loginSelector,
    ldappassword: password
  };
  
  Accounts.callLoginMethod({
    methodArguments: [loginRequest],
    userCallback: function(error) {
      if (error) {
        loginButtonsSession.errorMessage(error.reason || "Unknown error");
      } else {
        loginButtonsSession.closeDropdown();
      }
    }
  });

/*
  Meteor.loginWithPassword(loginSelector, password, function (error, result) {                                       // 373
    if (error) {                                                                                                     // 374
      loginButtonsSession.errorMessage(error.reason || "Unknown error");                                             // 375
    } else {                                                                                                         // 376
      loginButtonsSession.closeDropdown();                                                                           // 377
    }                                                                                                                // 378
  });                                                                                                                // 379
*/
};                                                                                                                   // 380
// 381
var signup = function () {                                                                                           // 382
  loginButtonsSession.resetMessages();                                                                               // 383
  // 384
  var options = {}; // to be passed to Accounts.createUser                                                           // 385
  // 386
  var username = trimmedElementValueById('login-username');                                                          // 387
  if (username !== null) {                                                                                           // 388
    if (!validateUsername(username))                                                                                 // 389
      return;                                                                                                        // 390
    else                                                                                                             // 391
      options.username = username;                                                                                   // 392
  }                                                                                                                  // 393
  // 394
  var email = trimmedElementValueById('login-email');                                                                // 395
  if (email !== null) {                                                                                              // 396
    if (!validateEmail(email))                                                                                       // 397
      return;                                                                                                        // 398
    else                                                                                                             // 399
      options.email = email;                                                                                         // 400
  }                                                                                                                  // 401
  // 402
  // notably not trimmed. a password could (?) start or end with a space                                             // 403
  var password = elementValueById('login-password');                                                                 // 404
  if (!validatePassword(password))                                                                                   // 405
    return;                                                                                                          // 406
  else                                                                                                               // 407
    options.password = password;                                                                                     // 408
  // 409
  if (!matchPasswordAgainIfPresent())                                                                                // 410
    return;                                                                                                          // 411
  // 412
  Accounts.createUser(options, function (error) {                                                                    // 413
    if (error) {                                                                                                     // 414
      loginButtonsSession.errorMessage(error.reason || "Unknown error");                                             // 415
    } else {                                                                                                         // 416
      loginButtonsSession.closeDropdown();                                                                           // 417
    }                                                                                                                // 418
  });                                                                                                                // 419
};                                                                                                                   // 420
// 421
var forgotPassword = function () {                                                                                   // 422
  loginButtonsSession.resetMessages();                                                                               // 423
  // 424
  var email = trimmedElementValueById("forgot-password-email");                                                      // 425
  if (email.indexOf('@') !== -1) {                                                                                   // 426
    Accounts.forgotPassword({email: email}, function (error) {                                                       // 427
      if (error)                                                                                                     // 428
        loginButtonsSession.errorMessage(error.reason || "Unknown error");                                           // 429
      else                                                                                                           // 430
        loginButtonsSession.infoMessage("Email sent");                                                               // 431
    });                                                                                                              // 432
  } else {                                                                                                           // 433
    loginButtonsSession.errorMessage("Invalid email");                                                               // 434
  }                                                                                                                  // 435
};                                                                                                                   // 436
// 437
var changePassword = function () {                                                                                   // 438
  loginButtonsSession.resetMessages();                                                                               // 439
  // 440
  // notably not trimmed. a password could (?) start or end with a space                                             // 441
  var oldPassword = elementValueById('login-old-password');                                                          // 442
  // 443
  // notably not trimmed. a password could (?) start or end with a space                                             // 444
  var password = elementValueById('login-password');                                                                 // 445
  if (!validatePassword(password))                                                                                   // 446
    return;                                                                                                          // 447
  // 448
  if (!matchPasswordAgainIfPresent())                                                                                // 449
    return;                                                                                                          // 450
  // 451
  Accounts.changePassword(oldPassword, password, function (error) {                                                  // 452
    if (error) {                                                                                                     // 453
      loginButtonsSession.errorMessage(error.reason || "Unknown error");                                             // 454
    } else {                                                                                                         // 455
      loginButtonsSession.set('inChangePasswordFlow', false);                                                        // 456
      loginButtonsSession.set('inMessageOnlyFlow', true);                                                            // 457
      loginButtonsSession.infoMessage("Password changed");                                                           // 458
    }                                                                                                                // 459
  });                                                                                                                // 460
};                                                                                                                   // 461
// 462
var matchPasswordAgainIfPresent = function () {                                                                      // 463
  // notably not trimmed. a password could (?) start or end with a space                                             // 464
  var passwordAgain = elementValueById('login-password-again');                                                      // 465
  if (passwordAgain !== null) {                                                                                      // 466
    // notably not trimmed. a password could (?) start or end with a space                                           // 467
    var password = elementValueById('login-password');                                                               // 468
    if (password !== passwordAgain) {                                                                                // 469
      loginButtonsSession.errorMessage("Passwords don't match");                                                     // 470
      return false;                                                                                                  // 471
    }                                                                                                                // 472
  }                                                                                                                  // 473
  return true;                                                                                                       // 474
};                                                                                                                   // 475
// 476
var correctDropdownZIndexes = function () {                                                                          // 477
  // IE <= 7 has a z-index bug that means we can't just give the                                                     // 478
  // dropdown a z-index and expect it to stack above the rest of                                                     // 479
  // the page even if nothing else has a z-index.  The nature of                                                     // 480
  // the bug is that all positioned elements are considered to                                                       // 481
  // have z-index:0 (not auto) and therefore start new stacking                                                      // 482
  // contexts, with ties broken by page order.                                                                       // 483
  //                                                                                                                 // 484
  // The fix, then is to give z-index:1 to all ancestors                                                             // 485
  // of the dropdown having z-index:0.                                                                               // 486
  for(var n = document.getElementById('login-dropdown-list').parentNode;                                             // 487
      n.nodeName !== 'BODY';                                                                                         // 488
      n = n.parentNode)                                                                                              // 489
    if (n.style.zIndex === 0)                                                                                        // 490
      n.style.zIndex = 1;                                                                                            // 491
};                                                                                                                   // 492
// 493
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////


var loginButtonsSession = Accounts._loginButtonsSession;

var displayName = function () {                                                                                          // 30
  var user = Meteor.user();                                                                                          // 31
  if (!user)                                                                                                         // 32
    return '';                                                                                                       // 33
  // 34
  if (user.profile && user.profile.name)                                                                             // 35
    return user.profile.name;                                                                                        // 36
  if (user.username)                                                                                                 // 37
    return user.username;                                                                                            // 38
  if (user.emails && user.emails[0] && user.emails[0].address)                                                       // 39
    return user.emails[0].address;                                                                                   // 40
  // 41
  return '';                                                                                                         // 42
};                                                                                                                   // 43
// 44
// returns an array of the login services used by this app. each                                                     // 45
// element of the array is an object (eg {name: 'facebook'}), since                                                  // 46
// that makes it useful in combination with handlebars {{#each}}.                                                    // 47
//                                                                                                                   // 48
// don't cache the output of this function: if called during startup (before                                         // 49
// oauth packages load) it might not include them all.                                                               // 50
//                                                                                                                   // 51
// NOTE: It is very important to have this return password last                                                      // 52
// because of the way we render the different providers in                                                           // 53
// login_buttons_dropdown.html                                                                                       // 54
getLoginServices = function () {                                                                                     // 55
  console.log("GETTING LOGIN SERVICES");
  var self = this;                                                                                                   // 56
  // 57
  // First look for OAuth services.                                                                                  // 58
  var services = Package['accounts-oauth'] ? Accounts.oauth.serviceNames() : [];                                     // 59
  // 60
  // Be equally kind to all login services. This also preserves                                                      // 61
  // backwards-compatibility. (But maybe order should be                                                             // 62
  // configurable?)                                                                                                  // 63
  services.sort();                                                                                                   // 64
  // 65
  // Add password, if it's there; it must come last.                                                                 // 66
  if (hasPasswordService())                                                                                          // 67
    services.push('password');                                                                                       // 68
  console.log(services);
  // 69
  return _.map(services, function(name) {                                                                            // 70
    return {name: name};                                                                                             // 71
  });                                                                                                                // 72
};                                                                                                                   // 73
// 74
hasPasswordService = function () {                                                                                   // 75
  return !!Package['accounts-password'];                                                                             // 76
};                                                                                                                   // 77
// 78
dropdown = function () {                                                                                             // 79
  return hasPasswordService() || getLoginServices().length > 1;                                                      // 80
};                                                                                                                   // 81
// 82
// XXX improve these. should this be in accounts-password instead?                                                   // 83
//                                                                                                                   // 84
// XXX these will become configurable, and will be validated on                                                      // 85
// the server as well.                                                                                               // 86
validateUsername = function (username) {                                                                             // 87
  if (username.length >= 3) {                                                                                        // 88
    return true;                                                                                                     // 89
  } else {                                                                                                           // 90
    loginButtonsSession.errorMessage("Username must be at least 3 characters long");                                 // 91
    return false;                                                                                                    // 92
  }                                                                                                                  // 93
};                                                                                                                   // 94
validateEmail = function (email) {                                                                                   // 95
  if (passwordSignupFields() === "USERNAME_AND_OPTIONAL_EMAIL" && email === '')                                      // 96
    return true;                                                                                                     // 97
  // 98
  if (email.indexOf('@') !== -1) {                                                                                   // 99
    return true;                                                                                                     // 100
  } else {                                                                                                           // 101
    loginButtonsSession.errorMessage("Invalid email");                                                               // 102
    return false;                                                                                                    // 103
  }                                                                                                                  // 104
};                                                                                                                   // 105
validatePassword = function (password) {                                                                             // 106
  if (password.length >= 6) {                                                                                        // 107
    return true;                                                                                                     // 108
  } else {                                                                                                           // 109
    loginButtonsSession.errorMessage("Password must be at least 6 characters long");                                 // 110
    return false;                                                                                                    // 111
  }                                                                                                                  // 112
};                                                                                                                   // 113

passwordSignupFields = function () {                                                                                 // 61
  return Accounts.ui._options.passwordSignupFields || "EMAIL_ONLY";                                                  // 62
};                                                                                                                   // 63

Template._loginButtonsLoggedInDropdown.events({                                                                      // 22
  'click #login-buttons-open-change-password': function() {                                                          // 23
    loginButtonsSession.resetMessages();                                                                             // 24
    loginButtonsSession.set('inChangePasswordFlow', true);                                                           // 25
  }                                                                                                                  // 26
});                                                                                                                  // 27
// 28
Template._loginButtonsLoggedInDropdown.displayName = displayName;                                                    // 29
// 30
Template._loginButtonsLoggedInDropdown.inChangePasswordFlow = function () {                                          // 31
  return loginButtonsSession.get('inChangePasswordFlow');                                                            // 32
};                                                                                                                   // 33
// 34
Template._loginButtonsLoggedInDropdown.inMessageOnlyFlow = function () {                                             // 35
  return loginButtonsSession.get('inMessageOnlyFlow');                                                               // 36
};                                                                                                                   // 37
// 38
Template._loginButtonsLoggedInDropdown.dropdownVisible = function () {                                               // 39
  return loginButtonsSession.get('dropdownVisible');                                                                 // 40
};                                                                                                                   // 41
// 42
Template._loginButtonsLoggedInDropdownActions.allowChangingPassword = function () {                                  // 43
  // it would be more correct to check whether the user has a password set,                                          // 44
  // but in order to do that we'd have to send more data down to the client,                                         // 45
  // and it'd be preferable not to send down the entire service.password document.                                   // 46
  //                                                                                                                 // 47
  // instead we use the heuristic: if the user has a username or email set.                                          // 48
  var user = Meteor.user();                                                                                          // 49
  return user.username || (user.emails && user.emails[0] && user.emails[0].address);                                 // 50
};                                                                                                                   // 51
// 52
// 53
//                                                                                                                   // 54
// loginButtonsLoggedOutDropdown template and related                                                                // 55
//                                                                                                                   // 56
// 57
Template.loginHandler.events({                                                                     // 58
  'click #login-buttons-password': function () {                                                                     // 59
    loginOrSignup();                                                                                                 // 60
  },                                                                                                                 // 61
  // 62
  'keypress #forgot-password-email': function (event) {                                                              // 63
    if (event.keyCode === 13)                                                                                        // 64
      forgotPassword();                                                                                              // 65
  },                                                                                                                 // 66
  // 67
  'click #login-buttons-forgot-password': function () {                                                              // 68
    forgotPassword();                                                                                                // 69
  },                                                                                                                 // 70
  // 71
  'click #signup-link': function () {                                                                                // 72
    loginButtonsSession.resetMessages();                                                                             // 73
    // 74
    // store values of fields before swtiching to the signup form                                                    // 75
    var username = trimmedElementValueById('login-username');                                                        // 76
    var email = trimmedElementValueById('login-email');                                                              // 77
    var usernameOrEmail = trimmedElementValueById('login-username-or-email');                                        // 78
    // notably not trimmed. a password could (?) start or end with a space                                           // 79
    var password = elementValueById('login-password');                                                               // 80
    // 81
    loginButtonsSession.set('inSignupFlow', true);                                                                   // 82
    loginButtonsSession.set('inForgotPasswordFlow', false);                                                          // 83
    // force the ui to update so that we have the approprate fields to fill in                                       // 84
    Deps.flush();                                                                                                    // 85
    // 86
    // update new fields with appropriate defaults                                                                   // 87
    if (username !== null)                                                                                           // 88
      document.getElementById('login-username').value = username;                                                    // 89
    else if (email !== null)                                                                                         // 90
      document.getElementById('login-email').value = email;                                                          // 91
    else if (usernameOrEmail !== null)                                                                               // 92
      if (usernameOrEmail.indexOf('@') === -1)                                                                       // 93
        document.getElementById('login-username').value = usernameOrEmail;                                           // 94
    else                                                                                                             // 95
      document.getElementById('login-email').value = usernameOrEmail;                                                // 96
    // "login-password" is preserved, since password fields aren't updated by Spark.                                 // 97
    // 98
    // Force redrawing the `login-dropdown-list` element because of                                                  // 99
    // a bizarre Chrome bug in which part of the DIV is not redrawn                                                  // 100
    // in case you had tried to unsuccessfully log in before                                                         // 101
    // switching to the signup form.                                                                                 // 102
    //                                                                                                               // 103
    // Found tip on how to force a redraw on                                                                         // 104
    // http://stackoverflow.com/questions/3485365/how-can-i-force-webkit-to-redraw-repaint-to-propagate-style-changes/3485654#3485654
    var redraw = document.getElementById('login-dropdown-list');                                                     // 106
    redraw.style.display = 'none';                                                                                   // 107
    redraw.offsetHeight; // it seems that this line does nothing but is necessary for the redraw to work             // 108
    redraw.style.display = 'block';                                                                                  // 109
  },                                                                                                                 // 110
  'click #forgot-password-link': function () {
    console.log("CLICKED FORGOT PASSWORD LINK");
    loginButtonsSession.resetMessages();                                                                             // 112
    // 113
    // store values of fields before swtiching to the signup form                                                    // 114
    var email = trimmedElementValueById('login-email');                                                              // 115
    var usernameOrEmail = trimmedElementValueById('login-username-or-email');                                        // 116
    // 117
    loginButtonsSession.set('inSignupFlow', false);                                                                  // 118
    loginButtonsSession.set('inForgotPasswordFlow', true);                                                           // 119
    // force the ui to update so that we have the approprate fields to fill in                                       // 120
    Deps.flush();                                                                                                    // 121
    // 122
    // update new fields with appropriate defaults                                                                   // 123
    if (email !== null)                                                                                              // 124
      document.getElementById('forgot-password-email').value = email;                                                // 125
    else if (usernameOrEmail !== null)                                                                               // 126
      if (usernameOrEmail.indexOf('@') !== -1)                                                                       // 127
        document.getElementById('forgot-password-email').value = usernameOrEmail;                                    // 128
    // 129
  },                                                                                                                 // 130
  'click #back-to-login-link': function () {                                                                         // 131
    loginButtonsSession.resetMessages();                                                                             // 132
    // 133
    var username = trimmedElementValueById('login-username');                                                        // 134
    var email = trimmedElementValueById('login-email')                                                               // 135
          || trimmedElementValueById('forgot-password-email'); // Ughh. Standardize on names?                        // 136
    // 137
    loginButtonsSession.set('inSignupFlow', false);                                                                  // 138
    loginButtonsSession.set('inForgotPasswordFlow', false);                                                          // 139
    // force the ui to update so that we have the approprate fields to fill in                                       // 140
    Deps.flush();                                                                                                    // 141
    // 142
    if (document.getElementById('login-username'))                                                                   // 143
      document.getElementById('login-username').value = username;                                                    // 144
    if (document.getElementById('login-email'))                                                                      // 145
      document.getElementById('login-email').value = email;                                                          // 146
    // "login-password" is preserved, since password fields aren't updated by Spark.                                 // 147
    if (document.getElementById('login-username-or-email'))                                                          // 148
      document.getElementById('login-username-or-email').value = email || username;                                  // 149
  },                                                                                                                 // 150
  'keypress #login-username, keypress #login-email, keypress #login-username-or-email, keypress #login-password, keypress #login-password-again': function (event) {
    if (event.keyCode === 13)                                                                                        // 152
      loginOrSignup();                                                                                               // 153
  }                                                                                                                  // 154
});                                                                                                                  // 155

Template.loginHandler.additionalClasses = function () {
  if (!hasPasswordService()) {
    return false;
  } else {
    if (loginButtonsSession.get('inSignupFlow')) {
      return 'login-form-create-account';
    } else if (loginButtonsSession.get('inForgotPasswordFlow')) {
      return 'login-form-forgot-password';
    } else {
      return 'login-form-sign-in';
    }
  }
};

Template.loginHandler.dropdownVisible = function () {
  return loginButtonsSession.get('dropdownVisible');
};
