app.factory('$exceptionHandler', function($log) {
    return function(exception, cause) {
      console.log("GOT EXCEPTION");
      $log.error(exception);

      var output = {};
      if (cause) {
        output.cause = cause;
      } else {
        output.cause = null;
      }
      output.message = exception.message;
      output.context = navigator.userAgent,
      output.stack = exception.stack;
      output.location = window.location;
      output.performance = window.performance;

      $.ajax({
        type: 'POST',
        url: "/service/angularerror",
        data:JSON.stringify(output),
        contentType: "application/json; charset=utf-8",
        success:function(data, textStatus, jqXHR) {
          console.log("Error has been reported successfully");
        },
        error:function(jqXHR, textStatus, errorThrown) {
          console.log("Error reporting error: " + errorThrown);
        }});
    };
});

