var fs = require('fs');
var path = require('path');

// Load options into JS object.
exports.options = JSON.parse(fs.readFileSync(path.resolve(__dirname,'../options.json')));

