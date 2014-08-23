var dynafetch = require('dynafetch')(require);

/**
 *  Wrap dynafetch to load module only if module is specified by an
 *  absolute path string. In other words, don't fetch the module if
 *  it is a non-string object.
 */

module.exports = function(module, callback) {
  if (typeof module == 'string') {
    dynafetch([module], callback);
  }
  else {
    process.nextTick(function() {
      callback(module);
    });
  }
};
