/// <reference path='../typings/node/node.d.ts' />
/// <reference path='../typings/mongodb/mongodb.d.ts' />
/// <reference path='../typings/express/express.d.ts' />

var mongoose = require('mongoose');

import log = require('./logger');
import options = require('./options-handler');

export var init = function(callback) {
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

export var disconnect = function() {
  mongoose.disconnect();
};
