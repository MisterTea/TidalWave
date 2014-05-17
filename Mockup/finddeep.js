var findObjectDeep = function(jsonObj, key, value) {
  if (jsonObj instanceof Array) {
    var answer = null;
    $.each(jsonObj, function(k,v) {
      var tmp = findObjectDeep(v, key, value);
      if (tmp) {
        answer = tmp;

        // short circuit
        return false;
      }

      return true;
    });
    if (answer) {
      return answer;
    }
  }

  if( typeof jsonObj == "object" ) {
    var answer = null;
    $.each(jsonObj, function(k,v) {
      if (k == key && v == value) {
        answer = jsonObj;
        return false;
      }
      var tmp = findObjectDeep(v, key, value);
      if (tmp) {
        answer = tmp;
        return false;
      }
      return true;
    });
    if (answer) {
      return answer;
    }
  }
  else {
    // jsonObj is a number or string
  }

  return null;
};
