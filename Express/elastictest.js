var elasticsearch = require('elasticsearch');
var client = new elasticsearch.Client({
  host: 'localhost:9200',
  log: 'warning'
});

client.search({
  index: 'tidalwave.pages',
  body: {
    from:0,
    size:5,
    query: {
      filtered: {
        filter: {
          or: [{
            terms: {
              userPermissions: ["jgauci","lahjsdlaj"]
            }},{
            terms: {
              groupPermissions: ["aasdasd", "kjashdkjah"]
            }}]
        },
        query: {
          match_phrase_prefix: {        
            content: "t"
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
