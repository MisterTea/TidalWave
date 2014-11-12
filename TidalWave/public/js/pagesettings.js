var pageSettingsData = {
  pageData:pageData,
  newTitleIsValid:true,
  newParentIsValid:true
};

var pageSettingsTemplate = Handlebars.compile($("#page-settings-template").html());

$(document).ready(function() {
  $("#navbar-placeholder").html(navbarTemplate(navbarData));
  
  $("span.tree-toggler").click(treeClickHandler);

  // Page Settings
  $("#content-placeholder").html(pageSettingsTemplate(pageDetails));

  populateMemberSelectArray();
});
