var fs = require('fs');
var path = require('path');
var argv = require('optimist').argv;

// Load options into JS object.
exports.options = JSON.parse(fs.readFileSync(path.resolve(__dirname,'../'+argv.optionsFile)));

