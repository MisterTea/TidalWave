var fs = require('fs');

exports.options = JSON.parse(fs.readFileSync('options.json'));

