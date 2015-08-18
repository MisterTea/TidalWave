var ErrorLogging = require('./errorlogging');
var ace = require('brace');
require('brace/mode/markdown');

var $ = require('jquery');
var app = require('./app').app;
var preprocessDiff = require('./app').preprocessDiff;

require('selectize');
var Filedrop = require('./filedrop');
var changePage = require('./app').changePage;

var marked = exports.marked = require('marked');
var hljs = require('highlightjs/highlight.pack');
hljs.initHighlightingOnLoad();
// Synchronous highlighting with highlight.js
marked.setOptions({
  highlight: function (code) {
    return hljs.highlightAuto(code).value;
  }
});

var BCSocket = require('browserchannel/dist/bcsocket-uncompressed').BCSocket;
var sharejs = require('../node_modules/share/lib/client');
var moment = require('moment');
var diff_match_patch = require('diff-match-patch');
var tours = require('./tours');

var Range, applyToShareJS, requireImpl;

requireImpl = ace.require != null ? ace.require : require;

Range = window.ace.acequire("ace/range").Range;

applyToShareJS = function(editorDoc, delta, ctx) {
  var getStartOffsetPosition, pos, text;
  getStartOffsetPosition = function(range) {
    var i, line, lines, offset, _i, _len;
    lines = editorDoc.getLines(0, range.start.row);
    offset = 0;
    for (i = _i = 0, _len = lines.length; _i < _len; i = ++_i) {
      line = lines[i];
      offset += i < range.start.row ? line.length : range.start.column;
    }
    return offset + range.start.row;
  };
  pos = getStartOffsetPosition(delta.range);
  switch (delta.action) {
  case 'insertText':
    ctx.insert(pos, delta.text);
    break;
  case 'removeText':
    ctx.remove(pos, delta.text.length);
    break;
  case 'insertLines':
    text = delta.lines.join('\n') + '\n';
    ctx.insert(pos, text);
    break;
  case 'removeLines':
    text = delta.lines.join('\n') + '\n';
    ctx.remove(pos, text.length);
    break;
  default:
    throw new Error("unknown action: " + delta.action);
  }
};

sharejs.Doc.prototype.attachAce = function(editor, keepEditorContents, editorListenerCallback) {
  var check, deleteListener, editorDoc, editorListener, insertListener, offsetToPos, refreshListener, replaceTokenizer, suppress;
  var ctx = this.createContext();

  if (!ctx.provides.text) {
    throw new Error('Only text documents can be attached to ace');
  }
  editorDoc = editor.getSession().getDocument();
  editorDoc.setNewLineMode('unix');
  check = function(callback) {
    return window.setTimeout(function() {
      var editorText, otText;
      editorText = editorDoc.getValue();
      otText = ctx.get();
      if (editorText !== otText) {
        console.error("Text does not match!");
        console.error("editor: " + editorText);
        console.error("ot:     " + otText);
      } else {
        callback();
      }
    }, 0);
  };
  if (keepEditorContents) {
    ctx.remove(0, ctx.get().length);
    ctx.insert(0, editorDoc.getValue());
  } else {
    editor.session.setValue(ctx.get());
    if(editorListenerCallback) {
      editorListenerCallback(ctx.get());
    }
  }
  check(function() {});
  suppress = false;
  editorListener = function(change) {
    if (suppress) {
      return null;
    }
    editor.setReadOnly(true);
    applyToShareJS(editorDoc, change.data, ctx);
    if(editorListenerCallback) {
      editorListenerCallback(change);
    }
    return check(function() { editor.setReadOnly(false); });
  };
  editorDoc.on('change', editorListener);
  offsetToPos = function(offset) {
    var line, lines, row, _i, _len;
    lines = editorDoc.getAllLines();
    row = 0;
    for (row = _i = 0, _len = lines.length; _i < _len; row = ++_i) {
      line = lines[row];
      if (offset <= line.length) {
        break;
      }
      offset -= lines[row].length + 1;
    }
    return {
      row: row,
      column: offset
    };
  };
  ctx.onInsert = function(pos, text) {
    suppress = true;
    editor.setReadOnly(true);
    editorDoc.insert(offsetToPos(pos), text);
    if(editorListenerCallback) {
      editorListenerCallback(null);
    }
    suppress = false;
    return check(function() { editor.setReadOnly(false); });
  };
  ctx.onRemove = function(pos, length) {
    var range;
    suppress = true;
    editor.setReadOnly(true);
    range = Range.fromPoints(offsetToPos(pos), offsetToPos(pos + length));
    editorDoc.remove(range);
    if(editorListenerCallback) {
      editorListenerCallback(null);
    }
    suppress = false;
    return check(function() { editor.setReadOnly(false); });
  };
  this.detachAce = function() {
    editorDoc.removeListener('change', editorListener);
  };
};

