var Page = require('../../..');

module.exports = Page.extend({
  path: {
    pattern: '/page'
  },

  get: function(done) {
    this.title = 'It runs?';
    this.body = 'Watch mah body';
    this.stash.msg = 'hey there';
    done();
  },

  run: function() {
    iso.report('Success. stash.msg=' + this.stash.msg);
  }
});
