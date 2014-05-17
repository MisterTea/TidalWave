createAddCommand = function (document, revision, position, text) {
  // Traverse the changes up to the user's current revision, adjusting
  // this new change as appropriate.
  for (var i=revision;i<document.commands.length;i++) {
    var command = document.commands[i];
    if (command.name == "ADD") {
      // If a word was added before the current word, we have to
      // adjust our position.
      if (command.position <= position) {
        position += command.text.length;
      }
    } else if (command.name == "REMOVE") {
      // If the remove completely covers our position, skip the add.
      var endPosition = command.position + command.text.length;
      if (command.position < position && endPosition >= position) {
        return null;
      }

      // Else if the remove is before our position, shift
      if (endPosition < position) {
        position -= command.count;
      }
    }
  }

  var addCommand = {name:"ADD", position:position, text:text};

  return addCommand;
};

createRemoveCommand = function(document, revision, position, text) {
  var count = text.length;
  // Traverse the changes up to the user's current revision, adjusting
  // this new change as appropriate.
  for (var i=revision;i<document.commands.length;i++) {
    var command = document.commands[i];
    if (command.name == "ADD") {
      // If a word was added before the current position, we have to
      // adjust our position.
      if (command.position <= position) {
        position += command.text.length;
      }
    } else if (command.name == "REMOVE") {
      var endPosition = command.position + command.count;

      // If the remove encompasses our remove, do not commit our remove
      if (command.position <= position && endPosition >= position+count) {
        return null;
      }

      // If the remove is entirely inside our remove, shrink our
      // remove.
      else if (command.position >= position && endPosition <= position+count) {
        count -= command.count;
      }

      // If the remove is strictly before our move, shift
      else if (endPosition <= position) {
        position -= command.count;
      }

      // If the remove is strictly after our move, do nothing
      else if (command.position >= position+count) {
      }

      // Else if the remove starts before our remove but ends
      // somewhere inside our remove, shrink the left side of our
      // remove.
      else if (command.position < position) {
        var lastPositionDeleted = endPosition-1;
        var overlap = (lastPositionDeleted - position) + 1;
        count -= overlap;
        position -= overlap;
      }

      // Else if the remove starts inside our remove but ends
      // somewhere outside our remove, shrink the right side of our
      // remove.
      else if(command.position > position) {
        var overlap = endPosition - (position+count);
        count -= (overlap - 1);
      }

      else {
        throw "Oops";
      }
    }
  }

  var removeCommand = {name:"REMOVE", position:position, text:text.substring(0,count)};

  return removeCommand;
};

createSelectionCommand = function(document, revision, start, end) {
  var position = start;
  var count = end-start;

  // Traverse the changes up to the user's current revision, adjusting
  // this new change as appropriate.
  for (var i=revision;i<document.commands.length;i++) {
    var command = document.commands[i];
    if (command.name == "ADD") {
      // If a word was added before the current position, we have to
      // adjust our position.
      if (command.position <= position) {
        position += command.text.length;
      }
    } else if (command.name == "REMOVE") {
      var endPosition = command.position + command.count;

      // If the remove encompasses our remove, do not commit our remove
      if (command.position <= position && endPosition >= position+count) {
        return null;
      }

      // If the remove is entirely inside our remove, shrink our
      // remove.
      else if (command.position >= position && endPosition <= position+count) {
        count -= command.count;
      }

      // If the remove is strictly before our move, shift
      else if (endPosition <= position) {
        position -= command.count;
      }

      // If the remove is strictly after our move, do nothing
      else if (command.position >= position+count) {
      }

      // Else if the remove starts before our remove but ends
      // somewhere inside our remove, shrink the left side of our
      // remove.
      else if (command.position < position) {
        var lastPositionDeleted = endPosition-1;
        var overlap = (lastPositionDeleted - position) + 1;
        count -= overlap;
        position -= overlap;
      }

      // Else if the remove starts inside our remove but ends
      // somewhere outside our remove, shrink the right side of our
      // remove.
      else if(command.position > position) {
        var overlap = endPosition - (position+count);
        count -= (overlap - 1);
      }

      else {
        throw "Oops";
      }
    }
  }

  return {name:"CURSOR", start:position, end:start+count};
};

compile = function(document) {
  console.log("START");
  var current = document.base;
  for (var i=0;i<document.commands.length;i++) {
    var command = document.commands[i];
    if (command.name == "ADD") {
      current = current.substring(0,command.position) +
        command.text +
        current.substring(command.position);
    } else if(command.name == "REMOVE") {
      if (command.text !== current.substring(command.position,command.text.length)) {
        // Sanity check
        console.log("Invalid remove command" + current + command);
      }
      current = current.substring(0, command.position) +
        current.substring(command.position + command.text.length);
    }
  }
  return current;
};

if (typeof exports != 'undefined') {
  exports.compile = compile;
  exports.createAddCommand = createAddCommand;
  exports.createRemoveCommand = createRemoveCommand;
}

