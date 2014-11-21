var elasticsearch = require('elasticsearch');
var client = new elasticsearch.Client({
  host: 'localhost:9200',
  log: 'warning'
});

client.search({
  index: 'tidalwave.users',
  body: {
    from:0,
    size:5,
    query: {
      filtered: {
        filter: {
          not: {
            filter: {
              term: {
                lastLoginTime: "none"
              }
            }
          }
        },
        query: {
          match_phrase_prefix: {        
            username: {
              query:'jgauci',
              prefix_length:3,
              max_expansions : 1024
            }
          }
        }
      }
    }
  }
}).then(function (body) {
  var hits = body.hits.hits;
  console.log(hits);
  var results = [];
  for (var i=0;i<hits.length;i++) {
    var result = hits[i]._source;
    result._id = hits[i]._id;
    results.push(result);
  }
}, function (error) {
  console.log(error.message);
});

client.search({
  index: 'tidalwave.pages',
  body: {
    from:0,
    size:5,
    query: {
      filtered: {
        filter: {
          terms: {
            userPermissions: ["jgmath2000@gmail.com"]
          }
        },
        query: {
          match_phrase_prefix: {        
            content: "w"
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
