var socket = null;
var connection = null;
var doc = null;
var editor = null;

testEditor = function(testString) {
  setTimeout(function() {
    console.log("BEGIN INJECT\n");
    if (!editor.getReadOnly()) {
      var r = Math.random();
      if (r<.5) {
        editor.removeToLineStart();
      } else {
        editor.insert(testString);
      }
    } else {
      console.log("EDITOR IS READONLY\n");
    }
    console.log("END INJECT\n");
    testEditor(testString);
  }, 10);
};

// Helper function to resize the ace editor as the window size changes.
function resizeAce() {
  if($('#editor').is(":visible")) {
    $('#editor').height($(window).height() - 130);
    $('#content').height($(window).height() - 130);
    $('#content').css("overflow-y","scroll");
    editor.resize(true);
  } else {
    $('#content').css("height", "auto");
    $('#content').css("overflow-y","visible");
  }
};
//listen for changes
$(window).resize(resizeAce);

var enableEditMode = function(pageStateService, $http, $timeout) {
  console.log("Enabling edit mode");
  //$("#editor").show();
  //$("#PageMenuController").hide();
  console.log($("#editor")[0]);
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
          $http.post('/service/saveImage', {mime:mime,base64:data,pageId:pageDetails.page._id,name:file.name})
            .success(function(filename, status, headers, config) {
              console.log("INJECTING IMAGE");
              editor.insert("<img src=\"/service/getImage/"+filename+"\"></img>");
              //TODO: Say success
            })
            .error(function(data, status, headers, config) {
              //TODO: Alert with an error
            });
        } else {
          // Regular attachment
          $http.post('/service/saveFile', {mime:mime,base64:data,pageId:pageDetails.page._id,name:file.name})
            .success(function(filename, status, headers, config) {
              console.log("INJECTING FILE");
              editor.insert("<a href=\"/service/getFile/"+filename+"\" target=\"_blank\">Download "+file.name+"</a>");
              //TODO: Say success
            })
            .error(function(data, status, headers, config) {
              //TODO: Alert with an error
            });
        }
      };
      fr.readAsDataURL(file.nativeFile);
    });
  });
  editor = ace.edit("editor");
  $timeout(function() {
    resizeAce();
  },1);
  editor.setReadOnly(true);
  editor.setValue("Loading...");
  editor.getSession().setUseWrapMode(true); // lines should wrap
  //editor.setTheme("ace/theme/monokai");
  editor.getSession().setMode("ace/mode/markdown");

  socket = new BCSocket(null, {reconnect: true});
  connection = new window.sharejs.Connection(socket);

  var pageDetails = pageStateService.get('pageDetails');
  console.log("SUBSCRIBING TO " + pageDetails.page._id);
  doc = connection.get('users', pageDetails.page._id);
  doc.subscribe();

  doc.whenReady(function () {
    console.log("SHAREJS IS READY");
    editor.setReadOnly(false);
    console.log(doc);
    if (!doc.type) doc.create('text');
    if (doc.type && doc.type.name === 'text') {
      doc.attachAce(editor, false, function(change) {
        $("#content-markdown").empty();
        var markdownText = marked(editor.getSession().getDocument().getValue());
        $("#content-markdown").append($.parseHTML(markdownText));
      });
      editor.focus();
    }
  });
};

var preprocessDiff = function(allDiffs) {
  var sourceLines = [{text:'',style:'equal'}];
  var destLines = [{text:'',style:'equal'}];

  for (var i=0;i<allDiffs.length;i++) {
    var diff = allDiffs[i];

    if (diff[0] == 0) {
      // Add to both
      var tokens = diff[1].split("\n");

      var styleToSet = 'equal';
      if (sourceLines[sourceLines.length-1].style!='equal') {
        styleToSet = 'difference';
      }

      sourceLines[sourceLines.length-1] = {
        text:sourceLines[sourceLines.length-1].text.concat(tokens[0]),
        style:styleToSet
      };
      destLines[destLines.length-1] = {
        text:destLines[destLines.length-1].text.concat(tokens[0]),
        style:styleToSet
      };

      for (var j=1;j<tokens.length;j++) {
        sourceLines.push({
          text:tokens[j],
          style:'equal'});
        destLines.push({
          text:tokens[j],
          style:'equal'});
      }
    } else {
      var bufferWithAdds = null;
      var otherBuffer = null;

      if (diff[0]==-1) {
        bufferWithAdds = sourceLines;
        otherBuffer = destLines;
      } else {
        bufferWithAdds = destLines;
        otherBuffer = sourceLines;
      }

      // add to source
      var tokens = diff[1].split("\n");

      // Inline change, this is a difference
      if (tokens[0].length>0) {
        bufferWithAdds[bufferWithAdds.length-1] = {
          text:bufferWithAdds[bufferWithAdds.length-1].text
            .concat("<span style=\"color:red;\">"+tokens[0]+"</span>"),
          style:'difference'};
        otherBuffer[otherBuffer.length-1].style = 'difference';
      }

      if (tokens.length>1) {
        // The remaining lines should be added as new lines
        for (var j=1;j<tokens.length;j++) {
          var t = tokens[j];
          if (t.length==0) {
            t = '&nbsp;';
          }
          bufferWithAdds.push({
            text:"<span style=\"color:red;\">"+t+"</span>",
            style:'difference'});
          otherBuffer.push({
            text:'',
            style:'difference'});
        }
      }
    }
  }

  // Cleanup: set add/remove and put spaces
  for (var i=0;i<sourceLines.length;i++) {
    if (sourceLines[i].text.length==0 && destLines[i].text.length>0) {
      sourceLines[i].style = 'remove';
      destLines[i].style = 'add';
    }
    if (sourceLines[i].text.length>0 && destLines[i].text.length==0) {
      sourceLines[i].style = 'add';
      destLines[i].style = 'remove';
    }
    if (sourceLines[i].text.length==0) {
      sourceLines[i].text = ' ';
    }
    if (destLines[i].text.length==0) {
      destLines[i].text = ' ';
    }
  }

  // Add line numbers
  for (var i=0;i<sourceLines.length;i++) {
    sourceLines[i].lineNumber = i+1;
  }
  for (var i=0;i<destLines.length;i++) {
    destLines[i].lineNumber = i+1;
  }

  return [sourceLines,destLines];
};

var parentList = null;
var userPermissionList = null;
var groupPermissionList = null;

var convertToNav = function(hierarchy, callback) {
  var retval = {"label":hierarchy.name,"id":hierarchy.id,"children":[],"fqn":hierarchy.fqn};
  for (var i=0;i<hierarchy.children.length;i++) {
    retval.children.push(convertToNav(hierarchy.children[i]));
  }
  return retval;
};

var getPageFQN = function() {
  if (window.location.pathname=='/view' || window.location.pathname=='/view/') {
    return null;
  }
  return decodeURI(window.location.pathname.substring('/view/'.length));
};

var changePage = function($http,fqn,pageStateService,callback) {
  if (fqn == getPageFQN()) {
    return;
  }
  window.location = '/view/'+fqn;
};

var getParameterByName = function(name) {
    var match = RegExp('[?&]' + name + '=([^&]*)').exec(window.location.search);
    return match && decodeURIComponent(match[1].replace(/\+/g, ' '));
};

app = angular.module('TidalWavePage', ['angularBootstrapNavTree', 'ngErrorShipper', 'ui.bootstrap']);

