var Page = require('./base');
var React = require('react');
var fetch = require('./fetch');
var Class = require('revsci-class');


/**
 *
 */

var _pages = {};

/**
 *  Listen in on the creation of a Page to store the instance in a
 *  registry. We need the registry to render pages on popstate events.
 */

var BrowserPage = Class(Page, function(opts) {
  this._super(opts);
  _pages[this.id()] = this;
});


// A browser call to onpopstate will be preceded by an update of
// document.location to the new url
// (http://www.w3.org/TR/2011/WD-html5-20110113/history.html#history-traversal).
window.onpopstate = function(event) {
  var state = event.state;
  state && _pages[state.id].visit(state.resource);
};





BrowserPage.prototype.id = function() {
  return this.path.pattern;
};


/**
 *  Keep track of the currently loading uri so we can abandon
 *  outdated requests.
 */

var uriLoading;

/**
 *  Navigate to new page in browser. This will pushState and render into
 *  body element using React.
 */

BrowserPage.prototype.visit = function(opts) {
  var uri = this.path.uri(opts);
  var state = {
    id: this.id(),
    resource: opts
  };
  if (uri === uriLoading) {
    return;
  }
  uriLoading = uri;
  if (uri !== document.location.href) {
    history.pushState(state, null, uri);
  }
  this.load(opts, function(page) {
    if (uri === uriLoading) this.render(page);
  }.bind(this));
};


BrowserPage.body = document.getElementById(Page.MOUNT_ID);


/**
 *
 */

BrowserPage.prototype.render = function(page) {
  document.title = page.title;
};


/**
 *  Load props from document and render.
 */

BrowserPage.prototype.init = function(callback) {
  // Load props that we stashed for the dev.

  var props = JSON.parse(
    document.getElementById(Page.STASH_ID)
    .getAttribute(Page.STASH_ATTR)
  );

  // Load props from DOM by dev.
  var data = props.data = props.data || {};

  //console.log('Before find():', JSON.stringify(props));
  var find;
  for (var namespace in this.data) {
    if (find = this.data[namespace].find) {
      data[namespace] = find(data[namespace]);
    }
  }
  //console.log('After find():', JSON.stringify(props));

  // Fill in rest from server.
  this.load(
    props,
    this.render.bind(this)
  );
};


module.exports = BrowserPage;
