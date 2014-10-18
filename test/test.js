var Page = require('..');
var expect = require('expect.js');
var express = require('express');
var supertest = require('supertest');
var iso = require('osh-iso-test');


describe('Page', function() {
  describe('serve()', function() {
    it('should serve a basic page', function(done) {
      var app = express();

      var MyPage = Page.extend({
        path: {
          pattern: '/pg'
        },

        get: function(done) {
          this.title = 'Hello';
          this.body = '<h1>Yeah right</h1>';
          this.stash.title = this.title;
          done();
        }
      });

      MyPage().serve(app, 'get', function(req, res) {
        res.page.send();
      });

      var request = supertest(app);
      request.get('/pg')
      .expect(200, /Yeah right/, done);
    });
  });

  it('should pass browser tests', function(done) {
    this.timeout(0);
    iso(
      {basedir: __dirname + '/iso'},
      done
    );
  });
});

/**
 *  Testing is easy!!!
 */

describe('oldPage', function() {
  describe('load()', function() {
    it('should load a basic page', function(done) {
      done();
    });

    it('should load a basic page with a param', function(done) {
      done();
    });

    it('should fetch a body module (server only)', function(done) {
      done();
    });

    it('should load the default 404 page on missing param', function(done) {
      done();
    });

    it('should load the default 404 page on bad param', function(done) {
      done();
    });

    it('should load default 404 page on network error', function(done) {
      done();
    });
  });
});
