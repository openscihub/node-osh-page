var Path = require('revsci-path');
var Page = require('..');
var expect = require('expect.js');
var express = require('express');
var http = require('http');
var extend = require('xtend');
var Dynapack = require('dynapack');
var React = require('react');
var request = require('superagent');
var supertest = require('supertest');
var morgan = require('morgan');

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

  describe('load()', function() {
    var server;
    
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

    after(function() {
      server && server.close();
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
