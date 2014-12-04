var passport = require('passport')
, LocalStrategy = require('passport-local').Strategy;

var validator = require('validator');
var options = require('./options-handler').options;
var log = require('./logger').log;

var model = require('./model');
var Page = model.Page;
var PageVersion = model.PageVersion;
var User = model.User;
var UserPassword = model.UserPassword;

var auth = null;
if (options.auth == 'ldap') {
  auth = require("./auth-ldap");
} else if(options.auth == 'plain') {
  auth = require('./auth-plain');
}

exports.init = function(app) {

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

  // Use the LocalStrategy within Passport.
  //   Strategies in passport require a `verify` function, which accept
  //   credentials (in this case, a username and password), and invoke a callback
  //   with a user object.  In the real world, this would query a database;
  //   however, in this example we are using a baked-in set of users.
  passport.use(new LocalStrategy(function(username, password, done) {
    User.findOne({ username: username }, function(err, user) {
      if (err) { return done(err); }
      if (!user) { return done(null, false, { message: 'Unknown user ' + username }); }
      auth.login(username,password,function() {
        user.lastLoginTime = Date.now();
        user.save(function(err, innerUser) {
          if (err) {
            console.log(err);
          } else {
            done(null,user);
          }
        });
      }, function(errMessage) {
        return done(null, false, {message: errMessage});
      });
      return true;
    });
  }));

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
        auth:options.auth,
        server:{
          projectName:options.serverName,
          user:req.user
        }
      }
    );
  });
  app.post('/login', function(req, res, next) {
    var redirect = req.param('redirect');
    if (!redirect) {
      redirect = "/view";
    }

    if ('register' in req.body) {
      res.redirect('/register');
      return;
    }

    passport.authenticate('local', function(err, user, info) {
      if (err) { 
        next(err);
        return;
      }
      if (!user) {
        req.session.messages = [info.message];
        res.redirect('/login');
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
    req.logout();
    res.redirect('/');
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
        //TODO: Auto-login after registering
        res.status(200).end();
      });
    });
  });
};
