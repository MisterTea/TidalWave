var Duplex = require('stream').Duplex;
var browserChannel = require('browserchannel').server;
var livedb = require('livedb');
var sharejs = require('share');
var database = livedb.memory();
var backend = livedb.client(database);
var express = require('express');

var model = require('./model');
var Page = model.Page;
var PageVersion = model.PageVersion;
var User = model.User;

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
    console.log("New Client Connected");
    stream = new Duplex({
      objectMode: true
    });
    stream._write = function(chunk, encoding, callback) {
      console.log('s->c ', JSON.stringify(chunk));
      if (client.state !== 'closed') {
        client.send(chunk);
      } else {
        console.log("CLIENT IS CLOSED");
      }
      return callback();
    };
    stream._read = function() {};
    stream.headers = client.headers;
    stream.remoteAddress = stream.address;
    client.on('message', function(data) {
      console.log('c->s ', JSON.stringify(data));
      if (data['a']=='sub') {
        // User is subscribing to a new document
        console.log("Got new sub");
        document = data['d'];
        if (!database.collections[data['c']] ||
            !database.collections[data['c']][data['d']]) {
          // Document does not exist
          console.log("New document");

          pageConnectionMap[data['d']] = pageConnectionMap[data['d']] ?
            pageConnectionMap[data['d']]+1 :
            1;

          Page.findOne({_id:data['d']},function(err,page){
            if (page) {
              console.log("Fetch page from DB");
              console.log(page);
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
      console.log("GOT CLIENT ERROR");
      return client.stop();
    });
    client.on('close', function(reason) {
      stream.push(null);
      stream.emit('close');
      return console.log('client went away');
    });
    stream.on('end', function() {
      console.log("CLIENT END");
      pageConnectionMap[document]--;
      if (pageConnectionMap[document]==0) {
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
