var serveStatic = require('serve-static');
var browserify = require('browserify');
var Page = require('./page');

module.exports = function(app, done) {
  var test = this;
  var bundler = browserify();
  bundler.add(__dirname + '/run.js');
  bundler.bundle(function(err, buf) {
    if (err) done(err);
    else {
      var page = Page();

      app.get('/', function(req, res) {
        res.redirect(test.route + page.uri());
      });

      page.serve(app, 'get', function(req, res) {
        res.page.scripts = (
          test.iso +
          '<script>' + buf + '</script>'
        );
        res.page.send();
      });

      done();
    }
  });
};
