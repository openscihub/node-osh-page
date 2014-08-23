var Path = require('revsci-path');
var Page = require('..');
var expect = require('expect.js');
var express = require('express');
var http = require('http');
var extend = require('xtend');
var Dynapack = require('dynapack');
var React = require('react');
var request = require('superagent');
//var supertest = require('supertest');

describe('Page', function() {
  var communityPath = {
    pattern: '/communities/<community>',
    params: {community: /\w+/},
    get: true
  };

  var communityPage = {
    title: 'Community',
    path: communityPath,
    data: {
      community: {
        path: {
          pattern: communityPath.pattern + '.json',
          params: communityPath.params,
          get: true
        },
        req: function() {},
        res: function() {}
      }
    }
  };

  var userPath = {
    pattern: '/users/<user>',
    params: {user: /\w+/},
    get: true
  };

  var communityUserPage = {
    title: 'Test page',
    path: extend(userPath, {
      parent: communityPath
    }),
    data: extend(
      communityPage.data,
      {
        home: {
          path: {
            pattern: '/home.json',
            get: true
          }
        },
        user: {
          path: {
            pattern: userPath.pattern + '.json',
            params: userPath.params,
            parent: communityPath,
            get: true
          }
        }
      }
    ),
    body: __dirname + '/body.js' /*js*/,
    404: __dirname + '/404.js'
  };

  describe('render()', function() {
    var server;
    
    before(function(done) {
      var app = express();
      app.use(function(req, res, next) {
        console.log(req.method.toUpperCase() + ':', req.path);
        next();
      });
      app.get('/home.json', function(req, res) {
        res.send({app: 'test'});
      });
      app.get('/communities/nurses.json', function(req, res) {
        res.send({name: 'Nursing community'});
      });
      app.get('/communities/nurses/users/tory.json', function(req, res) {
        res.send({name: 'Tory'});
      });
      server = http.createServer(app);
      server.listen(3333, done);
    });

    it('should render page', function(done) {
      Page(communityUserPage).render(
        {
          host: 'http://localhost:3333',
          params: {community: 'nurses', user: 'tory'},
          query: {}
        },
        function(page) {
          expect(page.title).to.be('Test page');
          expect(page.body).to.be('body');
          done();
        }
      );
    });

    it('should return 404 page', function(done) {
      Page(communityUserPage).render(
        {
          host: 'http://localhost:3333',
          params: {user: ';!@#$', community: 'nurses'}, // Won't match regexp for user.
          query: {}
        },
        function(page) {
          expect(page.title).to.be('Not found');
          expect(page.body).to.match(/bad param/i);
          done();
        }
      );
    });

    after(function() {
      server && server.close();
    });
  });


  describe('serve()', function() {
    var api = {
      home: {
        path: {
          pattern: '/home.json',
          get: function(req, res) {
            res.send({app: 'UserApp'});
          }
        }
      },
      user: {
        path: {
          pattern: '/users/<user>.json',
          params: {user: /\w+/},
          get: function(req, res) {
            res.send({upper: req.params.user.toUpperCase()});
          }
        }
      }
    };

    var userPage = Page({
      title: function(props) {
        return props.user.upper + '\'s page';
      },
      path: {
        pattern: '/users/<user>',
        params: {user: /\w+/}
      },
      data: api,
      body: function(props) {
        return React.DOM.div(null, JSON.stringify(props));
      }
    });


    var app = express();
    app.use(function(req, res, next) {
      console.log(req.method + ' ' + req.path);
      next();
    });

    for (var name in api) {
      Path(api[name].path).serve(app);
    }
    //console.log(JSON.stringify(app._pages));

    userPage.serve({
      app: app,
      data: {host: 'localhost:3333'}
    });

    var server;
    before(function(done) {
      server = http.createServer(app);
      server.listen(3333, done);
    });

    it('should work', function(done) {
      request.get('localhost:3333/users/tory')
      .end(function(err, res) {
        if (err) done(err);
        else {
          console.log(res.text);
          expect(res.text).to.match(/TORY/);
          done();
        }
      });
    });

    after(function() {
      server && server.close();
    });
  });


  describe('browser', function() {
    /**
     *  Bundle stuff.
     */

    var entryInfo;
    before(function(done) {
      var packer = Dynapack(
        {
          home: __dirname + '/app/home-entry.js',
          user: __dirname + '/app/user-entry.js'
        },
        {output: __dirname + '/app/bundles'}
      );
      packer.run(function() {
        packer.write(function(err, _entryInfo) {
          console.log(JSON.stringify(_entryInfo, null, 2));
          entryInfo = _entryInfo;
          done();
        });
      });
    });

    /**
     *  Serve stuff.
     */

    before(function(done) {
      var user = require('./app/user');
      var home = require('./app/home');
      var app = express();

      app.use(function(req, res, next) {
        console.log(req.method.toUpperCase() + ' ' + req.path);
        next();
      });

      Page(home.page).serve({
        app: app,
        scripts: entryInfo.home
      });
      Path(user.data).serve(app);
      Page(user.page).serve({
        app: app,
        data: {host: 'localhost:3333'},
        scripts: entryInfo.user
      });

      app.get('*.js', function(req, res) {
        res.sendFile(__dirname + '/app/bundles' + req.path);
      });

      server = http.createServer(app);
      server.listen(3333, done);
    });


    it.only('should complete browser tests', function(done) {
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
