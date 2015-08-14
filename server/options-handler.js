var fs = require('fs');
var path = require('path');
var argv = require('optimist').argv;

// Load options into JS object.
var options = exports.options = JSON.parse(fs.readFileSync(argv.optionsFile));

if (options.ssl) {
  options.port = process.env.PORT || options.port || 8443;
} else {
  options.port = process.env.PORT || options.port || 3000;
}
