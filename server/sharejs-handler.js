var Duplex = require('stream').Duplex;
var browserChannel = require('browserchannel').server;
var livedb = require('livedb');
var sharejs = require('share');
var express = require('express');
var log = require('./logger').log;

var model = require('./model');
var Page = model.Page;
var PageVersion = model.PageVersion;
var User = model.User;

var database = livedb.memory();
var backend = livedb.client(database);

var LiveSync = require('./livesync');
LiveSync.init(backend.driver, database);

var pageConnectionMap = {};

exports.init = function(app) {
  backend.addProjection('_users', 'users', 'json0', {
    x: true
  });
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

        pageConnectionMap[data['d']] = pageConnectionMap[data['d']] ?
          pageConnectionMap[data['d']]+1 :
          1;
        log.info(pageConnectionMap[data['d']] + " CLIENTS CONNECTED TO " + data['d']);
        
        if (!database.collections[data['c']] ||
            !database.collections[data['c']][data['d']]) {
          // Document does not exist
          log.debug("New document");

          Page.findOne({_id:data['d']},function(err,page){
            if (page) {
              log.debug("Fetch page from DB");
              // Inject document from database
              database.writeSnapshot(data['c'],data['d'],{
                v:0,
                type:'http://sharejs.org/types/textv1',
                data:page.content
              }, function(err){});
            }
            return stream.push(data);
          });
          return true;
        } else {
          return stream.push(data);
        }
      } else {
        return stream.push(data);
      }
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
        LiveSync.syncAndRemove(document, function(){
        });
      }
      return client.close();
    });
    return share.listen(stream);
  }));

  app.use('/doc', share.rest());
};
