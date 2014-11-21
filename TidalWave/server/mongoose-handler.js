var mongoose = require('mongoose');
var log = require('./logger').log;

exports.init = function(callback) {
  mongoose.connect('mongodb://localhost/tidalwave');
  var db = mongoose.connection;
  db.on('error', function(err) {
    log.error(err);
  });
  db.once('open', callback);
};
