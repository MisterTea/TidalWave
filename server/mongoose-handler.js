var mongoose = require('mongoose');
var log = require('./logger').log;
var process = require('process');

var options = require('./options-handler').options;

exports.init = function(callback) {
  mongoose.connect(options['database']['uri']);
  var db = mongoose.connection;
  db.on('error', function(err) {
    log.error(err);
    process.exit(1);
  });
  db.once('open', callback);
};
