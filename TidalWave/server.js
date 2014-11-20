try {
  require('heapdump');
} catch (_error) {}

var fs = require('fs');
var https = require('https');
var http = require('http');
var AppHandler = require('./app-handler');
var app = AppHandler.init();

var debug = require('debug')('TidalWave');

var options = require('./options-handler').options;

var launchServer = function() {
  var server = exports.server;
  debug('TidalWave server listening on port ' + server.address().port);
  require('./mongoose-handler').init(function() {
    debug("Connected to MongoDB database");
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

  app.set('port', options.port || 8443);
  exports.server = 
    https.createServer(credentials, app)
    .listen(
      app.get('port'),
      launchServer
    );
} else {
  app.set('port', options.port || 3000);
  exports.server = 
    http.createServer(app)
    .listen(
      app.get('port'),
      launchServer
    );
}
