var Range, applyToShareJS;
var editorDoc = null;
var suppress = false;
var globalEditor = null;

var syncLocked = false;

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
    var command = createAddCommand(this, this.commands.length, position, text);
    if (command) {
      console.log(command);
      console.log(this._id);
      Documents.update(this._id, {$push: {commands: command}});
    }
  },
  del: function(position, count) {
    var command = createRemoveCommand(this, this.commands.length, position, count);
    if (command) {
      Documents.update(this._id, {$push: {commands: command}});
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

initAceLink = function() {
  var requireImpl = ace.require != null ? ace.require : require;

  Range = requireImpl("ace/range").Range;

  Deps.autorun(function () {
    Meteor.subscribe("document","test2");
    var doc = Documents.findOne({name:"test2"});
    if (doc != null) {
      console.log("DOC CHANGED");
      console.log(doc);
      DocumentClass._id = doc._id;
      DocumentClass.name = doc.name;
      DocumentClass.base = doc.base;
      DocumentClass.commands = doc.commands;
      if (editorDoc == null) {
        console.log("ACE NOT CREATED (YET)");
        return;
      }
      console.log(doc);
      console.log("SUPRESSING NEXT ACE");
      console.log(compile(DocumentClass));
      suppress = true;
      editorDoc.setValue(compile(DocumentClass));
      suppress = false;
    } else {
      // Wait for document to exist.
      console.log("CREATING NEW DOCUMENT");
      Documents.insert({name:"test2", base:"", commands:[]});
    }
  });
};

applyToShareJS = function(editorDoc, delta, doc) {
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
      doc.insert(pos, delta.text);
      break;
    case 'removeText':
      doc.del(pos, delta.text.length);
      break;
    case 'insertLines':
      text = delta.lines.join('\n') + '\n';
      doc.insert(pos, text);
      break;
    case 'removeLines':
      text = delta.lines.join('\n') + '\n';
      doc.del(pos, text.length);
      break;
    default:
      throw new Error("unknown action: " + delta.action);
  }
};

attach_ace = function(editor, keepEditorContents) {
  console.log("ATTACHING ACE");
  var deleteListener, doc, docListener, insertListener, offsetToPos, refreshListener, replaceTokenizer;
  doc = DocumentClass;
  globalEditor = editor;
  editorDoc = editor.getSession().getDocument();
  editorDoc.setNewLineMode('unix');
  if (keepEditorContents) {
    doc.del(0, doc.getText().length);
    doc.insert(0, editorDoc.getValue());
  } else {
    editorDoc.setValue(doc.getText());
  }
  check();
  suppress = false;
  editorDoc.on('change', editorListener);
  replaceTokenizer = function() {
    var oldGetLineTokens, oldTokenizer;
    oldTokenizer = editor.getSession().getMode().getTokenizer();
    oldGetLineTokens = oldTokenizer.getLineTokens;
    return oldTokenizer.getLineTokens = function(line, state) {
      var cIter, docTokens, modeTokens;
      if ((state == null) || typeof state === "string") {
        cIter = doc.createIterator(0);
        state = {
          modeState: state
        };
      } else {
        cIter = doc.cloneIterator(state.iter);
        doc.consumeIterator(cIter, 1);
      }
      modeTokens = oldGetLineTokens.apply(oldTokenizer, [line, state.modeState]);
      docTokens = doc.consumeIterator(cIter, line.length);
      if (docTokens.text !== line) {
        return modeTokens;
      }
      return {
        tokens: doc.mergeTokens(docTokens, modeTokens.tokens),
        state: {
          modeState: modeTokens.state,
          iter: doc.cloneIterator(cIter)
        }
      };
    };
  };
  if (doc.getAttributes != null) {
    replaceTokenizer();
  }
  docListener = function(op) {
    suppress = true;
    applyToDoc(editorDoc, op);
    suppress = false;
    return check();
  };
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
  doc.on('insert', insertListener = function(pos, text) {
    suppress = true;
    editorDoc.insert(offsetToPos(pos), text);
    suppress = false;
    return check();
  });
  doc.on('delete', deleteListener = function(pos, text) {
    var range;
    suppress = true;
    range = Range.fromPoints(offsetToPos(pos), offsetToPos(pos + text.length));
    editorDoc.remove(range);
    suppress = false;
    return check();
  });
  doc.on('refresh', refreshListener = function(startoffset, length) {
    var range;
    range = Range.fromPoints(offsetToPos(startoffset), offsetToPos(startoffset + length));
    return editor.getSession().bgTokenizer.start(range.start.row);
  });
  doc.detach_ace = function() {
    doc.removeListener('insert', insertListener);
    doc.removeListener('delete', deleteListener);
    doc.removeListener('remoteop', docListener);
    doc.removeListener('refresh', refreshListener);
    editorDoc.removeListener('change', editorListener);
    return delete doc.detach_ace;
  };
};
