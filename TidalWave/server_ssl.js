var fs = require('fs');
var https = require('https');

var options = require('./options-handler').options;

console.log("Loading credentials...");
var certificate  = fs.readFileSync(options.credentials.certificateFile, 'utf8');
var privateKey = fs.readFileSync(options.credentials.privateKeyFile, 'utf8');

var credentials = {key: privateKey, cert: certificate, passphrase:options.credentials.passphrase};

try {
  require('heapdump');
} catch (_error) {}

var AppHandler = require('./app-handler');
var app = AppHandler.init();

var debug = require('debug')('TidalWave');

app.set('port', options.port || 8443);
var server =
      exports.server = 
      https.createServer(credentials, app)
      .listen(
        app.get('port'),
        function() {
          debug('TidalWave SSL server listening on port ' + server.address().port);
          require('./mongoose-handler').init(function() {
            debug("Connected to MongoDB database");
            AppHandler.launch();
          });
        }
      );
