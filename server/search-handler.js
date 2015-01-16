var elasticsearch = require('elasticsearch');
var log = require('./logger').log;

var options = require('./options-handler').options;

if (options["elasticsearch"]["enable"]) {
  var client = new elasticsearch.Client({
    host: options["elasticsearch"]["host"],
    log: options["elasticsearch"]["loglevel"]
  });

  client.cluster.health(function (err, resp) {
    if (err) {
      // Log and disable ElasticSearch
      log.warn({error:err});
      exports.client = null;
    } else {
      log.info("ElasticSearch client found");
      exports.client = client;
    }
  });
} else {
  exports.client = null;
}
