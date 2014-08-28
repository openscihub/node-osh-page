'use strict';

var Page = require('./base');
var fetch = require('./fetch');
var Class = require('osh-class');
var extend = require('xtend');


/**
 *
 */

var _pages = {};

/**
 *  Listen in on the creation of a Page to store the instance in a
 *  registry. We need the registry to render pages on popstate events.
 */

var BrowserPage = Class(Page, function(opts) {
  this.ui = opts.ui || function() {};
  this._super(opts);

  _pages[this.id()] = this;

  if (BrowserPage.stash.id === this.id()) {
    history.replaceState(
      this.state('entry'),
      null,
      document.location.href
    );
    this.load(this.domProps(), function(page) {
      this.ui(page);
    }.bind(this));
  }
});



// A browser call to onpopstate will be preceded by an update of
// document.location to the new url
// (http://www.w3.org/TR/2011/WD-html5-20110113/history.html#history-traversal).
window.onpopstate = function(event) {
  var state = event.state;
  console.log(state);
  if (state) {
    var page = _pages[state.id];
    page._navigate(
      state.props === 'entry' ?
      page.domProps() :
      state.props
    );
  }
};



BrowserPage.prototype.state = function(props) {
  return {
    id: this.id(),
    props: props
  };
};


/**
 *  Keep track of the currently loading uri so we can abandon
 *  outdated requests.
 */

var currentUri;

/**
 *  Conditional render. Only if uri is current.
 */

BrowserPage.prototype._render = function(page) {
  if (page.props.uri === currentUri) {
    this.render(page);
    this.ui(page);
  }
  else {
    return new Error(
      'Navigation to ' + page.props.uri + ' interrupted by request for ' +
      currentUri + '.'
    )
  }
};

/**
 *  Navigate to new page in browser. Does the loading and rendering
 *  (or ignoring if another navigation supercedes the current one).
 *
 *  This operation does not modify browser History. Therefore, this
 *  method must always render the latest page request (even if 4xx, 5xx).
 */

BrowserPage.prototype._navigate = function(opts, callback) {
  var uri = this.path.uri(opts);
  // Requesting the same page that is already loading or has already
  // been loaded.
  if (uri === currentUri) return;
  currentUri = uri;
  this.load(opts, function(page) {
    var err = this._render(page);
    callback && callback(err);
  }.bind(this));
};

/**
 *  Navigate to new page in browser. Calls pushState then this._navigate().
 */

BrowserPage.prototype.visit = function(opts, callback) {
  console.log('visit opts:', opts);
  var uri = this.path.uri(opts);
  if (uri !== document.location.href) {
    console.log('pushing pushing state:', this.state(opts));
    history.pushState(this.state(opts), null, uri);
  }
  this._navigate(opts, callback);
};


BrowserPage.body = document.getElementById(Page.MOUNT_ID);

BrowserPage.stash = JSON.parse(
  document.getElementById(Page.STASH_ID)
  .getAttribute(Page.STASH_ATTR)
);


/**
 *  Actually renders to the DOM. Huh. Override this when
 *  you want to use a fancier renderer, like ReactJS.
 */

BrowserPage.prototype.render = function(page) {
  document.title = page.title;
  BrowserPage.body.innerHTML = (
    'string' == typeof page.body ?
    page.body :
    'Body was not a string!'
  );
};


BrowserPage.prototype.domProps = function() {
  // Load stashed props.
  var props = extend(BrowserPage.stash);

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

  return props;
};


module.exports = BrowserPage;
