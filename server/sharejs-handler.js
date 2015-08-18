var Duplex = require('stream').Duplex;
var browserChannel = require('browserchannel').server;
var livedb = require('livedb');
var sharejs = require('share');
var express = require('express');
var log = require('./logger').log;
var async = require('async');

var model = require('./model');
var Page = model.Page;
var PageVersion = model.PageVersion;
var User = model.User;

var options = require('./options-handler').options;
var livedbmongo = require('livedb-mongo');
var database = livedbmongo(options['database']['uri']);

var backend = livedb.client(database);

var LiveSync = require('./livesync');
LiveSync.init(backend.driver, database);

var pageConnectionMap = {};

exports.init = function(app) {
  var share = sharejs.server.createClient({
    backend: backend
  });
  app.use(express.static(sharejs.scriptsDir));
  app.use(browserChannel({
    webserver: app,
    sessionTimeoutInterval: 60*1000 // 60 second timeout
  }, function(client) {
    var stream;
    var document = null;
    log.debug("New Client Connected");
    stream = new Duplex({
      objectMode: true
    });
    stream._write = function(chunk, encoding, callback) {
      log.debug('s->c ', JSON.stringify(chunk));
      if (client.state !== 'closed') {
        client.send(chunk);
      } else {
        log.debug("CLIENT IS CLOSED");
      }
      return callback();
    };
    stream._read = function() {};
    stream.headers = client.headers;
    stream.remoteAddress = stream.address;
    client.on('message', function(data) {
      log.debug('c->s ', JSON.stringify(data));
      if (data['a']=='sub') {
        // User is subscribing to a new document
        log.debug("Got new sub");
        document = data['d'];

        pageConnectionMap[document] = pageConnectionMap[document] ?
          pageConnectionMap[document]+1 :
          1;
        log.info(pageConnectionMap[document] + " CLIENTS CONNECTED TO " + document);
      }
      if (data['a']=='bs') {
        var collectionDocumentVersionMap = data['s'];
        var numCollections = Object.keys(collectionDocumentVersionMap).length;
        if (numCollections != 1) {
          log.error({message:"Zero or more than one collection not expected",value:numCollections});
          throw new Error("Zero or more than one collection not expected: " + numCollections);
        }
        var cName = Object.keys(collectionDocumentVersionMap)[0];
        var numDocuments = Object.keys(collectionDocumentVersionMap[cName]).length;
        if (numDocuments != 1) {
          log.error({message:"Zero or more than one document not expected",value:numDocuments});
          throw new Error("Zero or more than one document not expected: " + numDocuments);
        }
        var docName = Object.keys(collectionDocumentVersionMap[cName])[0];
        document = docName;
        pageConnectionMap[document] = pageConnectionMap[document] ?
          pageConnectionMap[document]+1 :
          1;
        log.info(pageConnectionMap[document] + " CLIENTS CONNECTED TO " + document);
      }
      stream.push(data);
    });
    stream.on('error', function(msg) {
      log.info("GOT CLIENT ERROR: " + msg);
      return client.stop();
    });
    client.on('close', function(reason) {
      stream.push(null);
      stream.emit('close');
      return log.debug('client went away');
    });
    stream.on('end', function() {
      log.debug("CLIENT END");
      pageConnectionMap[document]--;
      log.info(pageConnectionMap[document] + " CLIENTS ARE CONNECTED TO " + document + "\n");
      if (pageConnectionMap[document]<=0) {
        delete pageConnectionMap[document];
        LiveSync.sync(document, function(){
        });
      }
      return client.close();
    });
    return share.listen(stream);
  }));

  app.use('/doc', share.rest());
};

exports.syncAll = function(callback) {
  // TODO: Gracefully kill connections with clients
  async.map(Object.keys(pageConnectionMap), function(docName, innerCallback) {
    log.warn("SHUTDOWN: Found document "+docName+" in edit mode.  Saving snapshot to DB");
    LiveSync.sync(docName, innerCallback);
  }, function(err, result) {
    callback(err);
  });
};
