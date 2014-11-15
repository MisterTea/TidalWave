try {
  require('heapdump');
} catch (_error) {}

var http = require('http');
var AppHandler = require('./app-handler');
var app = AppHandler.init();

var debug = require('debug')('TidalWave');

var options = require('./options-handler').options;

app.set('port', options.port || 3000);
var server =
      exports.server = 
      http.createServer(app)
      .listen(
        app.get('port'),
        function() {
          debug('TidalWave server listening on port ' + server.address().port);
          require('./mongoose-handler').init(function() {
            debug("Connected to MongoDB database");
            AppHandler.launch();
          });
        }
      );
