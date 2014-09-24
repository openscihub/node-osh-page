var Path = require('osh-path');
var Page = require('../..');
var host = require('osh-test-host');

var latency = 40;

var basePath = Path({
  host: host(),
  pattern: '/interrupt'
});

var userPath = basePath.New({
  pattern: basePath.pattern + '/<user>',
  params: {user: /\w+/}
});

var names = {
  adam: 'Adam Light',
  tory: 'Victoria Conrad'
};

var userData = userPath.New({
  pattern: userPath.pattern + '.json',
  get: function(req, res) {
    setTimeout(function() {
      res.send({
        alias: req.params.user,
        name: names[req.params.user]
      });
    }, latency);
  }
});

var userPage = Page({
  title: 'User page',
  path: userPath,
  data: {
    user: {path: userData}
  },
  body: function(props) {
    return '<h1 id="name">' + props.data.user.name + '</h1>';
  }
});



var RunPage = Page.extend({
  renderTitle: 'Interrupt test',
  path: basePath,
  body: function(props) {
    return '';
  },

  /**
   *  Here's the test.
   */
  ui: function() {
    console.log('running /interrupt ui...');
    var err;
    userPage.visit(
      {params: {user: 'adam'}},
      function(_err) {
        err = _err;
      }
    );
    setTimeout(
      function() {
        userPage.visit(
          {params: {user: 'tory'}},
          function(_err) {
            document.location = (
              err ?
              '/?result=Success' :
              '/?result=Failure: no interruption'
            );
          }
        );
      },
      latency / 2
    );
  }
});


module.exports = {
  url: basePath.pattern,
  pages: [
    runPage,
    userPage
  ],
  paths: [
    userData
  ]
};
