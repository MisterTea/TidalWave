/// <reference path='../typings/node/node.d.ts' />
/// <reference path='../typings/mongodb/mongodb.d.ts' />
/// <reference path='../typings/express/express.d.ts' />

var elasticsearch = require('elasticsearch');

import log = require('./logger');
import options = require('./options-handler');

export var client = null;

if (options["elasticsearch"]["enable"]) {
  var newClient = new elasticsearch.Client({
    host: options["elasticsearch"]["host"],
    log: options["elasticsearch"]["loglevel"]
  });

  client.cluster.health(function (err, resp) {
    if (err) {
      // Log and disable ElasticSearch
      log.warn({error:err});
      client = null;
    } else {
      log.info("ElasticSearch client found");
      client = newClient;
    }
  });
}
