var request = require('request');

request.post(
    'http://localhost:9200/tidalwave.pages',
    { form: 
      {
        "mappings": {
          "string":{
            "properties":{
              "parentId":{
                "type":"string", "index":"not_analyzed"},
              "userPermissions":{
                "type":"string", "index":"not_analyzed"},
              "groupPermissions":{
                "type":"string", "index":"not_analyzed"},
              "derivedUserPermissions":{
                "type":"string", "index":"not_analyzed"},
              "derivedGroupPermissions":{
                "type":"string", "index":"not_analyzed"}
            }
          }}}},
    function (error, response, body) {
        if (!error && response.statusCode == 200) {
            console.log(body);
        }
    }
);

request.post(
    'http://localhost:9200/tidalwave.pageversions',
    { form: 
      {
        "mappings": {
          "string":{
            "properties":{
              "pageId":{
                "type":"string", "index":"not_analyzed"},
              "editorIds":{
                "type":"string", "index":"not_analyzed"}
            }
          }}}},
    function (error, response, body) {
        if (!error && response.statusCode == 200) {
            console.log(body);
        }
    }
);

request.post(
    'http://localhost:9200/tidalwave.users',
    { form: 
      {
        "mappings": {
          "string":{
            "properties":{
              "groups":{
                "type":"string", "index":"not_analyzed"},
              "watchedPageIds":{
                "type":"string", "index":"not_analyzed"}
            }
          }}}},
    function (error, response, body) {
        if (!error && response.statusCode == 200) {
            console.log(body);
        }
    }
);
