/// <reference path='../typings/node/node.d.ts' />
/// <reference path='../typings/mongodb/mongodb.d.ts' />
/// <reference path='../typings/express/express.d.ts' />

var fs = require('fs');
var path = require('path');
var argv = require('optimist').argv;

// Load options into JS object.
var options = JSON.parse(fs.readFileSync(argv.optionsFile));
export = options;

if (options.ssl) {
  options.port = process.env.PORT || options.port || 8443;
} else {
  options.port = process.env.PORT || options.port || 3000;
}

if(options.login.auth.indexOf('facebook') > -1 &&
   options.login.facebook.clientID == 'INSERT_FACEBOOK_CLIENTID_HERE') {
  options.login.auth.splice(options.login.auth.indexOf('facebook'), 1);
}

if(options.login.auth.indexOf('google') > -1 &&
   options.login.google.clientID == 'INSERT_GOOGLE_CLIENTID_HERE') {
  options.login.auth.splice(options.login.auth.indexOf('google'), 1);
}
