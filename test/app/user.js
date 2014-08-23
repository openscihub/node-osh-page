var Page = require('../..');
var React = require('react');
var extend = require('xtend');

var path = exports.path = {
  pattern: '/users/<user>',
  params: {user: /\w+/}
};

var data = exports.data = extend(path, {
  pattern: path.pattern + '.json',
  get: function(req, res) {
    res.send({
      alias: req.params.user,
      upper: req.params.user.toUpperCase()
    });
  }
});


exports.page = Page({
  title: function(props) {
    return props.params.user + '\'s Page!';
  },
  path: path,
  data: {
    user: {
      find: function(user) {
        var alias = document.getElementById('userAlias').textContent;
        return {
          alias: alias,
          upper: alias.toUpperCase() 
        };
      },
      //stash: function(user) {
      //  // Do not stash upper case.
      //  return {alias: user.alias};
      //},
      stash: false,
      path: data
    }
  },
  body: React.createClass({
    render: function() {
      return React.DOM.div(null,
        React.DOM.h1({id: 'userAlias'}, this.props.user.alias),
        React.DOM.p(null, JSON.stringify(this.props))
      );
    }
  })
});
