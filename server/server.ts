/// <reference path='../typings/node/node.d.ts' />
/// <reference path='../typings/mongodb/mongodb.d.ts' />
/// <reference path='../typings/express/express.d.ts' />

var fs = require('fs');
var path = require('path');
var https = require('https');
var http = require('http');
var AppHandler = require('./app-handler');

var options = require('./options-handler').options;

var model = require('./model');
var Page = model.Page;
var PageVersion = model.PageVersion;

var hierarchy = require('./hierarchy');

var log = require('./logger').log;

require('./mongoose-handler').init(function() {
  log.debug("Connected to MongoDB database");
  var app = AppHandler.init();
  if (options.ssl) {
    log.info("Loading credentials...");
    var certificate  = fs.readFileSync(options.credentials.certificateFile, 'utf8');
    var privateKey = fs.readFileSync(options.credentials.privateKeyFile, 'utf8');

    var credentials = {
      key: privateKey,
      cert: certificate,
      passphrase:options.credentials.passphrase
    };

    app.set('port', options.port);
    exports.server =
      https.createServer(credentials, app)
      .listen(
        app.get('port'),
        launchServer
      );
  } else {
    app.set('port', options.port);
    exports.server =
      http.createServer(app)
      .listen(
        app.get('port'),
        launchServer
      );
  }
});

var launchServer = function() {
  var server = exports.server;
  log.debug('TidalWave server listening on port ' + server.address().port);
  model.sanitize();
  AppHandler.launch();

  // Check if we have any documents.  If not, create welcome page.
  Page.count({}, function(err, c) {
    if (c==0) {
      log.warn("No pages found.  Creating welcome page");
      var welcomePage = fs.readFileSync(path.resolve(__dirname,'../README.md'), "utf8");
      new Page({
        name:'Welcome',
        fullyQualifiedName:'Welcome',
        isPublic:true,
        content:welcomePage,
        nextVersion:2
      }).save(function (err, savedPage) {
        if (err) {
          log.error({error:err});
          return;
        }
        new PageVersion({
          pageId:savedPage._id,
          version:1,
          editorIds:[],
          content:welcomePage}).save(function(err) {
            if (err) {
              log.error({error:err});
              return;
            }
            log.warn("Finished creating welcome page");
          });
      });
    }
  });
};
