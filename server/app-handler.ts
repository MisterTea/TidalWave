/// <reference path='../typings/node/node.d.ts' />
/// <reference path='../typings/mongodb/mongodb.d.ts' />
/// <reference path='../typings/express/express.d.ts' />

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
var mongoose = require('mongoose');

import LiveSync = require('./livesync');
import log = require('./logger');
import options = require('./options-handler');
import ShareJSHandler = require('./sharejs-handler');
import PassportHandler = require('./passport-handler');

import ViewRoute = require('./routes/index');
import ServiceRoute = require('./routes/services');

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

export var init = function() {
  var app = express();
  // Compress content
  app.use(compression({
    threshold: 512
  }));

  // view engine setup
  app.set('views', path.join(__dirname, '../../views'));
  app.set('view engine', 'ejs');

  // uncomment after placing your favicon in /public
  //app.use(favicon(__dirname + '/public/favicon.ico'));
  app.use(morgan('dev', {
    stream:BunyanStream
  }));
  app.use(bodyParser.json({limit: '128mb'}));
  app.use(bodyParser.urlencoded({ extended: false }));
  app.use(cookieParser());
  app.use(express.static(path.join(__dirname, '../../public'), {maxAge: 0}));
  var mongoStore = new MongoStore({
      mongooseConnection: mongoose.connection,
      clear_interval: 3600
    });
  app.use(session({
    secret: options.sessionSecret,
    saveUninitialized:true,
    resave:true,
    store: mongoStore
  }));
  // Remember Me middleware
  app.use( function (req, res, next) {
    if ( req.method == 'POST' && req.url == '/login' ) {
      if ( req.body.rememberme ) {
        req.session.cookie.maxAge = 90*24*60*60*1000; // Rememeber 'me' for 90 days
      } else {
        req.session.cookie.expires = false;
      }
    }
    next();
  });

  PassportHandler.init(app);

  app.get('/', function(req,res) {
    if (req.isAuthenticated()) {
      res.redirect(options.baseUrl + '/view');
    } else {
      res.redirect(options.baseUrl + '/login');
    }
  });
  app.use('/view', ViewRoute);
  app.use('/service',ServiceRoute);

  ShareJSHandler.init(app, mongoStore);

  // catch 404 and forward to error handler
  app.use(function(req, res, next) {
    res.status(404);
    res.send("404 - "+req.path+" Not Found");
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

export var launch = function() {
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
    ShareJSHandler.syncAll(function(err) {
      if (err) {
        log.error(err);
      }
      process.exit(1);
    });
  });
};
