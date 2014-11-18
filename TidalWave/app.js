var Duplex, argv, backend, browserChannel, livedb, numClients, port, share, sharejs, webserver;

Duplex = require('stream').Duplex;

browserChannel = require('browserchannel').server;

argv = require('optimist').argv;

livedb = require('livedb');

var _ = require('lodash');
var readLine = require ("readline");

try {
  require('heapdump');
} catch (_error) {}

sharejs = require('share');
console.log(sharejs.scriptsDir);

var options = require('./options-handler').options;

var database = livedb.memory();
backend = livedb.client(database);

backend.addProjection('_users', 'users', 'json0', {
  x: true
});

share = sharejs.server.createClient({
  backend: backend
});

var express = require('express');
var compression = require('compression');
var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var session = require('express-session');
var MongoStore = require('connect-mongo')(session);

var mongoose = require('mongoose');

var model = require('./model');
var Page = model.Page;
var PageVersion = model.PageVersion;
var User = model.User;
var UserPassword = model.UserPassword;

var diff = require('./routes/diff');

var passport = require('passport')
  , LocalStrategy = require('passport-local').Strategy;

// Passport session setup.
//   To support persistent login sessions, Passport needs to be able to
//   serialize users into and deserialize users out of the session.  Typically,
//   this will be as simple as storing the user ID when serializing, and finding
//   the user by ID when deserializing.
//
//   Both serializer and deserializer edited for Remember Me functionality
passport.serializeUser(function(user, done) {
  done(null, user.username);
});

passport.deserializeUser(function(username, done) {
  User.findOne( { username: username } , function (err, user) {
    done(err, user);
  });
});

var auth = null;
if (options.auth == 'ldap') {
  auth = require("./auth-ldap");
} else if(options.auth == 'plain') {
  auth = require('./auth-plain');
}

// Use the LocalStrategy within Passport.
//   Strategies in passport require a `verify` function, which accept
//   credentials (in this case, a username and password), and invoke a callback
//   with a user object.  In the real world, this would query a database;
//   however, in this example we are using a baked-in set of users.
passport.use(new LocalStrategy(function(username, password, done) {
  console.log("LOGGING IN : " + username + " " + password);
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

var app = express();

// Compress content
app.use(compression({
  threshold: 512
}));

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

// uncomment after placing your favicon in /public
//app.use(favicon(__dirname + '/public/favicon.ico'));
app.use(logger('dev'));
app.use(bodyParser.json({limit: '50mb'}));
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
//app.use(require('less-middleware')(path.join(__dirname, 'public')));
app.use(express.static(path.join(__dirname, 'public'), {maxAge: 0}));
app.use(express.static(sharejs.scriptsDir));
app.use(session({
  secret: 't1d4lw4ve',
  saveUninitialized:true,
  resave:true,
  store: new MongoStore({
    db: "tidalwavesessions"
  })
}));
// Remember Me middleware
app.use( function (req, res, next) {
  if ( req.method == 'POST' && req.url == '/login' ) {
    if ( req.body.rememberme ) {
      req.session.cookie.maxAge = 2592000000; // 30*24*60*60*1000 Rememeber 'me' for 30 days
    } else {
      req.session.cookie.expires = false;
    }
  }
  next();
});
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
      auth:options.auth
    }
  );
});
app.post('/login', function(req, res, next) {
  console.log("REDIRECT "+req.param('redirect'));
  var redirect = req.param('redirect');
  if (!redirect) {
    redirect = "/view";
  }

  if ('register' in req.body) {
    res.redirect('/register');
    return;
  }

  if ('login' in req.body || 'register' in req.body) {
    console.log("LOGGING IN");
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
  }
});
app.get('/logout', function(req, res){
  req.logout();
  res.redirect('/');
});

app.get('/register', function(req, res){
  res.render(
    'register'
  );
});
app.post('/register', function(req, res, next) {
  var email = req.body.email;
  var fullName = req.body.fullName;
  var password = req.body.password;
  console.log(req.body);
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
      res.redirect('/login');
    });
  });
});

app.get('/', function(req,res) {
  res.redirect('/view');
});

