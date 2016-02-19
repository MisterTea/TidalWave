/// <reference path='../typings/node/node.d.ts' />
/// <reference path='../typings/mongodb/mongodb.d.ts' />
/// <reference path='../typings/express/express.d.ts' />

import fs = require('fs');
import path = require('path');
import https = require('https');
import http = require('http');
import AppHandler = require('./app-handler');
import Sanitize = require('./sanitize');

import options = require('./options-handler');

import model = require('./model');
import Page = model.Page;
import PageVersion = model.PageVersion;

import hierarchy = require('./hierarchy');

import log = require('./logger');

import MongooseHandler = require('./mongoose-handler');

MongooseHandler.init(function() {
  log.debug("Connected to MongoDB database");
  var app = AppHandler.init();
  if (options.ssl) {
    log.info("Loading credentials...");
    var certificate  = fs.readFileSync(options.credentials.certificateFile, 'utf8');
    var privateKey = fs.readFileSync(options.credentials.privateKeyFile, 'utf8');

    var credentials = {
      key: privateKey,
      cert: certificate,
      passphrase:options.credentials.passphrase
    };

    app.set('port', options.port);
    exports.server =
      https.createServer(credentials, app)
      .listen(
        app.get('port'),
        launchServer
      );
  } else {
    app.set('port', options.port);
    exports.server =
      http.createServer(app)
      .listen(
        app.get('port'),
        launchServer
      );
  }
});

var launchServer = function() {
  var server = exports.server;
  log.debug('TidalWave server listening on port ' + server.address().port);
  Sanitize.sanitize();
  AppHandler.launch();

  // Check if we have any documents.  If not, create welcome page.
  Page.count({}, function(err, c) {
    if (c==0) {
      log.warn("No pages found.  Creating welcome page");
      var welcomePage = fs.readFileSync(path.resolve(__dirname,'../../README.md'), "utf8");
      new Page({
        name:'Welcome',
        fullyQualifiedName:'Welcome',
        isPublic:true,
        content:welcomePage,
        nextVersion:2
      }).save(function (err, savedPage) {
        if (err) {
          log.error({error:err});
          return;
        }
        new PageVersion({
          pageId:savedPage._id,
          version:1,
          editorIds:[],
          content:welcomePage}).save(function(err) {
            if (err) {
              log.error({error:err});
              return;
            }
            log.warn("Finished creating welcome page");
          });
      });
    }
  });
};
