var Range, applyToShareJS;
var editorDoc = null;
var suppress = false;
var globalEditor = null;

var syncLocked = false;

var posToOffset = function(pos) {
  var i, line, lines, offset, _i, _len;
  lines = editorDoc.getLines(0, pos.row);
  offset = 0;
  for (i = _i = 0, _len = lines.length; _i < _len; i = ++_i) {
    line = lines[i];
    offset += i < pos.row ? line.length : pos.column;
  }
  return offset + pos.row;
};

var offsetToPos = function(offset) {
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

DocumentClass = {
  name:"test2",
  eventCallbacks:{},
  base:"",
  commands:[
  ],
  getText: function() {
    return compile(this);
  },
  on: function(event, callback) {
    this.eventCallbacks[event] = callback;
  },
  insert: function(position, text) {
    console.log("Creating add command");
    var command = {name:"ADD", position:position, text:text};
    this.commands.push(command);
    Meteor.call('add', this._id, this.commands.length, position, text);
  },
  del: function(position, text) {
    var command = {name:"REMOVE", position:position, text:text};
    this.commands.push(command);
    Meteor.call('remove', this._id, this.commands.length, position, text);
  },
  updateSelection: function(start,end) {
    if (Session.get('session_id') == null) {
      throw "OOPS";
    }
    var command = {name:"CURSOR", id:Session.get('session_id'), start:start, end:end};
    this.commands.push(command);
    Meteor.call('updateSelection', this._id, this.commands.length, Session.get('session_id'), start, end);
  },
  applyExternalCommand: function(command) {
    this.commands.push(command);
    if (command.name == 'ADD') {
      suppress = true;
      editorDoc.insert(offsetToPos(command.position), command.text);
      suppress = false;
    } else if (command.name == 'REMOVE') {
      suppress = true;
      console.log(offsetToPos(command.position));
      console.log(offsetToPos(command.position + command.text.length));
      var range = Range.fromPoints(
        offsetToPos(command.position),
        offsetToPos(command.position + command.text.length));
      editorDoc.remove(range);
      suppress = false;
    } else if (command.name == 'CURSOR') {
    } else {
      throw "OOPS";
    }
    
  },
  rollback: function() {
    var lastCommand = this.commands.pop();

    if (lastCommand.name == 'REMOVE') {
      suppress = true;
      editorDoc.insert(offsetToPos(lastCommand.position), lastCommand.text);
      suppress = false;
    }
    else if (lastCommand.name == 'ADD') {
      suppress = true;
      var range = Range.fromPoints(
        offsetToPos(lastCommand.position),
        offsetToPos(lastCommand.position + lastCommand.text.length));
      editorDoc.remove(range);
      suppress = false;
    } else if (lastCommand.name == 'CURSOR') {
    } else {
      throw "OOPS";
    }
    
  }
};

var check = function() {
  return window.setTimeout(function() {
    var editorText, otText;
    editorText = editorDoc.getValue();
    otText = DocumentClass.getText();
    if (editorText !== otText) {
      console.error("Text does not match!");
      console.error("editor: " + editorText);
      return console.error("ot:     " + otText);
    }
    return null;
  }, 0);
};

var editorListener = function(change) {
  console.log("GOT ACE CHANGE");
  if (suppress) {
    console.log("SUPPRESSED");
    return;
  }
  applyToShareJS(editorDoc, change.data, DocumentClass);
};

updateLocalDocWhenReady = function() {
  var doc = Documents.findOne({name:"test2"});

  if (editorDoc == null || doc == null) {
    window.setTimeout(updateLocalDocWhenReady,1000);
    console.log("ACE OR METEOR DOC NOT CREATED (YET)");
    return;
  }

  suppress = true;
  console.log("DOC CHANGED");
  console.log(doc);
  console.log(DocumentClass);
  DocumentClass._id = doc._id;
  DocumentClass.name = doc.name;
  DocumentClass.base = doc.base;

  console.log(globalEditor.getCursorPosition());
  var cursor = $.extend(true, {}, globalEditor.getCursorPosition());
  console.log(cursor);
  globalEditor.moveCursorToPosition(cursor);

  //while (DocumentClass.commands.length > doc.commands.length) {
    //console.log("GOT TOO MANY LOCAL COMMANDS.  ROLLING BACK");
    //DocumentClass.rollback();
  //}

  for (var i=0;i<doc.commands.length;i++) {
    if (DocumentClass.commands.length >= i) {
      if (/*Math.random()>0.2 ||*/ !_.isEqual(doc.commands[i], DocumentClass.commands[i])) {
        // Rollback until we are prior to this change or at the beginning
        while (DocumentClass.commands.length>i) {
          console.log("ROLLING BACK");
          console.log(doc.commands[i]);
          console.log(DocumentClass.commands[i]);
          DocumentClass.rollback();
        }
      }
    }

    if (DocumentClass.commands.length<=i) {
      // Apply this new change
      DocumentClass.applyExternalCommand(doc.commands[i]);
    }
  }

  if (DocumentClass.commands.length == doc.commands.length &&
      !_.isEqual(doc.commands, DocumentClass.commands)) {
    console.log(doc.commands);
    console.log(DocumentClass.commands);
    throw "OOPS";
  }
  console.log(doc);
  console.log("SUPRESSING NEXT ACE");
  //editorDoc.setValue(compile(DocumentClass));
  suppress = false;
};

initAceLink = function() {
  var requireImpl = ace.require != null ? ace.require : require;

  Range = requireImpl("ace/range").Range;

  Deps.autorun(function () {
    Meteor.subscribe("document",Session.get("document"));
    var doc = Documents.findOne({name:Session.get("document")});

    if (doc == null) {
      // Create a document
      // Wait for document to exist.
      console.log("CREATING NEW DOCUMENT");
      Documents.insert({name:"test2", base:"", commands:[]});
      return;
    }

    updateLocalDocWhenReady(doc);
  });
};

var getStartOffsetPosition = function(range) {
  var i, line, lines, offset, _i, _len;
  lines = editorDoc.getLines(0, range.start.row);
  offset = 0;
  for (i = _i = 0, _len = lines.length; _i < _len; i = ++_i) {
    line = lines[i];
    offset += i < range.start.row ? line.length : range.start.column;
  }
  return offset + range.start.row;
};

applyToShareJS = function(editorDoc, delta, doc) {
  var pos, text;
  console.log("DELTA");
  console.log(delta);
  pos = getStartOffsetPosition(delta.range);
  console.log("ACTION: " + delta.action);
  switch (delta.action) {
  case 'insertText':
    doc.insert(pos, delta.text);
    break;
  case 'removeText':
    doc.del(pos, delta.text);
    break;
  case 'insertLines':
    text = delta.lines.join('\n') + '\n';
    doc.insert(pos, text);
    break;
  case 'removeLines':
    text = delta.lines.join('\n') + '\n';
    doc.del(pos, text);
    break;
  default:
    throw new Error("unknown action: " + delta.action);
  }
};

attach_ace = function(editor) {
  console.log("ATTACHING ACE");
  var deleteListener, doc, docListener, insertListener, offsetToPos, refreshListener, replaceTokenizer;
  doc = DocumentClass;
  globalEditor = editor;
  editorDoc = editor.getSession().getDocument();
  editorDoc.setNewLineMode('unix');
  editorDoc.setValue(doc.getText());

  check();
  suppress = false;
  editorDoc.on('change', editorListener);
  globalEditor.selection.on('changeCursor', function() {
    if (suppress) {
      return;
    }

    console.log("CURSOR CHANGED");
    var cursor = $.extend(true, {}, globalEditor.getCursorPosition());
    console.log(cursor);

    console.log("SELECTION");
    var selection = $.extend(true, {}, globalEditor.getSelectionRange());
    console.log(selection);

    // Because a cursor move and key press fire at the same time, and
    // the cursor move fires first, put a timeout to make sure the key
    // will take place first.
    window.setTimeout(function() {
      console.log("FIRING SELECTION EVENT");
      doc.updateSelection(posToOffset(selection.start),posToOffset(selection.end));
    },0);
  });
  doc.detach_ace = function() {
    editorDoc.removeListener('change', editorListener);
    return delete doc.detach_ace;
  };
};
