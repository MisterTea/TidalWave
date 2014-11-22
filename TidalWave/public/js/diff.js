var pageChangeData = {
  id:"test5",
  title:"Test Document 5",
  previousContent:'OLDI am using __markdown__.\n# TEST\n-----\n## HEADING\n-----',
  currentContent:'NEWI am using __markdown__.\n# TEST\n-----\n## HEADING\n-----\nMORE DATA\n_\n_\n_\n_\n_\n_\n_\n_\n_\n_\n_\n_\n_\n_\n_\n_\n_\n_\n_\n_\n_\n_\n_\n_\n_\n_\n_\n_\n_\n_\n_\n_\n_\n_\n_\n_\n_\n_\n_\n_\n_\n_\n_\n_\n_',
  ancestors:[
    {name:"root"},{name:"parent"}
  ]
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
          bufferWithAdds.push({
            text:"<span style=\"color:red;\">"+tokens[j]+"</span>",
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

var pageChangeTemplate = Handlebars.compile($("#page-change-template").html());

$(document).ready(function() {
  $("#navbar-placeholder").html(navbarTemplate(navbarData));
  
  $("span.tree-toggler").click(treeClickHandler);

  // View Changes
  var dmp = new diff_match_patch();
  console.log(dmp);
  var diff = dmp.diff_main(pageChangeData.previousContent, pageChangeData.currentContent);
  dmp.diff_cleanupSemantic(diff);
  console.log(diff);
  var processedDiff = preprocessDiff(diff);
  pageChangeData.previousContent = processedDiff[0];
  pageChangeData.currentContent = processedDiff[1];
  console.log(pageChangeData.previousContent);
  $("#content-placeholder").html(pageChangeTemplate(pageChangeData));
});
