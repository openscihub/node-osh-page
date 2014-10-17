var Page = require('..');
var html = require('html');

var MyPage = Page.extend({
  path: {
    pattern: '/home'
  },
  get: function(done) {
    this.title = 'My Page';
    this.body = '<h1>Welcome!</h1>';
  }
});

console.log(
  html.prettyPrint(
    MyPage().renderToString()
  )
);
