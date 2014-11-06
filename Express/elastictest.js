var elasticsearch = require('elasticsearch');
var client = new elasticsearch.Client({
  host: 'localhost:9200',
  log: 'trace'
});

client.ping({
  requestTimeout: 1000,
  // undocumented params are appended to the query string
  hello: "elasticsearch!"
}, function (error) {
  if (error) {
    console.error('elasticsearch cluster is down!');
  } else {
    console.log('All is well');
  }
});

client.search({
  index: 'tidalwave.users',
  body: {
    from:0,
    size:5,
    query: {
      filtered: {
        filter: {
          term: {
            loggedIn: "false"
          }
        },
        query: {
          match_phrase_prefix: {        
            fullName: {
              query:'"jason gauc"',
              prefix_length:3,
              max_expansions : 100000
            }
          }
        }
      }
    }
  }
}).then(function (body) {
  var hits = body.hits.hits;
  console.log(hits);
}, function (error) {
  console.trace(error.message);
});
