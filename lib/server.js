var Page = require('./base');
var Path = require('osh-path');
var Class = require('osh-class');
var escape = require('escape-html');
var extend = require('xtend');


var ServerPage = Class(Page, function(opts) {
  this.entry = opts.entry;
  this._super(opts);
});

/**
 *  Options:
 *    @param {Express} app
 *    @param {Array<String>} scripts
 *    @param {String} head
 */

ServerPage.prototype.serve = function(opts) {
  opts = ('function' == typeof opts) ? {app: opts} : opts;
  var app = opts.app;
  var load = this.load.bind(this);
  var render = this.render.bind(this);
  var data = this.data;

  // Serve all path verbs. It's okay to call Path.serve() with the
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
   *  Middleware for serving the page.
   */

  function get(req, res) {
    load(
      {
        params: req.params,
        query: req.query
      },
      function(page) {
        console.log(page);
        page.scripts = scripts;
        page.head = opts.head;
        res.send(
          render(page)
        );
      }
    );
  }
};


/**
 *  When we render on the server, each data namespace for the page
 *  has the opportunity to trim what is actually stashed. The stash function
 *  is given the data object fetched from the API server and returns an object
 *  that holds a subset of its data.
 *
 *  data.<namespace>.stash can be a function, otherwise it is interpreted as a
 *  Boolean.
 */

/**
 *  Always stash these properties. This acts as a whitelist.
 *  Do not include 'data' as a key in this hash; it is treated specially.
 */

var STASH = {
  id: null,
  params: null,
  query: null,
  uri: null
};

ServerPage.prototype.stash = function(props) {
  var stash;
  var _props = {data: {}};
  var name;
  if (props.data) {
    for (name in this.data) {
      stash = this.data[name].stash;
      if ('function' == typeof stash) {
        _props.data[name] = stash(props.data[name]);
      }
      else if (stash) {
        _props.data[name] = props.data[name];
      }
    }
  }
  for (name in props) {
    if (name in STASH) {
      _props[name] = props[name];
    }
  }
  return _props;
};


ServerPage.prototype.render = function(page) {
  return (
    '<!DOCTYPE html>' +
    '<html>' +
      '<head>' + 
        '<title>' + escape(page.title) + '</title>' +
        (page.head || '') +
      '</head>' +
      '<body>' +
        '<div id="' + Page.MOUNT_ID + '">' +
          ('string' == typeof page.body ? page.body : '') +
        '</div>' +
        '<span ' +
          'id="' + Page.STASH_ID + '" ' +
          Page.STASH_ATTR + '="' + escape(
            JSON.stringify(
              this.stash(page.props)
            )
          ) + '">' +
        '</span>' +
        (page.scripts || '') +
      '</body>' +
    '</html>'
  );
};

module.exports = ServerPage;
