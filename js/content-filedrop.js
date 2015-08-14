var alreadyRan = false;

// NOTE: This require puts FileDrop in the window (global) namespace
require('filedrop');
var FileDrop = window.FileDrop;

exports.setupFiledrop = function(retryHttp, pageStateService) {
  if (alreadyRan) {
    console.log("ERROR!  TRIED TO SET UP FILEDROP 2x");
  } else {
    alreadyRan = true;
  }

  // Tell FileDrop we can deal with iframe uploads using this URL:
  var options = {input:false};

  // Attach FileDrop to an area
  var zone = new FileDrop('editor', options);

  // Do something when a user chooses or drops a file:
  zone.event('send', function (files) {
    // Depending on browser support files (FileList) might contain multiple items.
    files.each(function (file) {
      console.log(file);
      //alert(file.name + ' ' + file.type + ' (' + file.size + ') bytes');
      var fr = new FileReader();

      // For some reason onload is being called 2x.
      var called=false;
      fr.onload = function(e) {
        if (called) return;
        called = true;
        var pageDetails = pageStateService.get('pageDetails');
        var mime = e.target.result.split(',')[0].substring(5);
        var data = e.target.result.split(',')[1];
        if(file.type.match(/image.*/)){
          retryHttp.post(
            '/service/saveImage',
            {mime:mime,base64:data,pageId:pageDetails.page._id,name:file.name},
            function(filename, status, headers, config) {
              //console.log("INJECTING IMAGE");
              var editor = require('./content').editor;
              editor.insert("<img src=\"/service/getImage/"+filename+"\"></img>");
            });
        } else {
          // Regular attachment
          retryHttp.post(
            '/service/saveFile',
            {mime:mime,base64:data,pageId:pageDetails.page._id,name:file.name},
            function(filename, status, headers, config) {
              //console.log("INJECTING FILE");
              var editor = require('./content').editor;
              editor.insert("<a href=\"/service/getFile/"+filename+"\" target=\"_blank\">Download "+file.name+"</a>");
            });
        }
      };
      fr.readAsDataURL(file.nativeFile);
    });
  });
};
