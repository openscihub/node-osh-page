var Page = require('../..');
var React = require('react');

exports.page = Page({
  title: 'Hi there!',
  path: {
    pattern: '/'
  },
  body: function(props) {
    return React.DOM.h1(null, 'Homepage');
  }
});
