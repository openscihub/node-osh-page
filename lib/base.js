var Path = require('osh-path');
var fetch = require('./fetch');
var parallel = require('osh-util/parallel');
var Class = require('osh-class');
var tick = process.nextTick;
var extend = require('xtend/mutable');
var merge = require('xtend/immutable');


function DefaultClientError() {
  return 'Client error.';
}

function DefaultServerError() {
  return 'Server error.';
}

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
 *    @param {String|Object|Path} path Either a configuration object for a Path, or
 *      a Path instance. This is the path for the page; i.e. a GET to this
 *      path will return the page HTML.
 *    @param {Object<String,Object|Path>} data A mapping between namespace strings
 *      and Paths or Path config objects. Each path will be queried for data
 *      before the page is rendered. The data returned by each query will be placed
 *      under the associated namespace on the props object passed to the title and
 *      body functions.
 */

var Page = Class({
  constructor: function(opts) {
    this.__Body = opts.body;
    this.__ClientError = opts['4xx'] || DefaultClientError;
    this.__ServerError = opts['5xx'] || DefaultServerError;
    this.title = opts.title || 'Title';
    this.path = Path(
      'string' == typeof opts.path ?
      {pattern: opts.path} :
      opts.path
    );
    this.data = opts.data || {};
  }
});


/**
 *  Constants for use in subclasses; needed by both browser and server for
 *  rendering html and transferring data in DOM.
 */

Page.STASH_ID = '__stash';
Page.STASH_ATTR = 'data-data';
Page.OPTS_ATTR = 'data-opts';
Page.URI_ATTR = 'data-uri';
Page.MOUNT_ID = '__mount';


Page.prototype.id = function() {
  return this.path.pattern;
};

Page.prototype.uri = function() {
  return this.path.uri(this.opts);
};


/**
 *  Fetch missing data and put it on given props object.  If the namespace for
 *  a data piece exists on props, the data for that namespace is NOT fetched.
 *
 *  @param {Object} props Input/Output. The object on which to store the
 *    properties. This object should also contain the options necessary to make
 *    a path.get() call to fetch data from a url.
 *    @param {Object} params
 *    @param {Object} query
 *    @param {Object} data For every key that exists on this object that matches
 *      a data namespace declared for this Page, the download of that data chunk
 *      is SKIPPED.
 *  @param {Function(Error)<>} callback
 */

Page.prototype._data = function(props, callback) {
  var requests = [];

  props.data = props.data || {};
  for (var namespace in this.data) {
    !props.data[namespace] && requests.push(
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
            props.data[namespace] = data;
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
          props.data[namespace] = res.body;
          done();
        }
      });
    };
  }
};


Page.prototype.renderBody = function() {
  return 'Body here!';
};

Page.prototype.renderHead = function() {
  return '';
};

Page.prototype.renderTitle = function() {
  return 'Title here!';
};

Page.prototype.fetchData = function(done) {
  done(null, {});
};

/**
 *  Fetch the page body (if necessary) and the data to render it. Instantiate
 *  the page (title, body) and return it to the callback. If unsuccessful, the
 *  404 page is instantiated and returned.
 *
 *  In the browser, if this is the first page request, javascript bundles are
 *  downloaded from the server via dynapack. On the server, this call is still
 *  async, and occurs on the next event loop.
 *
 *
 *  @param {Object} props Input/Output. The object on which to store the
 *    properties. This object should also contain the options necessary to make
 *    a path.get() call to fetch data from a url.
 *    @param {Object} params
 *    @param {Object} query
 *    @param {Object} data For every key that exists on this object that matches
 *      a data namespace declared for this Page, the download of that data chunk
 *      is SKIPPED.
 *  @param {Function(Object page)<>} callback This callback never receives an
 *    error; errors are expressed as rendered error pages at this point.
 *    The returned page object has the following properties.
 *    @property {String} title
 *    @property {*} body The result of calling the body function assigned to
 *      this Page with the given props.
 *    @property {Object} props
 */

Page.prototype.load = function(props, callback) {
  props = extend(props, {id: this.id()});
  var Body;
  var title = this.title;
  var __Body = this.__Body;
  var __ClientError = this.__ClientError;
  var path = this.path;

  if ((props.uri = path.uri(props)) === undefined) {
    return tick(function() {
      props.error = 'Bad uri; pattern=' + path.pattern;
      instantiate();
    });
  }

  parallel(
    [this._data.bind(this, props), body],
    function(err) {
      if (err) props.error = err.message;
      instantiate();
    }
  );

  function body(done) {
    fetch(__Body, function(_) {
      done();
    });
  }

  function instantiate() {
    if (props.error) {
      title = 'Not found';
      __Body = __ClientError;
    }
    else {
      title = typeof title == 'string' ? title : title(props);
    }

    // Re-fetch is okay. Dynapack caches modules. The following takes time only
    // when an error occurred and a custom Client/ServerError js bundle needs
    // downloading.

    fetch(__Body, function(Body) {
      callback({
        title: title,
        body: Body(props),
        props: props
      });
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
