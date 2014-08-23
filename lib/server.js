var Page = require('./base');
var Path = require('revsci-path');
var Class = require('revsci-class');
var escapeText = require('react/lib/escapeTextForBrowser');
var extend = require('xtend');
var React = require('react');


/**
 *  Options:
 *    @param {Express} app
 *    @param {Object} data
 *      @param {String} host
 *    @param {Array<String>} scripts
 *    @param {Object} data Namespace for data/API urls. The options
 *      under data are:
 *      @param {String} host Where does the page app
 *      @param {Express} app
 *    @param {Object} page Namespace for page url. The options
 *      under page are:
 *      @param {Express} app
 */

Page.prototype.serve = function(opts) {
  var app = ('function' == typeof opts) ? opts : opts.app;
  var render = this.render.bind(this);
  var data = this.data;

  // Serve all data endpoints. It's okay to call Path.serve() with the
  // same path twice; Path.serve() tags the express app with an id
  // so the same method (GET, POST, ...) / path pattern doesn't get put
  // on the app more than once.

  var scripts = (opts.scripts || []).map(function(script) {
    return '<script src="' + script + '"></script>';
  }).join('');

  var path = Path(
    extend(this.path.opts, {get: get})
  );

  path.serve(app);

  /**
   *  When we render on the server, each data namespace for the page
   *  has the opportunity to trim what is actually stashed. The stash function
   *  is given the data object fetched from the server and returns an object
   *  that holds a subset of its data.
   *
   *  data.namespace.stash can be a function, otherwise it is interpreted as a
   *  Boolean.
   */

  function stash(props) {
    var stash;
    var _props = {};
    for (var name in props) {
      if (name in data) {
        stash = data[name].stash;
        if ('function' == typeof stash) {
          _props[name] = stash(props[name]);
        }
        else if (stash) {
          _props[name] = props[name];
        }
      }
      else {
        _props[name] = props[name];
      }
    }
    return escapeText(
      JSON.stringify(_props)
    );
  }

  /**
   *  Middleware for serving the page.
   */

  function get(req, res) {
    render(
      {
        host: (opts.data && opts.data.host) || '',
        params: req.params,
        query: req.query
      },
      function(page) {
        res.send(
          '<!DOCTYPE html>' +
          '<html>' +
            '<head>' + 
              '<title>' + escapeText(page.title) + '</title>' +
              (opts.head || '') +
            '</head>' +
            '<body>' +
              '<div id="' + Page.MOUNT_ID + '">' +
                React.renderComponentToString(page.body) +
              '</div>' +
              '<span ' +
                'id="' + Page.STASH_ID + '" ' +
                Page.STASH_ATTR + '="' + stash(page.props) + '">' +
              '</span>' +
              scripts +
            '</body>' +
          '</html>'
        );
      }
    );
  }
};

module.exports = Page;
