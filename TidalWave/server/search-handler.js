var elasticsearch = require('elasticsearch');
var log = require('./logger').log;
var client = new elasticsearch.Client({
  host: 'localhost:9200',
  log: 'warning'
});

client.cluster.health(function (err, resp) {
  if (err) {
    log.error({error:err});
    exports.client = null;
  } else {
    log.info("ElasticSearch client found");
    exports.client = client;
  }
});

