var express = require('express');
var path = require('path');
var should = require('should');
var supertest = require('supertest');

var Oryx = require('../');
var resources = './test/resources';

describe('Autowire', function () {

  describe('via Promise', function () {

    it('bootstraps using default settings', function (next) {
      var oryx = new Oryx(express(), {
        app_root: path.resolve(resources),
        log_level: 'error'
      });

      oryx
        .autowire()
        .spread(function (models, apis) {
          should(models).be.ok;
          should(models.length).eql(1);
          should(models[0]).eql('user');

          should(apis).be.ok;
          should(apis.length).eql(1);
          should(apis[0]).eql('v1');
        })
        .then(next)
        .catch(next);
    });

    it('bootstraps using custom settings', function (next) {
      var oryx = new Oryx(express(), {
        app_root: path.resolve(resources),
        log_level: 'error'
      });

      oryx
        .autowire({
          models: {
            path: './custom_models'
          },
          routes: {
            apis: {
              path: './api/v1'
            }
          }
        })
        .spread(function (models, apis) {
          should(models).be.ok;
          should(models.length).eql(1);
          should(models[0]).eql('custom_user');

          should(apis).be.ok;
          should(apis.length).eql(1);
          should(apis[0]).eql('v1');
        })
        .then(next)
        .catch(next);
    });

    it('attaches routes to autowired models', function (next) {
      var app = express();

      var oryx = new Oryx(app, {
        app_root: path.resolve(resources),
        log_level: 'error'
      });

      oryx
        .autowire()
        .spread(function (models, apis) {
          should(models).be.ok();
          should(models.length).eql(1);
          should(models[0]).eql('user');

          should(apis).be.ok();
          should(apis.length).eql(1);
          should(apis[0]).eql('v1');
        })
        .then(function () {
          supertest
            .agent(app)
            .get('/api/v1/user/info')
            .expect('Content-Type', /json/)
            .expect(200, {
              success: true,
              result: {
                name: 'user',
                schema: {
                  firstName: {
                    type: 'string'
                  },
                  lastName: {
                    type: 'string'
                  },
                  id: {
                    autoIncrement: true,
                    primaryKey: true,
                    type: 'integer',
                    unique: true
                  }
                },
                routes: [
                  'GET /',
                  'POST /',
                  'PUT /',
                  'DELETE /',
                  'GET /count',
                  'GET /info',
                  'GET /distinct/:field',
                  'GET /:id',
                  'POST /:id',
                  'PUT /:id',
                  'DELETE /:id'
                ]
              }
            }, next);
        })
        .catch(next);
    });

  });

  describe('via callback', function () {

    it('bootstraps using default settings', function (next) {
      var oryx = new Oryx(express(), {
        app_root: path.resolve(resources),
        log_level: 'error'
      });

      oryx.autowire(function (err, models, apis) {
        if(err) {
          return next(err);
        }

        should(models).be.ok;
        should(models.length).eql(1);
        should(models[0]).eql('user');

        should(apis).be.ok;
        should(apis.length).eql(1);
        should(apis[0]).eql('v1');

        next();
      });
    });

    it('bootstraps using custom settings', function (next) {
      var oryx = new Oryx(express(), {
        app_root: path.resolve(resources),
        log_level: 'error'
      });

      oryx.autowire({
        models: {
          path: './custom_models'
        },
        routes: {
          apis: {
            path: './api/v1'
          }
        }
      }, function (err, models, apis) {
        if (err) {
          return next(err);
        }

        should(models).be.ok;
        should(models.length).eql(1);
        should(models[0]).eql('custom_user');

        should(apis).be.ok;
        should(apis.length).eql(1);
        should(apis[0]).eql('v1');

        next();
      });
    });

    it('attaches routes to autowired models', function (next) {
      var app = express();

      var oryx = new Oryx(app, {
        app_root: path.resolve(resources),
        log_level: 'error'
      });

      oryx.autowire(function (err, models, apis) {
        if (err) {
          return next(err);
        }

        should(models).be.ok();
        should(models.length).eql(1);
        should(models[0]).eql('user');

        should(apis).be.ok();
        should(apis.length).eql(1);
        should(apis[0]).eql('v1');

        supertest
          .agent(app)
          .get('/api/v1/user/info')
          .expect('Content-Type', /json/)
          .expect(200, {
            success: true,
            result: {
              name: 'user',
              schema: {
                firstName: {
                  type: 'string'
                },
                lastName: {
                  type: 'string'
                },
                id: {
                  autoIncrement: true,
                  primaryKey: true,
                  type: 'integer',
                  unique: true
                }
              },
              routes: [
                'GET /',
                'POST /',
                'PUT /',
                'DELETE /',
                'GET /count',
                'GET /info',
                'GET /distinct/:field',
                'GET /:id',
                'POST /:id',
                'PUT /:id',
                'DELETE /:id'
              ]
            }
          }, next);
      });

    });

  });

});