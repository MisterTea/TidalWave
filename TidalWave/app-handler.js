var readLine = require ("readline");
var express = require('express');
var compression = require('compression');
var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var session = require('express-session');
var LiveSync = require('./livesync');
var hierarchy = require('./hierarchy');

exports.init = function() {
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
  app.use(require('less-middleware')(path.join(__dirname, 'public')));
  app.use(express.static(path.join(__dirname, 'public'), {maxAge: 0}));
  app.use(session({ secret: 't1d4lw4ve', saveUninitialized:true, resave:true }));
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
    res.redirect('/view');
  });
  app.use('/view', require('./routes/index'));
  app.use('/page',require('./routes/page'));
  app.use('/diff',require('./routes/diff'));
  app.use('/history',require('./routes/history'));
  app.use('/pagesettings',require('./routes/pagesettings'));
  app.use('/profile',require('./routes/profile'));

  app.use('/service',require('./routes/hierarchy'));
  app.use('/service',require('./routes/services'));

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
};
