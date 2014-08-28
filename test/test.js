var Path = require('osh-path');
var Page = require('..');
var expect = require('expect.js');
var express = require('express');
var http = require('http');
var extend = require('xtend');
var Dynapack = require('dynapack');
var request = require('superagent');
var supertest = require('supertest');
var morgan = require('morgan');
var host = require('osh-test-host');
var async = require('async');
var serveStatic = require('serve-static');

describe('Page', function() {

  describe('load()', function() {
    it('should load a basic page', function(done) {
      var page = Page({
        title: 'Title',
        path: {pattern: '/home'},
        body: function(props) {return 'body';}
      });
      page.load({}, function(page) {
        expect(page.title).to.be('Title');
        expect(page.body).to.be('body');
        expect(page.props.uri).to.be('/home');
        done();
      });
    });

    it('should load a basic page with a param', function(done) {
      var page = Page({
        title: 'Title',
        path: {
          pattern: '/<user>',
          params: {user: /\w+/}
        },
        body: function(props) {return props.params.user;}
      });
      page.load({params: {user: 'tory'}}, function(page) {
        expect(page.title).to.be('Title');
        expect(page.body).to.be('tory');
        done();
      });
    });

    it('should fetch a body module (server only)', function(done) {
      var page = Page({
        title: 'Title',
        path: {pattern: '/home'},
        body: __dirname + '/body'
      });
      page.load({params: {user: 'tory'}}, function(page) {
        expect(page.title).to.be('Title');
        expect(page.body).to.be('module body');
        done();
      });
    });

    it('should load the default 404 page on missing param', function(done) {
      var page = Page({
        title: 'User',
        path: {
          pattern: '/<user>',
          params: {user: /\w+/}
        },
        body: function(props) {return 'body';}
      });
      page.load({}, function(page) {
        expect(page.title).to.be('Not found');
        expect(page.props.error).to.match(/bad uri/i);
        done();
      });
    });

    it('should load the default 404 page on bad param', function(done) {
      var page = Page({
        title: 'User',
        path: {
          pattern: '/<user>',
          params: {user: /\w+/}
        },
        body: function(props) {return 'body';}
      });
      page.load({user: '!@#$'}, function(page) {
        expect(page.title).to.be('Not found');
        expect(page.props.error).to.match(/bad uri/i);
        done();
      });
    });

    it('should load default 404 page on network error', function(done) {
      var page = Page({
        title: 'Home',
        path: {
          pattern: '/'
        },
        data: {
          user: {
            path: {
              pattern: '/home.json',
              get: true // But really it doesn't exist.
            }
          }
        },
        body: function(props) {return 'body';}
      });
      page.load({}, function(page) {
        expect(page.title).to.be('Not found');
        expect(page.props.error).to.match(/ECONNREFUSED/);
        done();
      });
    });
  });

  describe('serve()', function() {
    it('should serve a basic page', function(done) {
      var page = Page({
        title: 'Hi',
        path: {pattern: '/'},
        body: function(props) {return 'body';}
      });
      var app = express();
      app.use(morgan('combined'));
      page.serve(app);
      var request = supertest(app);
      request.get('/')
      .expect(200)
      .expect(new RegExp('<title>Hi</title>'))
      .expect(new RegExp('body</div>'), done);
      //.end(function(err, res) {
      //  if (err) done(err);
      //  else {
      //    console.log(res.text);
      //    done();
      //  }
      //});
    });
  });


  describe('browser', function() {
    var path = require('path');

    /**
     *  Each browser test directory should have an index.js file that
     *  exports the following object.
     *
     *  {
     *    url: '/test-url',
     *    paths: [],
     *    pages: []
     *  }
     *
     */

    var __tests = [
      'interrupt',
      'visit',
      'stash'
    ];

    var tests = __tests.map(function(__test) {
      var dir = path.join(__dirname, __test);
      return extend(require(dir), {
        dir: dir
      });
    });

    /**
     *  Dynapack a test's javascript.
     */

    function pack(test, done) {
      var packer = Dynapack(
        {main: test.dir + '/index.js'},
        {
          output: path.join(test.dir, 'bundles'),
          prefix: test.url + '/'
        }
      );

      packer.run(function() {
        packer.write(function(err, entryInfo) {
          if (err) done(err);
          else {
            test.entryInfo = entryInfo;
            test.scripts = entryInfo.main;
            //console.log(JSON.stringify(entryInfo, null, 2));
            done();
          }
        });
      });
    }

    /**
     *  Attaches test endpoints to Express app.
     */

    function serve(app, test) {
      test.paths.forEach(function(path) {
        path.serve(app);
      });
      test.pages.forEach(function(page, index) {
        page.serve({
          app: app,
          scripts: test.scripts
        });
      });
      app.use(
        test.url,
        serveStatic(
          path.join(test.dir, 'bundles')
        )
      );
    }

    /**
     *  Bundle stuff.
     */

    before(function(done) {
      async.each(tests, pack, done);
    });

    /**
     *  Serve stuff.
     */

    before(function(done) {
      var app = express();

      app.use(morgan('combined'));

      tests.forEach(serve.bind(null, app));

      var i = -1;
      var results = [];
      app.get('/', function(req, res) {
        var result = req.query.result;
        var nextTest;
        if (result) {
          nextTest = tests[++i];
          results.push(result);
        }
        else {
          i = 0;
          nextTest = tests[i];
          results = [];
        }
        res.send(
          '<html><body>' +
          '<ul>' +
          results.map(function(result, index) {
            return '<li>' + tests[index].url + ': ' + result + '</li>';
          }).join('') +
          '</ul>' +
          (
            nextTest ?
            '<script>document.location = "' + nextTest.url + '";</script>' :
            ''
          ) +
          '</body></html>'
        );
      });

      server = http.createServer(app);
      server.listen(host.port, done);
    });

    /**
     *  Test stuff.
     */

    it('should complete browser tests', function(done) {
      this.timeout(0);
      console.log('Browser to http://localhost:3333. Ctrl-C to finish.');
      process.on('SIGINT', function() {
        console.log('Stopping server...');
        server && server.close();
        process.exit();
      });
    });
  });
});