var socket = null;
var connection = null;
var doc = null;
var editor = exports.editor = null;
var parentList = null;
var userPermissionList = null;
var groupPermissionList = null;

var getParameterByName = function(name) {
    var match = RegExp('[?&]' + name + '=([^&]*)').exec(window.location.search);
    return match && decodeURIComponent(match[1].replace(/\+/g, ' '));
};

// Helper function to resize the ace editor as the window size changes.
function resizeAce() {
  if(editor) {
    $('#editor').height($(window).height() - 130);
    $('#content').height($(window).height() - 130);
    $('#content').css("overflow-y","scroll");
    editor.resize(true);
  } else {
    $('#content').css("height", "auto");
    $('#content').css("overflow-y","visible");
  }
};
//listen for changes to the window size and update the ace editor size.
$(window).resize(resizeAce);

var nextDocumentChangeTime = 0;

var lang = "en_US";
var dicPath = "/dictionaries/en_US/en_US.dic";
var affPath = "/dictionaries/en_US/en_US.aff";

// Make red underline for gutter and words.
$("<style type='text/css'>.ace_marker-layer .misspelled { position: absolute; z-index: -2; border-bottom: 1px solid red; margin-bottom: -1px; }</style>").appendTo("head");
$("<style type='text/css'>.misspelled { border-bottom: 1px solid red; }</style>").appendTo("head");

var Typo = require('./typo');

// Load the dictionary.
// We have to load the dictionary files sequentially to ensure
var dictionary = null;
var dicData = null;
var affData = null;
$.get(dicPath, function(data) {
  dicData = data;
}).done(function() {
  $.get(affPath, function(data) {
    affData = data;
  }).done(function() {
    console.log("Dictionary loaded");
    dictionary = new Typo(lang, affData, dicData);
  });
});