app.use('/view', require('./routes/index'));
app.use('/page',require('./routes/page'));
app.use('/diff',diff);
app.use('/history',require('./routes/history'));
app.use('/pagesettings',require('./routes/pagesettings'));
app.use('/profile',require('./routes/profile'));

app.use('/service',require('./routes/hierarchy'));
app.use('/service',require('./routes/services'));

var pageConnectionMap = {};

app.use(browserChannel({
  webserver: app,
  sessionTimeoutInterval: 5000
}, function(client) {
  var stream;
  var document = null;
  console.log("New Client Connected");
  stream = new Duplex({
    objectMode: true
  });
  stream._write = function(chunk, encoding, callback) {
    console.log('s->c ', JSON.stringify(chunk));
    if (client.state !== 'closed') {
      client.send(chunk);
    } else {
      console.log("CLIENT IS CLOSED");
    }
    return callback();
  };
  stream._read = function() {};
  stream.headers = client.headers;
  stream.remoteAddress = stream.address;
  client.on('message', function(data) {
    console.log('c->s ', JSON.stringify(data));
    if (data['a']=='sub') {
      // User is subscribing to a new document
      console.log("Got new sub");
      document = data['d'];
      if (!database.collections[data['c']] ||
          !database.collections[data['c']][data['d']]) {
        // Document does not exist
        console.log("New document");

        pageConnectionMap[data['d']] = pageConnectionMap[data['d']] ?
          pageConnectionMap[data['d']]+1 :
          1;

        Page.findOne({_id:data['d']},function(err,page){
          if (page) {
            console.log("Fetch page from DB");
            console.log(page);
            // Inject document from database
            database.writeSnapshot(data['c'],data['d'],{
              v:0,
              type:'http://sharejs.org/types/textv1',
              data:page.content
            }, function(err){});
          }
          return stream.push(data);
        });
        return true;
      } else {
        return stream.push(data);
      }
    } else {
        return stream.push(data);
    }
  });
  stream.on('error', function(msg) {
    console.log("GOT CLIENT ERROR");
    return client.stop();
  });
  client.on('close', function(reason) {
    stream.push(null);
    stream.emit('close');
    return console.log('client went away');
  });
  stream.on('end', function() {
    console.log("CLIENT END");
    pageConnectionMap[document]--;
    if (pageConnectionMap[document]==0) {
      delete pageConnectionMap[document];
      LiveSync.syncAndRemove(document, function(){
      });
    }
    return client.close();
  });
  return share.listen(stream);
}));

app.use('/doc', share.rest());


// catch 404 and forward to error handler
app.use(function(req, res, next) {
  var err = new Error('Not Found');
  err.status = 404;
  next(err);
});

// error handlers

// development error handler
// will print stacktrace
if (app.get('env') === 'development') {
  app.use(function(err, req, res, next) {
    res.status(err.status || 500);
    res.render('error', {
      message: err.message,
      error: err
    });
  });
}

// production error handler
// no stacktraces leaked to user
app.use(function(err, req, res, next) {
  res.status(err.status || 500);
  res.render('error', {
    message: err.message,
    error: {}
  });
});

module.exports = app;

var hierarchy = require('./hierarchy');

var LiveSync = require('./livesync');
LiveSync.init(backend.driver, database);

mongoose.connect('mongodb://localhost/tidalwave');
var db = mongoose.connection;
db.on('error', console.error.bind(console, 'connection error:'));
db.once('open', function callback () {
  var debug = require('debug')('TidalWave');
  debug("Connected to MongoDB database");

  app.set('port', process.env.PORT || 3000);

  var server = exports.server = app.listen(app.get('port'), function() {
    debug('TidalWave server listening on port ' + server.address().port);

    setInterval(function() {
      LiveSync.syncAll();
      hierarchy.rebuild();
    }, 1000*60*60);

    if (process.platform === "win32"){
      var rl = readLine.createInterface ({
        input: process.stdin,
        output: process.stdout
      });
      rl.on ("SIGINT", function (){
        process.emit ("SIGINT");
      });
    }
  
    process.on ("SIGINT", function(){
      console.log("CAUGHT CTRL-C");
      // Do one last sync before we go away
      LiveSync.syncAll();
      
      process.exit ();
    });
  });
});
