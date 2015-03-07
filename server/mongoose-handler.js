var mongoose = require('mongoose');
var log = require('./logger').log;

var options = require('./options-handler').options;

exports.init = function(callback) {
  mongoose.connect(options['database']['uri']);
  var db = mongoose.connection;
  db.on('error', function(err) {
    log.error(err);
    setTimeout(function() {
      process.exit(1);
    }, 1000);
  });
  db.once('open', callback);
};
