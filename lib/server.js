var Pages = require('./base');
var Path = require('osh-path');
var escape = require('escape-html');
var extend = require('xtend');
var Dynapack = require('dynapack');
var temp = require('temp').track();




var ServerPage = Pages.Page.extend({
  constructor: function(opts) {
    this.entry = opts.entry;
    this._super(opts);
  }
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


ServerPage.prototype.renderToString = function(page) {
  return (
    '<!DOCTYPE html>' +
    '<html>' +
      '<head>' + 
        '<title>' + escape(page.title || '') + '</title>' +
        (page.head || '') +
      '</head>' +
      '<body>' +
        '<div id="' + Page.MOUNT_ID + '">' +
          ('string' == typeof page.body ? page.body : '') +
        '</div>' +
        '<span ' +
          'id="' + Page.STASH_ID + '" ' +
          Page.DATA_ATTR + '="' + escape(
            JSON.stringify(page.stash)
              //this.stash(page.props)
            //)
          ) + '" ' +
          Page.OPTS_ATTR + '="' + escape(
            JSON.stringify(this.opts)
          ) + '" ' +
          Page.URI_ATTR + '="' + escape(
            JSON.stringify(this.uri())
          ) + '" ' +
        '">' +
        '</span>' +
        (page.scripts || '') +
      '</body>' +
    '</html>'
  );
};

ServerPage.prototype.renderScripts = function() {
  return '';
};

ServerPage.prototype.render = function(done) {
  this.fetchData(function(err, data) {
    var page = {
      title: this.renderTitle(data),
      head: this.renderHead(data),
      body: this.renderBody(data),
      stash: this.stash(data),
      scripts: this.renderScripts(data)
    };
    done(null, this.renderToString(page));
  }.bind(this));
};



var ServerPages = Pages.extend({
  constructor: function(opts) {
    this.strict = true;
  },

  add: function(name, proto) {
    if ('string' == typeof name) {
      if (!proto) {
        throw new Error(
          'Need to provide a prototype for page ' + name
        );
      }
      this._add(name, proto);
    }
    else {
      var pages = name;
      for (name in pages) {
        this._add(name, pages[name]);
      }
    }
  },

  _add: function(name, proto) {
    if (this.strict && this._bundled) {
      throw new Error(
        'Page added after bundling!'
      );
    }

    if ('string' == typeof proto) {
      this.__pages[name] = proto;
      proto = require(proto);
    }
    else {
      // Issue warning, b/c without a path to a prototype
      // file, we cannot bundle
      console.warn(
        'Warning: Page "' + name + '" will not be bundled.'
      );
    }

    this._Pages[name] = Page.extend(proto);
  },

  bundle: function(opts, callback) {
    var entries = {};
    var mapInfo = temp.openSync({suffix: '.js'});

    fs.writeSync(mapInfo.fd, 'var pages = require("pages");\n');
    fs.writeSync(mapInfo.fd, 'pages.add({\n');

    var entryInfo;
    var map = [];

    var __page;

    for (var name in this.__pages) {
      __page = this.__pages[name];

      map.push('  ' + name + ': "' + __page + '" /*js*/');

      entryInfo = temp.openSync({suffix: '.js'});
      fs.writeSync(entryInfo.fd,
        'require("' + mapInfo.path + '");\n' +
        'require("' + __page + '");\n' +
        'require("pages").render("' + name + '");'
      );
      fs.closeSync(entryInfo.fd);

      entries[name] = entryInfo.path;
    }

    fs.writeSync(mapInfo.fd, map.join(',\n'));
    fs.writeSync(mapInfo.fd, '});\n');
    fs.closeSync(mapInfo.fd);

    var self = this;
    var packer = Dynapack(entries, opts);
    packer.run(function() {
      packer.write(function(err, scripts) {
        self._scripts = scripts;
        callback && callback(err, scripts);
      });
    });
  },

  serve: function(name) {
    var _Page = this._Pages[name];
    if (!_Page) {
      throw new Error(
        'Page "' + name + '" was not added.'
      );
    }

    var Page = _Page.extend({
      constructor: function() {
        this._super.apply(this, arguments);
      },

      _bundles: this._scripts[name].map(
        function(script) {
          return '<script src="' + script + '"></script>';
        }
      ).join(''),

      renderScripts: function() {
        return (
          _Page.prototype.renderScripts.call(this) +
          this._bundles
        );
      }
    });

    return function(req, res, next) {
      res.page = Page();
      next();
    };
  }
});

ServerPages.Page = ServerPage;

module.exports = ServerPages;
