app.service('pageStateService', ['$rootScope', '$http', function($rootScope, $http) {
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
        $http.post('/service/updateMe', state[key])
          .success(function(data, status, headers, config) {
            //TODO: Say success
          })
          .error(function(data, status, headers, config) {
            //TODO: Alert with an error
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
