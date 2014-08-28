var Page = require('../..');
var Path = require('osh-path');
var host = require('osh-test-host');
var extend = require('xtend');

var basePath = Path({
  host: host(),
  pattern: '/stash'
});


var article = basePath.New({
  pattern: basePath.pattern + '/article.json',
  get: function(req, res) {
    res.send({
      title: 'Lorem Ipsum',
      text: (
'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor ' +
'incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis ' +
'nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. ' +
'Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu ' +
'fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in ' +
'culpa qui officia deserunt mollit anim id est laborum.'
      )
    });
  }
});

var runPage = Page({
  title: 'Test stash()',
  path: basePath,
  body: function(props) {
    return (
      '<h1>' + props.data.article.title + '</h1>' +
      '<p id="ipsum">' + props.data.article.text + '</p>'
    );
  },
  data: {
    article: {
      stash: function(article) {
        return {title: article.title};
      },
      find: function(article) {
        var text = document.getElementById('ipsum').textContent;
        return extend(article, {text: text});
      },
      path: article
    }
  },
  ui: function(page) {
    var fail;
    if (/incididunt/.test(document.getElementById('__stash').textContent)) {
      fail = 'full text found in stash';
    }
    if (!/incididunt/.test(page.props.data.article.text)) {
      fail = 'text not in props';
    }
    //console.log(document.getElementById('__stash').textContent);
    document.location = (
      fail ?
      '/?result=Failure: ' + fail :
      '/?result=Success'
    );
  }
});


module.exports = {
  url: basePath.pattern,
  pages: [
    runPage
  ],
  paths: [
    article
  ]
};
