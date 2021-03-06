var Class = require('osh-class');
var Path = require('osh-path');
var merge = require('xtend/immutable');

var Page = Class({
  constructor: function(props) {
    this.props = merge(props);
    if (!(this.path instanceof Path)) {
      this.path = Path(this.path);
    }
  },

  setProps: function(props) {
    this.props = merge(this.props, props);
  },

  id: function() {
    return this.path.pattern;
  },
  
  uri: function() {
    return this.path.uri(this.props);
  },

  abort: function() {
    console.log('Nothing to abort?');
  }
});


/**
 *  Constants for use in subclasses; needed by both browser and server for
 *  rendering html and transferring data in DOM.
 */

Page.STASH_ID = '__stash';
Page.RECOVERY_ID = '__recovery';
Page.DATA_ATTR = 'data-data';
Page.PROPS_ATTR = 'data-props';
Page.URI_ATTR = 'data-uri';
Page.NAME_ATTR = 'data-name';
Page.MOUNT_ID = '__mount';


module.exports = Page;
