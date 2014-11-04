var pageChangeData = {
  id:"test5",
  title:"Test Document 5",
  previousContent:'OLDI am using __markdown__.\n# TEST\n-----\n## HEADING\n-----',
  currentContent:'NEWI am using __markdown__.\n# TEST\n-----\n## HEADING\n-----\nMORE DATA\n_\n_\n_\n_\n_\n_\n_\n_\n_\n_\n_\n_\n_\n_\n_\n_\n_\n_\n_\n_\n_\n_\n_\n_\n_\n_\n_\n_\n_\n_\n_\n_\n_\n_\n_\n_\n_\n_\n_\n_\n_\n_\n_\n_\n_',
  ancestors:[
    {name:"root"},{name:"parent"}
  ]
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
