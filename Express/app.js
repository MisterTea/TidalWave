var Duplex, argv, backend, browserChannel, livedb, numClients, port, share, sharejs, webserver;

Duplex = require('stream').Duplex;

browserChannel = require('browserchannel').server;

argv = require('optimist').argv;

livedb = require('livedb');

var _ = require('underscore');

try {
  require('heapdump');
} catch (_error) {}

sharejs = require('share');
console.log(sharejs.scriptsDir);

var database = livedb.memory();
backend = livedb.client(database);

backend.addProjection('_users', 'users', 'json0', {
  x: true
});

share = sharejs.server.createClient({
  backend: backend
});

var express = require('express');
var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var session = require('express-session');

var mongoose = require('mongoose');

var model = require('./model');
var Page = model.Page;
var PageVersion = model.PageVersion;
var User = model.User;

var routes = require('./routes/index');
var users = require('./routes/users');
var diff = require('./routes/diff');

var passport = require('passport')
  , LocalStrategy = require('passport-local').Strategy;

var app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

// uncomment after placing your favicon in /public
//app.use(favicon(__dirname + '/public/favicon.ico'));
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(require('less-middleware')(path.join(__dirname, 'public')));
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.static(sharejs.scriptsDir));
app.use(session({ secret: 't1d4lw4ve', saveUninitialized:true, resave:true }));
app.use(passport.initialize());
app.use(passport.session());

app.use('/', routes);
app.use('/users', users);
app.use('/page',require('./routes/page'));
app.use('/diff',diff);
app.use('/history',require('./routes/history'));
app.use('/pagesettings',require('./routes/pagesettings'));
app.use('/profile',require('./routes/profile'));

app.use('/service',require('./routes/hierarchy'));
app.use('/service',require('./routes/services'));

numClients = 0;

app.use(browserChannel({
  webserver: app,
  sessionTimeoutInterval: 5000
}, function(client) {
  var stream;
  numClients++;
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
      if (!database.collections[data['c']] ||
          !database.collections[data['c']][data['d']]) {
        // Document does not exist
        console.log("New document");
        Page.findOne({name:data['d']},function(err,page){
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
    numClients--;
    return console.log('client went away', numClients);
  });
  stream.on('end', function() {
    console.log("CLIENT END");
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

mongoose.connect('mongodb://localhost/tidalwave');
var db = mongoose.connection;
db.on('error', console.error.bind(console, 'connection error:'));
db.once('open', function callback () {
  var debug = require('debug')('TidalWave');
  debug("Connected to MongoDB database");

  app.set('port', process.env.PORT || 3000);

  var server = app.listen(app.get('port'), function() {
    debug('TidalWave server listening on port ' + server.address().port);
  });

  var lastVersionDumped = {};
  setInterval(function() {
    //console.log("Checking for new versions");
    database.query(null, "users", null, null, function(dummy,results){
      _.each(results,function(result) {
        if (!(lastVersionDumped[result.docName] == result.v)) {
          // Dump new PageVersion

          Page.findOne({name:result.docName}, function(err, page){
            if (page == null) {
              console.log("ERROR: UPDATING PAGE THAT DOES NOT EXIST");
              return;
            }
            console.log(page);
            var newPageVersion = new PageVersion({pageId:page._id,version:page.nextVersion,content:result.data,editorIds:[]});
            debug("DUMPING " + page.name + " WITH VERSION " + page.nextVersion);
            console.log(newPageVersion);
            page.nextVersion++;
            page.content = result.data;
            page.save(function (err) {
                if (err) {
                  console.log(err);
                } else {
                  debug("DUMPING PAGEVERSION");
                  newPageVersion.save(function (err,innerPageVersion) {
                    if (err) {
                      console.log(err);
                    }
                    lastVersionDumped[result.docName] = result.v;
                  });
                }
            });
          });
        }
      });
    });

    hierarchy.rebuild();
  }, 1000);
});