// Check the spelling of a line, and return [start, end]-pairs for misspelled words.
function misspelled(line) {
  var words = line.split(/[\- ]/);
  var i = 0;
  var bads = [];
  for (var word in words) {
    var x = words[word] + "";
    var checkWord = x.replace(/[^a-zA-Z']/g, '');
    if (!dictionary.check(checkWord)) {
      bads[bads.length] = [i, i + words[word].length];
    }
    i += words[word].length + 1;
  }
  return bads;
}

var contents_modified = true;

var currently_spellchecking = false;

var markers_present = [];

// Spell check the Ace editor contents.
function spell_check() {
  // Wait for the dictionary to be loaded.
  if (dictionary == null) {
    return;
  }

  if (currently_spellchecking) {
    return;
  }

  if (!contents_modified) {
    return;
  }
  currently_spellchecking = true;
  var session = ace.edit(editor).getSession();

  // Clear the markers.
  for (var i in markers_present) {
    session.removeMarker(markers_present[i]);
  }
  markers_present = [];

  try {
    var lines = session.getDocument().getAllLines();
    for (var i in lines) {
      // Clear the gutter.
      session.removeGutterDecoration(i, "misspelled");
      // Check spelling of this line.
      var misspellings = misspelled(lines[i]);

      // Add markers and gutter markings.
      if (misspellings.length > 0) {
        session.addGutterDecoration(i, "misspelled");
      }
      for (var j in misspellings) {
        var range = new Range(i, misspellings[j][0], i, misspellings[j][1]);
        markers_present[markers_present.length] = session.addMarker(range, "misspelled", "typo", true);
      }
    }
  } finally {
    currently_spellchecking = false;
    contents_modified = false;
  }
}

var enableEditMode = function(pageStateService, $timeout) {
  console.log("Enabling edit mode");

  editor = exports.editor = ace.edit("editor");
  $timeout(function() {
    resizeAce();
  },1);
  editor.setReadOnly(true);
  editor.session.setValue("Loading...");
  editor.getSession().setUseWrapMode(true); // lines should wrap
  //editor.setTheme("ace/theme/monokai");
  editor.getSession().setMode("ace/mode/markdown");
  editor.getSession().on('change', function(e) {
    contents_modified = true;
    setInterval(spell_check, 500);
  });

  socket = new BCSocket(null, {reconnect: true});
  connection = new sharejs.Connection(socket);
  //connection.debug = true;
  /*
  connection.on('error', function(e) {
    console.log("GOT CONNECTION ERROR");
    console.dir(e);
  });
  connection.on('connecting', function() {
    console.log("GOT CONNECTING");
  });
  connection.on('connected', function() {
    console.log("GOT CONNECTED");
  });
  connection.on('disconnected', function() {
    console.log("GOT DISCONNECTED");
  });
   */
  connection.on('stopped', function() {
    console.log("GOT STOPPED");
    ErrorLogging.logError({
      message:"Real-Time Server rejected client",
      cause:null,
      context:navigator.userAgent,
      stack:"",
      location : window.location,
      performance : window.performance
    });
  });

  var pageDetails = pageStateService.get('pageDetails');
  console.log("SUBSCRIBING TO " + pageDetails.page._id);
  doc = connection.get('sharejsdocuments', pageDetails.page._id);
  doc.subscribe();

  doc.whenReady(function () {
    console.log("SHAREJS IS READY");
    editor.setReadOnly(false);
    editor.setOption("spellcheck", true);
    console.log(doc);
    if (!doc.type) doc.create('text');
    if (doc.type && doc.type.name === 'text') {
      doc.on('closed', function() {
        console.log("DOCUMENT CLOSED");
        throw new Error("Document was closed remotely");
      });
      doc.attachAce(editor, false, function(change) {
        nextDocumentChangeTime = Date.now()+990;
        $timeout(function() {
          // When there are no future changes, update the document.
          if (nextDocumentChangeTime <= Date.now()) {
            $("#content-markdown").empty();
            var markdownText = marked(editor.getSession().getDocument().getValue());
            $("#content-markdown").append($.parseHTML(markdownText));
          }
        }, 1000);
      });
      editor.focus();
    }
  });
};

app.controller('PageContentController', ['$scope', 'retryHttp', '$timeout', '$sce', '$anchorScroll', '$location', 'pageStateService', function($scope, retryHttp, $timeout, $sce, $anchorScroll, $location, pageStateService) {
  $scope.query = null;
  $scope.editMode = false;
  $scope.pageMode = null;

  // Set up FileDrop once the controller is created.
  $timeout(function() {
    Filedrop.setupFiledrop(retryHttp, pageStateService);
  });

  // When angular scrolls, ensure that the header does not block the
  // top content.
  $anchorScroll.yOffset = 100;

  if (getParameterByName('tour')) {
    $timeout(function(){
      tours.createFirstViewTour();
    }, 100);
  }

  retryHttp.post(
    '/service/recentChangesVisible',
    null,
    function(data, status, headers, config) {
      // TODO: Implement this url
      $scope.recentChanges = [
      ];
    });

  // Start by fetching the current user
  retryHttp.post(
    '/service/me',
    null,
    function(data, status, headers, config) {
      if (data) {
        //TODO: Say success
        pageStateService.set('user',data);
      } else {
        console.log("NO USER FOUND.  ASSUMING ANONYMOUS");
      }

      // Then fetch the current page
      var pageName = $location.path();
      console.log("PAGE NAME: " + pageName);
      if (pageName && pageName.length>1) {
        changePage(retryHttp, $location, null, pageStateService, function() {
        });
      }
    });

  $scope.prettyDate = function(date) {
    var utcTime = new Date(date).getTime()/1000;
    return moment.unix(utcTime).format("dddd, MMMM Do YYYY, h:mm:ss a");
  };

  parentList = $('#select-parent').selectize({
    valueField: '_id',
    labelField: 'name',
    searchField: 'name',
    allowEmptyOption:true,
    create:false,
    persist: false,
    load: function(query, callback) {
      console.log("LOADING");
      if (!query.length) {
        callback();
        return;
      }
      $.ajax({
        url: '/service/pageStartsWith/' + encodeURIComponent(query),
        type: 'POST',
        error: function() {
          callback();
        },
        success: function(res) {
          for (var i=0;i<res.length;i++) {
            if (res[i]._id == pageStateService.get('pageDetails').page._id) {
              res.splice(i,1);
              break;
            }
          }
          callback(res);
        }
      });
    }
  })[0].selectize;

  userPermissionList = $('#userPermissionList').selectize({
    delimiter: ',',
    allowEmptyOption:true,
    create:false,
    valueField: '_id',
    labelField: 'fullName',
    searchField: 'fullName',
    load: function(query, callback) {
      console.log("LOADING");
      if (!query.length) {
        callback();
        return;
      }
      $.ajax({
        url: '/service/findUserFullName/' + encodeURIComponent(query),
        type: 'POST',
        error: function() {
          callback();
        },
        success: function(res) {
          console.log(res);
          callback(res);
        }
      });
    }
  })[0].selectize;

  groupPermissionList = $('#groupPermissionList').selectize({
    delimiter: ',',
    allowEmptyOption:true,
    create:false,
    valueField: '_id',
    labelField: 'name',
    searchField: 'name',
    load: function(query, callback) {
      console.log("LOADING");
      if (!query.length) {
        callback();
        return;
      }
      $.ajax({
        url: '/service/findGroupName/' + encodeURIComponent(query),
        type: 'POST',
        error: function() {
          callback();
        },
        success: function(res) {
          console.log(res);
          callback(res);
        }
      });
    }
  })[0].selectize;

  $scope.restorePageVersion = function(version) {
    var pageDetails = pageStateService.get('pageDetails');
    retryHttp.post(
      '/service/restorePageVersion',
      {
        _id:pageDetails.page._id,
        version:version
      },
      function(data, status, headers, config) {
        //TODO: Say success
      });
  };

  $scope.viewDiff = function(version) {
    var history = pageStateService.get('history');
    for (var i=0;i<history.length-1;i++) {
      var pageVersion = history[i];
      if (pageVersion.version == version) {
        var prevPageVersion = history[i+1];
        var dmp = new diff_match_patch();
        console.log(dmp);
        var diff = dmp.diff_main(prevPageVersion.content, pageVersion.content);
        dmp.diff_cleanupSemantic(diff);
        console.log(diff);
        var processedDiff = preprocessDiff(diff);
        console.log(processedDiff);
        pageStateService.set('diff',processedDiff);
      }
    }
  };

  $scope.updateSettings = function() {
    var pageDetails = pageStateService.get('pageDetails');
    var pageCopy = JSON.parse(JSON.stringify(pageDetails.page));

    console.log("NEW NAME: " + $scope.newName);
    var nameChanged = (pageCopy.name != $scope.newName);
    pageCopy.name = $scope.newName;

    var newParent = parentList.getValue();
    if (!newParent || newParent.length==0) {
      newParent = null;
    }
    console.log("NEW Parent: " + newParent);
    pageCopy.parentId = newParent;

    pageCopy.isPublic = $scope.isPublic;

    console.log(userPermissionList.getValue());
    console.log(groupPermissionList.getValue());

    console.log("PERMISSIONS");
    console.log(userPermissionList.getValue());
    if (userPermissionList.getValue().length>0) {
      pageCopy.userPermissions = userPermissionList.getValue().split(',');
    } else {
      pageCopy.userPermissions = [];
    }
    console.log(groupPermissionList.getValue());
    if (groupPermissionList.getValue().length>0) {
      pageCopy.groupPermissions = groupPermissionList.getValue().split(',');
    } else {
      pageCopy.groupPermissions = [];
    }

    console.log(pageCopy);
    retryHttp.post(
      '/service/updatePage',
      pageCopy,
      function(data, status, headers, config) {
        console.log("UPDATE PAGE RETURN VALUE");
        console.dir(data);
        if (data.page.fullyQualifiedName != pageDetails.page.fullyQualifiedName) {
          console.log("Name/parent changed, redirecting");
          //changePage(retryHttp,$location,data.page.fullyQualifiedName,pageStateService,null);

          // When this happens, do a complete refresh of the page
          window.location = '/view#/'+encodeURI(data.page.fullyQualifiedName);
          window.location.reload(true);
        } else {
          // Update page details
          pageStateService.set('pageDetails',data);
          // Close the settings menu
          pageStateService.set('settingsActive',false);
          // Wait a little and then make sure editor is the right size
          $timeout(function() {
            resizeAce();
          },1);
        }
      });
  };

  $scope.changePage = function(newPageFQN) {
    console.log("CHANGING PAGE: " + newPageFQN);
    changePage(retryHttp,$location,newPageFQN, pageStateService,null);
  };

  $scope.changePageAndClearSearch = function(newPageFQN) {
    pageStateService.set('query','');
    $scope.changePage(newPageFQN);
  };

  $scope.$on('pageStateServiceUpdate', function(event, response) {
    var key = response.key;
    var value = response.value;

    if (pageStateService.get('editMode') && pageStateService.get('searchContentResults')) {
      pageStateService.set('searchContentResults',null);
    }
    $scope.query = pageStateService.get('query');

    $scope.searchContentResults = pageStateService.get('searchContentResults');
    var pageDetails = pageStateService.get('pageDetails');
    var history = pageStateService.get('history');
    $scope.history = history;

    var diff = pageStateService.get('diff');
    if (diff) {
      $scope.diffSourceLines = [];
      $scope.diffDestLines = [];
      for (var a=0;a<diff[0].length;a++) {
        $scope.diffSourceLines.push({
          lineNumber:diff[0][a].lineNumber,
          style:diff[0][a].style,
          text:$sce.trustAsHtml(diff[0][a].text)});
      }
      for (var a=0;a<diff[1].length;a++) {
        $scope.diffDestLines.push({
          lineNumber:diff[1][a].lineNumber,
          style:diff[1][a].style,
          text:$sce.trustAsHtml(diff[1][a].text)});
      }
    } else {
      $scope.diffSourceLines = null;
      $scope.diffDestLines = null;
    }

    if($scope.searchContentResults) {
      $scope.pageMode = 'searchResults';
    } else if (!pageDetails) {
      $scope.pageMode = 'recentChanges';
    } else if($scope.diffSourceLines) {
      $scope.pageMode = 'diff';
    } else if(history) {
      $scope.pageMode = 'history';
    } else {
      $scope.pageMode = 'content';
    }
    if ($scope.pageMode != pageStateService.get('pageMode')) {
      pageStateService.set('pageMode',$scope.pageMode);
    }

    if (pageDetails) {
      $scope.page = pageDetails?pageDetails.page:null;
      $scope.newName = pageDetails.page.name;
      $scope.derivedUserPermissions = [];
      for (var a=0;a<pageDetails.derivedUserPermissions.length;a++) {
        $scope.derivedUserPermissions.push(pageDetails.derivedUserPermissions[a].fullName);
      }
      $scope.derivedGroupPermissions = [];
      for (var a=0;a<pageDetails.derivedGroupPermissions.length;a++) {
        $scope.derivedGroupPermissions.push(pageDetails.derivedGroupPermissions[a].name);
      }
      $scope.version = pageDetails?pageDetails.version:null;
      $scope.lastAncestorName = '';
      var ancestry = pageDetails.page.fullyQualifiedName.split('/');
      // Remove the page itself from the ancestry
      ancestry.pop();

      $scope.ancestry = [];
      var fqn='';
      for (var i=0;i<ancestry.length;i++) {
        fqn = fqn + ancestry[i];
        $scope.ancestry.push({fqn:fqn,name:ancestry[i]});
        fqn = fqn + '/';
      }
      console.log("ANCESTRY");
      console.dir($scope.ancestry);
      console.dir(pageDetails.page.fullyQualifiedName.split('/'));

      if ($scope.page) {
        $scope.isPublic = $scope.page.isPublic;
      }

      console.log(ancestry);
      if (ancestry && ancestry.length>0) {
        var parent = ancestry[ancestry.length-1];
        console.log("PARENT");
        console.log(parent);
        parentList.clearOptions();
        parentList.addOption({_id:pageDetails.page.parentId, name:parent});
        parentList.setValue(pageDetails.page.parentId);
      } else {
        parentList.clearOptions();
        parentList.setValue(null);
      }

      userPermissionList.clear();
      for (var i=0;i<pageDetails.userPermissions.length;i++) {
        var user = pageDetails.userPermissions[i];
        console.log("ADDING USER PERMISSION ");
        console.log(user);
        userPermissionList.addOption({_id:user._id, fullName:user.fullName});
        userPermissionList.addItem(user._id);
      }
      userPermissionList.refreshItems();

      groupPermissionList.clear();
      for (var i=0;i<pageDetails.groupPermissions.length;i++) {
        var group = pageDetails.groupPermissions[i];
        console.log("ADDING GROUP PERMISSION ");
        console.log(group);
        groupPermissionList.addOption({_id:group._id, name:group.name});
        groupPermissionList.addItem(group._id);
      }
      groupPermissionList.refreshItems();
    } else {
      if (pageStateService.get('editMode')) {
        pageStateService.set('editMode',false);
      }
    }

    if ($scope.editMode && !pageStateService.get('editMode')) {
    }
    if (!$scope.editMode && pageStateService.get('editMode')) {
      // Enter edit mode
      $scope.editMode = pageStateService.get('editMode');
      console.log("ENTERING EDIT MODE");
      enableEditMode(pageStateService,$timeout);
    }

    $scope.settingsActive = pageStateService.get('settingsActive');
    if ((key == 'user' || key == 'editMode' || key == 'pageDetails') && pageDetails && typeof pageDetails.page.content != undefined) {
      console.log("UPDATING MARKDOWN");
      console.log(pageDetails);
      console.log(key);
      if (pageDetails.viewable) {
        retryHttp.post(
          '/service/getTOC/'+pageDetails.page._id,
          null,
          function(data, status, headers, config) {
            $("#content-markdown").empty();
            var markdownText = null;
            if (data.length>0) {
              markdownText = marked("<div class=\"well well-lg\" style=\"display: inline-block;\"><h4>Table of Contents</h4>\n" + data.replace(/#/g,'#'+$location.path()+'#') + "\n</div><br />\n" + pageDetails.page.content);
            } else {
              markdownText = marked(pageDetails.page.content);
            }
            $("#content-markdown").append($.parseHTML(markdownText));
            $timeout(function(){
              $anchorScroll();
            }, 100);
          });
      } else {
        var user = pageStateService.get('user');
        if (user) {
          $("#content-markdown").empty();
          $("#content-markdown").append(marked("Sorry, you do not have access to this page."));
        } else {
          $("#content-markdown").empty();
          $("#content-markdown").append(marked("Sorry, you do not have access to this page.\n\nMaybe you need to [login](/login?redirect=/view#/"+pageDetails.page.fullyQualifiedName+")?"));
        }
      }
    }
  });

  $scope.$on('finishedEditMode', function(event, response) {
    // Leave edit mode
    console.log("LEAVING EDIT MODE");
    retryHttp.post(
      '/service/savePageDynamicContent/'+$scope.page._id,
      null,
      function(data, status, headers, config) {
        console.log("SAVED PAGE");
        retryHttp.post(
          '/service/pageDetailsByFQN'+$location.path(),
          null,
          function(data, status, headers, config) {
            console.log("GOT PAGE DETAILS FROM HTTP");
            console.log(data);
            pageStateService.set('pageDetails',data);
            editor = exports.editor = null;
            $timeout(function() {
              resizeAce();
              pageStateService.set('editMode', false);
              $scope.editMode = false;
            },1);
            if (doc) {
              doc.destroy();
              connection.disconnect();
              doc = socket = connection = null;
            }
            pageStateService.set('settingsActive',false);
          });
      });
  });
}]);
