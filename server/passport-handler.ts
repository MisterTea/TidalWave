/// <reference path='../typings/node/node.d.ts' />
/// <reference path='../typings/mongodb/mongodb.d.ts' />
/// <reference path='../typings/express/express.d.ts' />

var passport = require('passport');
var validator = require('validator');

var LocalStrategy = require('passport-local').Strategy;
var FacebookStrategy = require('passport-facebook').Strategy;
var GoogleStrategy = require('passport-google-oauth').OAuth2Strategy;

import options = require('./options-handler');
import log = require('./logger');

import model = require('./model');
var Page = model.Page;
var PageVersion = model.PageVersion;
var User = model.User;
var UserPassword = model.UserPassword;

import PlainAuth = require('./auth-plain');
import LdapAuth = require('./auth-ldap');

export var init = function(app) {

  // Passport session setup.
  //   To support persistent login sessions, Passport needs to be able to
  //   serialize users into and deserialize users out of the session.  Typically,
  //   this will be as simple as storing the user ID when serializing, and finding
  //   the user by ID when deserializing.
  //
  //   Both serializer and deserializer edited for Remember Me functionality
  passport.serializeUser(function(user, done) {
    done(null, user._id);
  });

  passport.deserializeUser(function(_id, done) {
    User.findById(_id , function (err, user) {
      done(err, user);
    });
  });

  if(options.login.auth.indexOf('facebook') > -1) {
    enableFacebookStrategy(passport);
  }

  if(options.login.auth.indexOf('google') > -1) {
    enableGoogleStrategy(passport);
  }

  if (options.login.auth.indexOf('plain') > -1 ||
      options.login.auth.indexOf('ldap') > -1) {
    enableLocalStrategy(passport);
  }

  app.use(passport.initialize());
  app.use(passport.session());

  app.get('/login', function(req, res){
    var redirect = req.param('redirect');
    if (!redirect) {
      redirect = '';
    }
    res.render(
      'login',
      {
        user: req.user,
        message: req.session.messages,
        redirectUrl:redirect,
        auth:options.login.auth,
        server:{
          projectName:options.serverName,
          user:req.user
        }
      }
    );
  });
  app.post('/login', function(req, res, next) {
    var redirect = decodeURIComponent(req.param('redirect'));
    if (!redirect) {
      redirect = options.baseUrl + "/view";
    }

    if ('register' in req.body) {
      res.redirect(options.baseUrl + '/register');
      return;
    }

    passport.authenticate('local', function(err, user, info) {
      if (err) {
        next(err);
        return;
      }
      if (!user) {
        req.session.messages = [info.message];
        res.redirect(options.baseUrl + '/login');
        return;
      }
      req.logIn(user, function(err) {
        if (err) {
          next(err);
          return;
        }
        res.redirect(redirect);
        return;
      });
    })(req, res, next);
  });
  app.get('/logout', function(req, res){
    req.logOut();
    req.session.destroy(function(err) {
      res.redirect(options.baseUrl + '/');
    });
  });
  app.get('/register', function(req, res){
    res.render(
      'register', {
        server:{
          projectName:options.serverName,
          user:req.user
        }
      }
    );
  });
  app.post('/register', function(req, res, next) {
    console.dir(req.body);
    var email = req.body.email;
    var fullName = req.body.fullName;
    var password = req.body.password;
    if (fullName.length<5 ||
        fullName.length>40 ||
        password.length<5 ||
        password.length>40 ||
        !validator.isEmail(email)) {
      res.status(400).end();
      return;
    }
    log.debug(req.body);
    var user = new User({username:email,email:email,fullName:fullName,fromLdap:false});
    user.save(function(err, innerUser) {
      if (err) {
        console.log(err);
        res.status(500).end();
        return;
      }
      var userPassword = new UserPassword({userId:innerUser._id,password:password});
      userPassword.save(function(err, innerUP) {
        if (err) {
          console.log(err);
          res.status(500).end();
          return;
        }

        req.body.username = req.body.email;

        passport.authenticate('local', function(err, user, info) {
          if (err) {
            log.error({message:"DB error"});
            res.status(500).end();
            return;
          }
          if (!user) {
            log.error({message:"invalid user"});
            req.session.messages = [info.message];
            res.status(500).end();
            return;
          }
          req.logIn(user, function(err) {
            if (err) {
              res.status(500).end();
              return;
            }
            res.status(200).end();
            return;
          });
        })(req, res, next);
      });
    });
  });
  // GET /auth/facebook
  //   Use passport.authenticate() as route middleware to authenticate the
  //   request.  The first step in Facebook authentication will involve
  //   redirecting the user to facebook.com.  After authorization, Facebook will
  //   redirect the user back to this application at /auth/facebook/callback
  app.get('/auth/facebook',
          passport.authenticate('facebook', {scope: 'email'}),
          function(req, res){
            // The request will be redirected to Facebook for authentication, so this
            // function will not be called.
          });

  // GET /auth/facebook/callback
  //   Use passport.authenticate() as route middleware to authenticate the
  //   request.  If authentication fails, the user will be redirected back to the
  //   login page.  Otherwise, the primary route function function will be called,
  //   which, in this example, will redirect the user to the home page.
  app.get('/auth/facebook/callback',
          passport.authenticate('facebook', { failureRedirect: '/login' }),
          function(req, res) {
            var redirect = options.baseUrl + '/view';
            if (req.param('redirect')) {
              redirect = decodeURIComponent(req.param('redirect'));
            }
            console.log("GOT REDIRECT");
            console.dir(req.param('redirect'));
            console.dir(redirect);
            res.redirect(redirect);
          });

  app.get('/auth/google',
          passport.authenticate('google', {scope: ['https://www.googleapis.com/auth/plus.login', 'email']}),
          function(req, res){
            // The request will be redirected to Facebook for authentication, so this
            // function will not be called.
          });

  app.get('/auth/google/callback',
          passport.authenticate('google', { failureRedirect: '/login' }),
          function(req, res) {
            var redirect = options.baseUrl + '/view';
            if (req.param('redirect')) {
              redirect = decodeURIComponent(req.param('redirect'));
            }
            console.log("GOT REDIRECT");
            console.dir(req.param('redirect'));
            console.dir(redirect);
            res.redirect(redirect);
          });
};

