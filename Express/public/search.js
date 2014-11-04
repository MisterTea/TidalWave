var searchResults = {
  query:"meat",
  activePage:1,
  numPages:2,
  searchResults:[
    {
      id:"test5",
      title:"Test Document 5",
      text:marked("This document has some __results__ to look at")
    },
    {
      id:"test5",
      title:"Test Document 5",
      text:marked("This document has some __results__ to look at")
    },
    {
      id:"test5",
      title:"Test Document 5",
      text:marked("This document has some __results__ to look at")
    },
    {
      id:"test5",
      title:"Test Document 5",
      text:marked("This document has some __results__ to look at")
    },
    {
      id:"test5",
      title:"Test Document 5",
      text:marked("This document has some __results__ to look at")
    },
    {
      id:"test5",
      title:"Test Document 5",
      text:marked("This document has some __results__ to look at")
    },
    {
      id:"test5",
      title:"Test Document 5",
      text:marked("This document has some __results__ to look at")
    },
    {
      id:"test5",
      title:"Test Document 5",
      text:marked("This document has some __results__ to look at")
    },
    {
      id:"test5",
      title:"Test Document 5",
      text:marked("This document has some __results__ to look at")
    },
    {
      id:"test5",
      title:"Test Document 5",
      text:marked("This document has some __results__ to look at")
    },
    {
      id:"test5",
      title:"Test Document 5",
      text:marked("This document has some __results__ to look at")
    },
    {
      id:"test5",
      title:"Test Document 5",
      text:marked("This document has some __results__ to look at")
    },
    {
      id:"test5",
      title:"Test Document 5",
      text:marked("This document has some __results__ to look at")
    },
    {
      id:"test5",
      title:"Test Document 5",
      text:marked("This document has some __results__ to look at")
    },
    {
      id:"test5",
      title:"Test Document 5",
      text:marked("This document has some __results__ to look at")
    },
    {
      id:"test5",
      title:"Test Document 5",
      text:marked("This document has some __results__ to look at")
    },
    {
      id:"test6",
      title:"Test Document 6",
      text:marked("This document has more __results__ in it")
    }]
};

var searchTemplate = Handlebars.compile($("#search-template").html());

$(document).ready(function() {
  // Search
  $("#content-placeholder").html(searchTemplate(searchResults));

});
