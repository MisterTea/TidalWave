var mongoose = require('mongoose');

exports.init = function(callback) {
  mongoose.connect('mongodb://localhost/tidalwave');
  var db = mongoose.connection;
  db.on('error', console.error.bind(console, 'connection error:'));
  db.once('open', callback);
};
