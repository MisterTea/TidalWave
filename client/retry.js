var app = require('./app').app;
var logError = require('./errorlogging').logError;
var printStackTrace = require('stacktrace-js');

app.service('retryHttp',['$http','$timeout','alertService',function(
  $http,$timeout,alertService) {

  var backoff = function(delayBeforeRetry) {
    // Exponential backoff
    if (!delayBeforeRetry) {
      delayBeforeRetry = 3000;
      alertService.pushAlert('warning','Could not reach server.  Retrying in 3s...',delayBeforeRetry);
    } else if(delayBeforeRetry == 3000) {
      delayBeforeRetry = 15000;
      alertService.pushAlert('warning','Could not reach server.  Retrying in 15s...',delayBeforeRetry);
    } else if(delayBeforeRetry == 15000) {
      delayBeforeRetry = 60000;
      alertService.pushAlert('danger','Still can\'t reach server.  Try <a href="#" onclick="location.reload();">reloading the page</a>.',delayBeforeRetry);
    } else {
      delayBeforeRetry = (delayBeforeRetry*2)/3;
      if (delayBeforeRetry <= 15000) {
        alertService.pushAlert('warning','Could not reach server.  Retrying in '+~~(delayBeforeRetry/1000)+'s...',delayBeforeRetry);
      } else {
        alertService.pushAlert('danger','Still can\'t reach server.  Try <a href="#" onclick="location.reload();">reloading the page</a>.',delayBeforeRetry);
      }
    }

    return delayBeforeRetry;
  };

  var get = function(url, callback, errorCallback, delayBeforeRetry) {
    $http.get(url)
      .success(function(data, status, headers, config) {
        callback(data,status,headers,config);
      })
      .error(function(data, status, headers, config) {
        if (data.ret_code != 408) {
          if (errorCallback) {
            errorCallback(data, status, headers, config);
          } else {
            // Not a timeout, bail.
            logError({
              message:headers,
              cause:status,
              context:navigator.userAgent,
              stack:printStackTrace(),
              location:window.location,
              performance:window.performance
            });
          }
          return;
        }

        delayBeforeRetry = backoff(delayBeforeRetry);

        $timeout(function() {
          get(url, callback, errorCallback, delayBeforeRetry);
        }, delayBeforeRetry);
      });
  };
  var post = function(url, form, callback, errorCallback, delayBeforeRetry) {
    $http.post(url,form)
      .success(function(data, status, headers, config) {
        callback(data,status,headers,config);
      })
      .error(function(data, status, headers, config) {
        if (status != 0) {
          // Not a timeout, bail.
          if (errorCallback) {
            errorCallback(data, status, headers, config);
          } else {
            logError({
              message:headers,
              cause:status,
              context:navigator.userAgent,
              stack:printStackTrace(),
              location:window.location,
              performance:window.performance
            });
          }
          return;
        }

        delayBeforeRetry = backoff(delayBeforeRetry);

        $timeout(function() {
          post(url, form, callback, errorCallback, delayBeforeRetry);
        }, delayBeforeRetry);
      });
  };
  return {
    get:get,
    post:post
  };
}]);
