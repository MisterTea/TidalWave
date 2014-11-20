function logError(details) {
  $.ajax({
    type: 'POST',
    url: '/service/jserror',
    data: JSON.stringify(details),
    contentType: 'application/json; charset=utf-8'
  });
}

window.onerror = function (errorMsg, url, lineNumber, column, errorObj) {
  logError({
    exception:errorMsg,
    context:navigator.userAgent,
    stack:errorObj,
    location : window.location,
    performance : window.performance
  });
};
