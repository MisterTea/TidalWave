var marked = require('marked');

module.exports = function (self) {
  self.addEventListener('message',function (ev){
    var documentText = ev.data;
    var markdownText = marked(documentText);
    self.postMessage(markdownText);
  });
};
