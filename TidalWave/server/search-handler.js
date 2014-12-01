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
    exports.client = client;
  }
});

