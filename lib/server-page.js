var Page = require('./page');
//var Path = require('osh-path');
var escape = require('escape-html');
var extend = require('xtend/mutable');


var ServerPage = Page.extend({
  constructor: function(props) {
    this.stash = {};
    this._super(props);
  },

  send: function() {
    var page = this;
    page.payload = page._req.body || page._req.text;
    page[page.verb](function() {
      if (!page._redirected) {
        var html = page.renderToString();
        page._res.status(page.status || 200);
        page._res.send(html);
      }
    });
  },

  redirect: function(page) {
    this._redirected = true;
    //var page = this.pages.instantiate(name, props);
    this._res.redirect(page.uri());
  },

  recovery: function() {
    return {
      stash: this.stash,
      props: this.props
    };
  },

  renderRecovery: function() {
    return (
      '<span ' +
        'id="' + Page.RECOVERY_ID + '" ' +
        'data-data="' + escape(
          JSON.stringify(this.recovery())
        ) + '"' +
      '>' +
      '</span>'
    );
  },

  renderToString: function() {
    return (
      '<!DOCTYPE html>' +
      '<html>' +
        '<head>' + 
          '<title>' + escape(this.title || '') + '</title>' +
          (this.head || '') +
        '</head>' +
        '<body>' +
          '<div id="' + Page.MOUNT_ID + '">' +
            ('string' == typeof this.body ? this.body : '') +
          '</div>' +
          this.renderRecovery() +
          (this.scripts || '') +
        '</body>' +
      '</html>'
    );
  },

  serve: function(app, verb) {
    var _Page = this.constructor;

    this.path.serve(
      app, verb,
      [
        function(req, res, next) {
          res.page = _Page(req.params);
          res.page.verb = verb;
          res.page._res = res;
          res.page._req = req;
          next();
        }
      ]
      .concat(
        Array.prototype.slice.call(arguments, 2)
      )
    );
  }
});

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

module.exports = ServerPage;