var enableFacebookStrategy = function(passport) {
  passport.use(new FacebookStrategy({
    clientID: options.login.facebook.clientID,
    clientSecret: options.login.facebook.clientSecret,
    callbackURL: (options.ssl?"https":"http")+"://"+options.hostname+":"+options.port+"/auth/facebook/callback",
    profileFields: ['id', 'displayName', 'email'],
    enableProof: false
  }, function(accessToken, refreshToken, profile, done) {
    log.info(profile);
    User.findOne({ username: profile.id }, function (err, user) {
      if (err) {
        log.error(err);
        done(err);
        return;
      }
      if (!user) {
        // First time logging in.  Create new account.
        log.info("Creating new user");
        var email = profile.emails[0].value;
        user = new User({username:profile.id,email:email,fullName:profile.displayName,fromLdap:false});
        user.save(function(err, innerUser) {
          if (err) {
            console.log(err);
            done(err);
            return;
          }
          done(err, innerUser);
        });
      } else {
        done(err, user);
      }
    });
  }));
};

var enableGoogleStrategy = function(passport) {
  passport.use(new GoogleStrategy({
    clientID: options.login.google.clientID,
    clientSecret: options.login.google.clientSecret,
    callbackURL: (options.ssl?"https":"http")+"://"+options.hostname+":"+options.port+"/auth/google/callback"
  }, function(accessToken, refreshToken, profile, done) {
    log.info("GOOGLE PROFILE");
    log.info(profile);
    User.findOne({ username: profile.id }, function (err, user) {
      if (err) {
        log.error(err);
        done(err);
        return;
      }
      if (!user) {
        // First time logging in.  Create new account.
        log.info("Creating new user");
        var email = profile.emails[0].value;
        user = new User({username:profile.id,email:email,fullName:profile.displayName,fromLdap:false});
        user.save(function(err, innerUser) {
          if (err) {
            console.log(err);
            done(err);
            return;
          }
          done(err, innerUser);
        });
      } else {
        done(err, user);
      }
    });
  }));
};

var enableLocalStrategy = function(passport) {
  // Use the LocalStrategy within Passport.
  //   Strategies in passport require a `verify` function, which accept
  //   credentials (in this case, a username and password), and invoke a callback
  //   with a user object.  In the real world, this would query a database;
  //   however, in this example we are using a baked-in set of users.
  passport.use(new LocalStrategy(function(username, password, done) {
    User.findOne({ username: username }, function(err, user) {
      if (err) {
        log.error(err);
        return done(err);
      }
      if (!user) {
        log.warn({message:"Unknown user", username:username});
        return done(null, false, { message: 'Unknown user ' + username });
      }
      var auth = PlainAuth;
      if (options.login.auth.indexOf('ldap') > -1) {
        auth = LdapAuth;
      }
      auth.login(username,password,function() {
        user.lastLoginTime = Date.now();
        user.save(function(err, innerUser) {
          if (err) {
            log.error(err);
          } else {
            log.info(username + " logged in");
            done(null,user);
          }
        });
      }, function(errMessage) {
        log.error(errMessage);
        return done(null, false, {message: errMessage});
      });
      return true;
    });
  }));
};
