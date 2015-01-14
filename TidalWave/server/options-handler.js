var fs = require('fs');
var path = require('path');

exports.options = JSON.parse(fs.readFileSync(path.resolve(__dirname,'../options.json')));

