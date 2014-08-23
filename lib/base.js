var Path = require('revsci-path');
var inherits = require('inherits');
var fetch = require('./fetch');
var parallel = require('revsci-util/parallel');
var mergeInto = require('react/lib/mergeInto');
var merge = require('react/lib/merge');
var Class = require('revsci-class');
var DefaultNotFound = require('./not-found');

/**
 *  Options:
 *    @param {String|Function(props)<String>} title If a function, it is passed
 *      the same props that are given the body and should return a string.
 *    @param {Function(Object)<ReactComponent>|String} body The body is a
 *      function that returns an object that can be rendered as a string
 *      (server-side) or inserted into the <body> element (client-side).
 *      Currently, body should return a React component instance. If body is a
 *      string, it should be an absolute path to a module that exports such a
 *      function; furthermore, it should be a dynamic dependency declaration so
 *      that Dynapack bundles it and its static dependencies.
 *    @param {Function(Object)<ReactComponent>|String} 404 Just like body, but
 *      will be called if there is an error fetching data or forming the url from
 *      this page's path.
 *    @param {Object|Path} path Either a configuration object for a Path, or
 *      a Path instance. This is the path for the page; i.e. a GET to this
 *      path will return the page HTML.
 *    @param {Object<String,Object|Path>} data A mapping between namespace strings
 *      and Paths or Path config objects. Each path will be queried for data
 *      before the page is rendered. The data returned by each query will be placed
 *      under the associated namespace on the props object passed to the title and
 *      body functions.
 */

var Page = Class(function(opts) {
  this.__Body = opts.body;
  this.__NotFound = opts[404];
  this.title = opts.title || 'Title';
  this.path = Path(opts.path); // opts.path can be a Path instance.
  this.data = opts.data || {};
});

Page.STASH_ID = '__stash';
Page.STASH_ATTR = 'data-stash';
Page.MOUNT_ID = '__mount';

Page.prototype._render = function(props, callback) {
  var title = this.title;
  var __Body = this.__Body;
  if (props.error) {
    title = 'Not found';
    __Body = this.__NotFound || DefaultNotFound;
  }
  else {
    title = typeof title == 'string' ? title : title(props);
  }

  // Re-fetch is okay. Dynapack caches modules.

  fetch(__Body, function(Body) {
    callback({
      title: title,
      body: Body(props),
      props: props
    });
  });
};

/**
 *  Fetch missing data and put it on given props object.  If the namespace for
 *  a data piece exists on props, the data for that namespace is NOT fetched.
 *
 *  @param {Object} props Input/Output. The object on which to store the
 *    properties. This object should also contain the options necessary to make
 *    a path.get() call to fetch data from a url.
 *  @param {Function(Error)<>} callback
 */

Page.prototype._data = function(props, callback) {
  var requests = [];

  for (var namespace in this.data) {
    !props[namespace] && requests.push(
      get(namespace, this.data[namespace])
    );
  }

  parallel(requests, callback);

  // TODO: Check that returned value is actually JSON.

  function get(namespace, action) {
    // Data from custom function.

    if (typeof action == 'function') {
      return function(done) {
        action(props, function(err, data) {
          if (err) done(err);
          else {
            props[namespace] = data;
            done();
          }
        });
      }
    }

    // Data from http.

    var path = Path(action.path);

    return function(done) {
      var req = path.get(props);
      action.req && action.req(req);
      req.end(function(err, res) {
        if (err) done(err);
        else if (!res.ok) done(res.error);
        else {
          //jsonMerge(props, res.body);
          action.res && action.res(res);
          props[namespace] = res.body;
          done();
        }
      });
    };
  }
};

/**
 *  Fetch the React page component and the data to render it. Instantiate the
 *  component and return it to the callback. If unsuccessful, the 404 page is
 *  returned.
 *  
 *  In the browser, if this is the first
 *  page request, javascript bundles are downloaded from the server via
 *  dynapack. On the server, this call is still async, and occurs on the
 *  next event loop.
 */

Page.prototype.render = function(opts, callback) {
  var Body;
  var __Body = this.__Body;
  var props = {};
  var requests = [];
  var _render = this._render.bind(this);

  mergeInto(props, opts);

  parallel(
    [this._data.bind(this, props), body],
    function(err) {
      if (err) props.error = err.message;
      _render(props, callback);
    }
  );

  function body(done) {
    fetch(__Body, function(_Body) {
      Body = _Body;
      done();
    });
  }
};



/**
 *  For use in jsonMerge below.
 */

function isObject(thing) {
  return thing && (typeof thing == 'object') && !Array.isArray(thing);
}

/**
 *  Only to be used on objects parsed from JSON. No need to check ownProperty
 *  and such. Do not recurse into Arrays.
 */

function jsonMerge(to, from) {
  if (isObject(to) && isObject(from)) {
    for (var name in from) {
      to[name] = jsonMerge(to[name], from[name]);
    }
    return to;
  }
  else return from;
}


module.exports = Page;
