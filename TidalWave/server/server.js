try {
  require('heapdump');
} catch (_error) {}

var log = require('./logger').log;
var fs = require('fs');
var https = require('https');
var http = require('http');
var AppHandler = require('./app-handler');
var app = AppHandler.init();

var options = require('./options-handler').options;

var model = require('./model');
var Page = model.Page;
var PageVersion = model.PageVersion;

var hierarchy = require('./hierarchy');

var launchServer = function() {
  var server = exports.server;
  log.debug('TidalWave server listening on port ' + server.address().port);
  require('./mongoose-handler').init(function() {
    log.debug("Connected to MongoDB database");
    model.sanitize();
    hierarchy.rebuild();
    AppHandler.launch();

    // Check if we have any documents.  If not, create welcome page.
    Page.count({}, function(err, c) {
      if (c==0) {
        log.warn("No pages found.  Creating welcome page");
        var welcomePage = fs.readFileSync('../README.md', "utf8");
        new Page({
          name:'Welcome',
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
  });
};

if (options.ssl) {
  console.log("Loading credentials...");
  var certificate  = fs.readFileSync(options.credentials.certificateFile, 'utf8');
  var privateKey = fs.readFileSync(options.credentials.privateKeyFile, 'utf8');

  var credentials = {
    key: privateKey,
    cert: certificate,
    passphrase:options.credentials.passphrase
  };

  options.port = options.port || 8443;
  app.set('port', options.port);
  exports.server = 
    https.createServer(credentials, app)
    .listen(
      app.get('port'),
      launchServer
    );
} else {
  options.port = options.port || 3000;
  app.set('port', options.port);
  exports.server = 
    http.createServer(app)
    .listen(
      app.get('port'),
      launchServer
    );
}
