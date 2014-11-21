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

var launchServer = function() {
  var server = exports.server;
  log.debug('TidalWave server listening on port ' + server.address().port);
  require('./mongoose-handler').init(function() {
    log.debug("Connected to MongoDB database");
    AppHandler.launch();
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
