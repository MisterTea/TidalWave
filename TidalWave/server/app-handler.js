var readLine = require ("readline");
var express = require('express');
var compression = require('compression');
var path = require('path');
var favicon = require('serve-favicon');
var morgan = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var session = require('express-session');
var MongoStore = require('connect-mongo')(session);
var LiveSync = require('./livesync');
var hierarchy = require('./hierarchy');
var log = require('./logger').log;
var options = require('./options-handler').options;

var BunyanStream = {
  buffer:'',
  write:function(s) {
    this.buffer += s;
    var tokens = this.buffer.split("\n");
    this.buffer = tokens[tokens.length-1];
    for (var a=0;a<tokens.length-1;a++) {
      log.debug(tokens[a]);
    }
  }
};

exports.init = function() {
  var app = express();
  // Compress content
  app.use(compression({
    threshold: 512
  }));

  // view engine setup
  app.set('views', path.join(__dirname, '../views'));
  app.set('view engine', 'ejs');

  // uncomment after placing your favicon in /public
  //app.use(favicon(__dirname + '/public/favicon.ico'));
  app.use(morgan('dev', {
    stream:BunyanStream
  }));
  app.use(bodyParser.json({limit: '128mb'}));
  app.use(bodyParser.urlencoded({ extended: false }));
  app.use(cookieParser());
  app.use(require('less-middleware')(path.join(__dirname, '../public')));
  app.use(express.static(path.join(__dirname, '../public'), {maxAge: 0}));
  app.use(session({
    secret: options.sessionSecret,
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
        req.session.cookie.maxAge = 30*24*60*60*1000; // Rememeber 'me' for 30 days
      } else {
        req.session.cookie.expires = false;
      }
    }
    next();
  });

  require('./passport-handler').init(app);

  app.get('/', function(req,res) {
    if (req.isAuthenticated()) {
      res.redirect('/view');
    } else {
      res.redirect('/login');
    }
  });
  app.use('/view', require('../routes/index'));
  app.use('/diff',require('../routes/diff'));
  app.use('/history',require('../routes/history'));
  app.use('/profile',require('../routes/profile'));

  app.use('/service',require('../routes/hierarchy'));
  app.use('/service',require('../routes/services'));

  require('./sharejs-handler').init(app);

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

  return app;
};

exports.launch = function() {
  hierarchy.rebuild();

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
    log.info("CAUGHT CTRL-C");
    // Do one last sync before we go away
    LiveSync.syncAll();
    
    process.exit ();
  });
};
