var Page = require('./base');
var React = require('react');
var fetch = require('./fetch');

/**
 *  Keep track of the currently loading uri so we can abandon
 *  outdated requests.
 */

var uriLoading;


Page.prototype.id = function() {
  return this.path.pattern;
};

/**
 *  Navigate to new page in browser. This will pushState and render into
 *  body element using React.
 */

Page.prototype.visit = function(opts) {
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
  this.render(opts, function(page) {
    if (uri === uriLoading) renderPageToBrowser(page);
  });
};


var mount = document.getElementById(Page.MOUNT_ID);

function renderPageToBrowser(page) {
  console.log('render that sweet action');
  document.title = page.title;
  React.renderComponent(page.body, mount);
}


/**
 *  Load props from document. How? The body component needs to callback
 *  to Page whenever it reversibly injects *top-level* props into the document.
 *
  body: React.createClass({
    declareBodyData: function() {
      this.props

    },

    render: function() {
      return 
    }
  });
 *
 */

Page.prototype.init = function(callback) {
  // Load props that we stashed for the dev.

  var props = JSON.parse(
    document.getElementById(Page.STASH_ID)
    .getAttribute(Page.STASH_ATTR)
  );

  // Load props from DOM by dev.

  //console.log('Before find():', JSON.stringify(props));
  var find;
  for (var namespace in this.data) {
    if (find = this.data[namespace].find) {
      props[namespace] = find(props[namespace]);
    }
  }
  //console.log('After find():', JSON.stringify(props));

  // Fill in rest from server.

  this._data(props, function(err) {
    if (err) callback && callback(err);
    else this._render(props, renderPageToBrowser);
  }.bind(this));
};


// Let's go!
//navigate(document.location.href);

/**
 *
 */

var _pages = {};

// A browser call to onpopstate will be preceded by an update of
// document.location to the new url
// (http://www.w3.org/TR/2011/WD-html5-20110113/history.html#history-traversal).
window.onpopstate = function(event) {
  var state = event.state;
  state && _pages[state.id].visit(state.resource);
};

/**
 *  Intercept the creation of a Page to store the instance in a
 *  registry. We need the registry to render pages on popstate events.
 */

module.exports = function(opts) {
  var page = Page(opts);
  _pages[page.id()] = page;
  return page;
};
