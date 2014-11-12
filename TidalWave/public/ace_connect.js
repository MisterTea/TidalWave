var Range, applyToShareJS, requireImpl;

requireImpl = ace.require != null ? ace.require : require;

Range = requireImpl("ace/range").Range;

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

window.sharejs.Doc.prototype.attachAce = function(editor, keepEditorContents, editorListenerCallback) {
  var check, deleteListener, editorDoc, editorListener, insertListener, offsetToPos, refreshListener, replaceTokenizer, suppress;
  var ctx = this.createContext();

  if (!ctx.provides.text) {
    throw new Error('Only text documents can be attached to ace');
  }
  editorDoc = editor.getSession().getDocument();
  editorDoc.setNewLineMode('unix');
  check = function() {
    return window.setTimeout(function() {
      var editorText, otText;
      editorText = editorDoc.getValue();
      otText = ctx.get();
      if (editorText !== otText) {
        console.error("Text does not match!");
        console.error("editor: " + editorText);
        console.error("ot:     " + otText);
      }
    }, 0);
  };
  if (keepEditorContents) {
    ctx.remove(0, ctx.get().length);
    ctx.insert(0, editorDoc.getValue());
  } else {
    editorDoc.setValue(ctx.get());
    if(editorListenerCallback) {
      editorListenerCallback(ctx.get());
    }
  }
  check();
  suppress = false;
  editorListener = function(change) {
    if (suppress) {
      return null;
    }
    applyToShareJS(editorDoc, change.data, ctx);
    if(editorListenerCallback) {
      editorListenerCallback(change);
    }
    return check();
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
    editorDoc.insert(offsetToPos(pos), text);
    suppress = false;
    return check();
  };
  ctx.onRemove = function(pos, length) {
    var range;
    suppress = true;
    range = Range.fromPoints(offsetToPos(pos), offsetToPos(pos + length));
    editorDoc.remove(range);
    suppress = false;
    return check();
  };
  this.detachAce = function() {
    editorDoc.removeListener('change', editorListener);
  };
};
