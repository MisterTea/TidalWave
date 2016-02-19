var app = require('./app').app;

app.service('pageStateService', ['$rootScope', 'retryHttp', function($rootScope, retryHttp) {
    var state = {
      settingsActive:false,
      editMode:false,
      pageDetails:null,
      searchContentResults:null,
      query:null,
      user:null,
      history:null,
      diff:null,
      pageMode:null
    };
    var get = function(key){
      return state[key];
    };
    var set = function(key,value) {
      console.log("SETTING " + key + " " + JSON.stringify(value));
      state[key] = value;
      $rootScope.$broadcast('pageStateServiceUpdate', {key:key,value:value});
    };
    var push = function(key) {
      if (key == 'user') {
        // Push the new user
        retryHttp.post(
          'service/updateMe',
          state[key],
          function(data, status, headers, config) {
            //TODO: Say success
          });
      }
    };
    var setAndPush = function(key,value) {
      set(key,value);
      push(key);
    };
    return {
      get:get,
      set:set,
      push:push,
      setAndPush:setAndPush
    };
}]);
