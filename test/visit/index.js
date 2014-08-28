var Page = require('../..');
var Path = require('osh-path');
var host = require('osh-test-host');

var basePath = Path({
  host: host(),
  pattern: '/visit'
});

var userPage = Page({
  title: 'User page',
  path: basePath.New({
    pattern: basePath.pattern + '/<user>',
    params: {user: /\w+/}
  }),
  body: function(props) {
    return '<h1 id="username">' + props.params.user + '</h1>';
  },
  ui: function() {
    var username = document.getElementById('username').textContent;
    document.location = (
      username === 'tory' ?
      '/?result=Success' :
      '/?result=Fail: no username in DOM'
    );
  }
});

var runPage = Page({
  title: 'Test visit()',
  path: basePath,
  body: function(props) {
    return '';
  },
  ui: function() {
    userPage.visit({params: {user: 'tory'}});
  }
});


module.exports = {
  url: basePath.pattern,
  pages: [
    runPage,
    userPage
  ],
  paths: []
};
