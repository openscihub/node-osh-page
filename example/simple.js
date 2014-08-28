var Page = require('..');
var express = require('express');
var request = require('superagent');
var html = require('html');
var http = require('http');

var page = Page({
  title: 'My page', 
  path: {
    pattern: '/home'
  },
  body: function(props) {
    return '<h1>Welcome!</h1>';
  }
});

var app = express();
page.serve(app);

var server = http.createServer(app);
server.listen(3333, function() {
  request.get('localhost:3333/home')
  .end(function(res) {
    console.log(
      html.prettyPrint(res.text)
    );
    server.close();
  });
});
