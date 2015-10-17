var async = require('async');
var bodyParser = require('body-parser');
var express = require('express');
var merge = require('lodash.merge');
var path = require('path');
var should = require('should');
var supertest = require('supertest');

var Oryx = require('../');
var resources = './test/resources';

describe('Model Routes', function () {

  var app = express();
  var agent = supertest.agent(app);

  before('set up a Oryx instance', function (start) {
    app.use(bodyParser.json({ type: '*/*' }));

    var oryx = new Oryx(app, {
      app_root: path.resolve(resources),
      log_level: 'error'
    });

    oryx
      .models({
        path: './model_routes'
      })
      .then(function (models) {
        should(models).be.ok();
        should(models.length).eql(3);
        should(models[0]).eql('employee');
        should(models[1]).eql('manager');
        should(models[2]).eql('user');
      })
      .then(function () {
        return oryx.routes();
      })
      .then(function (apis) {
        should(apis).be.ok();
        should(apis.length).eql(1);
        should(apis[0]).eql('v1');
      })
      .then(start)
      .catch(start);
  });

  describe('Custom Routes', function () {

    it('allow a user to define custom routes on a model', function (next) {
      agent
        .get('/api/v1/user/custom_route')
        .expect('Content-Type', /json/)
        .expect(200, {
          message: 'aloha!'
        }, next);
    });

    it('allow a user to specify routes to include/exclude', function (next) {
      agent
        .get('/api/v1/manager/1')
        .expect(404, function () {
          agent
            .get('/api/v1/manager')
            .expect(200, next);
        });
    });

    it('allow a user to override predefined routes', function (next) {
      agent
        .get('/api/v1/manager')
        .expect('Content-Type', /json/)
        .expect(200, {
          model: 'manager'
        }, next);
    });

    it('allow the use of glob filters', function (next) {
      agent
        .get('/api/v1/employee/info')
        .expect('Content-Type', /json/)
        .expect(200, {
          success: true,          result: {
            name: 'employee',
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
              'POST /',
              'PUT /',
              'GET /info',
              'POST /:id',
              'PUT /:id',
              'DELETE /:id'
            ]
          }
        }, next);
    });

  });

  describe('Predefined Routes', function () {

    function createTestUsers(cb) {
      var users = [];
      var firstNames = [ 'Bob', 'Bobby', 'Barbara' ];
      var lastNames = [ 'Loblaw', 'Loblow', 'Loblew', 'Lobluw' ];

      for(var i = 0; i < 25; i++) {
        users.push({
          id: i + 1,
          firstName: firstNames[i % 3],
          lastName: lastNames[i % 4]
        });
      }

      agent
        .post('/api/v1/user')
        .send(users)
        .expect('Content-Type', /json/)
        .expect(201, {
          success: true,          result: users
        }, cb);
    }

    afterEach('cleanup instances', function (done) {
      agent
        .delete('/api/v1/user')
        .expect(200, done);
    });

    describe('POST /', function () {

      it('creates a model instance', function (next) {
        var user = {
          id: 1,
          firstName: 'Bob',
          lastName: 'Loblaw'
        };

        agent
          .post('/api/v1/user')
          .send(user)
          .expect('Content-Type', /json/)
          .expect(201, {
            success: true,            result: user
          }, next);
      });

      it('creates several model instances', function (next) {
        var users = [
          {
            id: 1,
            firstName: 'Bob',
            lastName: 'Loblaw'
          },
          {
            id: 2,
            firstName: 'Bobby',
            lastName: 'Loblaw'
          }
        ];

        agent
          .post('/api/v1/user')
          .send(users)
          .expect('Content-Type', /json/)
          .expect(201, {
            success: true,            result: users
          }, next);
      });

    });

    describe('GET /', function () {

      it('returns 10 records by default', function (next) {
        createTestUsers(function () {
          agent
            .get('/api/v1/user')
            .expect('Content-Type', /json/)
            .expect(200)
            .expect(function (res) {
              should(res.body).be.ok();
              should(res.body.result).be.ok();
              should(res.body.result).have.lengthOf(10);
            })
            .end(next);
        });
      });

      it('returns N records', function (next) {
        createTestUsers(function () {
          agent
            .get('/api/v1/user?limit=25')
            .expect('Content-Type', /json/)
            .expect(200)
            .expect(function (res) {
              should(res.body).be.ok();
              should(res.body.result).be.ok();
              should(res.body.result).have.lengthOf(25);
            })
            .end(next);
        });
      });

      it('returns a projection via single param', function (next) {
        createTestUsers(function () {
          agent
            .get('/api/v1/user')
            .query({
              select: 'id',
              limit: 1
            })
            .expect('Content-Type', /json/)
            .expect(200)
            .expect(function (res) {
              should(res.body).be.ok();
              should(res.body.result).be.ok();
              should(res.body.result).have.lengthOf(1);
              should(res.body.result[0].id).be.ok();
              should(res.body.result[0].firstName).not.be.ok();
              should(res.body.result[0].lastName).not.be.ok();
            })
            .end(next);
        });
      });

      it('returns a projection via multiple params', function (next) {
        createTestUsers(function () {
          agent
            .get('/api/v1/user?select=id&select=firstName')
            .query({
              limit: 1
            })
            .expect('Content-Type', /json/)
            .expect(200)
            .expect(function (res) {
              should(res.body).be.ok();
              should(res.body.result).be.ok();
              should(res.body.result).have.lengthOf(1);
              should(res.body.result[0].id).be.ok();
              should(res.body.result[0].firstName).be.ok();
              should(res.body.result[0].lastName).not.be.ok();
            })
            .end(next);
        });
      });

      it('returns a projection via array params', function (next) {
        createTestUsers(function () {
          agent
            .get('/api/v1/user?select[]=id&select[]=firstName')
            .query({
              limit: 1
            })
            .expect('Content-Type', /json/)
            .expect(200)
            .expect(function (res) {
              should(res.body).be.ok();
              should(res.body.result).be.ok();
              should(res.body.result).have.lengthOf(1);
              should(res.body.result[0].id).be.ok();
              should(res.body.result[0].firstName).be.ok();
              should(res.body.result[0].lastName).not.be.ok();
            })
            .end(next);
        });
      });

      it('returns a projection via JSON params', function (next) {
        createTestUsers(function () {
          agent
            .get('/api/v1/user')
            .query({
              select: '["id"]',
              limit: 1
            })
            .expect('Content-Type', /json/)
            .expect(200)
            .expect(function (res) {
              should(res.body).be.ok();
              should(res.body.result).be.ok();
              should(res.body.result).have.lengthOf(1);
              should(res.body.result[0].id).be.ok();
              should(res.body.result[0].firstName).not.be.ok();
              should(res.body.result[0].lastName).not.be.ok();
            })
            .end(next);
        });
      });

      it('allows ascending sort of results using String parameters', function (next) {
        createTestUsers(function () {
          agent
            .get('/api/v1/user')
            .query({
              limit: 3,
              sort: 'firstName'
            })
            .expect('Content-Type', /json/)
            .expect(200)
            .expect(function (res) {
              should(res.body).be.ok();
              should(res.body.result).be.ok();
              should(res.body.result).have.lengthOf(3);

              for(var i = 0, j = res.body.result.length; i < j; i++) {
                should(res.body.result[i].firstName).be.ok();
                should(res.body.result[i].firstName).eql('Barbara');
              }
            })
            .end(next);
        });
      });

      it('allows descending sort of results using String parameters', function (next) {
        createTestUsers(function () {
          agent
            .get('/api/v1/user')
            .query({
              limit: 3,
              sort: 'firstName DESC'
            })
            .expect('Content-Type', /json/)
            .expect(200)
            .expect(function (res) {
              should(res.body).be.ok();
              should(res.body.result).be.ok();
              should(res.body.result).have.lengthOf(3);

              for(var i = 0, j = res.body.result.length; i < j; i++) {
                should(res.body.result[i].firstName).be.ok();
                should(res.body.result[i].firstName).eql('Bobby');
              }
            })
            .end(next);
        });
      });

      it('allows ascending sort of results using JSON parameters', function (next) {
        createTestUsers(function () {
          agent
            .get('/api/v1/user')
            .query({
              limit: 3,
              sort: JSON.stringify({
                firstName: 'ASC'
              })
            })
            .expect('Content-Type', /json/)
            .expect(200)
            .expect(function (res) {
              should(res.body).be.ok();
              should(res.body.result).be.ok();
              should(res.body.result).have.lengthOf(3);

              for(var i = 0, j = res.body.result.length; i < j; i++) {
                should(res.body.result[i].firstName).be.ok();
                should(res.body.result[i].firstName).eql('Barbara');
              }
            })
            .end(next);
        });
      });

      it('allows descending sort of results using JSON parameters', function (next) {
        createTestUsers(function () {
          agent
            .get('/api/v1/user')
            .query({
              limit: 3,
              sort: JSON.stringify({
                firstName: 'DESC'
              })
            })
            .expect('Content-Type', /json/)
            .expect(200)
            .expect(function (res) {
              should(res.body).be.ok();
              should(res.body.result).be.ok();
              should(res.body.result).have.lengthOf(3);

              for(var i = 0, j = res.body.result.length; i < j; i++) {
                should(res.body.result[i].firstName).be.ok();
                should(res.body.result[i].firstName).eql('Bobby');
              }
            })
            .end(next);
        });
      });

      it('queries across different parameters using key=value', function (next) {
        createTestUsers(function () {
          agent
            .get('/api/v1/user')
            .query({
              firstName: 'Bob',
              select: 'firstName'
            })
            .expect('Content-Type', /json/)
            .expect(200)
            .expect(function (res) {
              should(res.body).be.ok();
              should(res.body.result).be.ok();
              should(res.body.result).have.lengthOf(9);

              for(var i = 0, j = res.body.result.length; i < j; i++) {
                should(Object.keys(res.body.result[i])).have.lengthOf(1);
                should(res.body.result[i].firstName).be.ok();
                should(res.body.result[i].firstName).eql('Bob');
              }
            })
            .end(next);
        });
      });

      it('queries across different parameters using JSON', function (next) {
        createTestUsers(function () {
          agent
            .get('/api/v1/user')
            .query({
              where: JSON.stringify({
                firstName: 'Bob'
              })
            })
            .expect('Content-Type', /json/)
            .expect(200)
            .expect(function (res) {
              should(res.body).be.ok();
              should(res.body.result).be.ok();
              should(res.body.result).have.lengthOf(9);

              for(var i = 0, j = res.body.result.length; i < j; i++) {
                should(res.body.result[i].firstName).be.ok();
                should(res.body.result[i].firstName).eql('Bob');
              }
            })
            .end(next);
        });
      });

      it('provides pagination options to the user', function (next) {
        createTestUsers(function () {
          agent
            .get('/api/v1/user')
            .query({
              limit: 5,
              skip: 10,
              sort: 'firstName'
            })
            .expect('Content-Type', /json/)
            .expect(200)
            .expect(function (res) {
              should(res.body).be.ok();
              should(res.body.result).be.ok();
              should(res.body.result).have.lengthOf(5);

              for(var i = 0, j = res.body.result.length; i < j; i++) {
                should(res.body.result[i].firstName).be.ok();
                should(res.body.result[i].firstName).eql('Bob');
              }
            })
            .end(next);
        });
      });

      it('returns an error for an invalid \'where\' number', function (next) {
        createTestUsers(function () {
          agent
            .get('/api/v1/user')
            .query({
              where: 5
            })
            .expect('Content-Type', /json/)
            .expect(400)
            .expect(function (res) {
              should(res.body).be.ok();
              should(res.body.error).be.ok();
              should(res.body.result).not.be.ok();
              should(res.body.error.name).be.ok();
              should(res.body.error.message).be.ok();
              should(res.body.error.name).eql('OryxError');
              should(res.body.error.message).be.a.String;
            })
            .end(next);
        });
      });

      it('returns an error for an invalid \'where\' string', function (next) {
        createTestUsers(function () {
          agent
            .get('/api/v1/user')
            .query({
              where: 'invalid string'
            })
            .expect('Content-Type', /json/)
            .expect(400)
            .expect(function (res) {
              should(res.body).be.ok();
              should(res.body.error).be.ok();
              should(res.body.result).not.be.ok();
              should(res.body.error.name).be.ok();
              should(res.body.error.message).be.ok();
              should(res.body.error.name).eql('OryxError');
              should(res.body.error.message).be.a.String;
            })
            .end(next);
        });
      });

    });

    describe('PUT /', function () {

      it('allows mass updates of matching documents', function (next) {
        createTestUsers(function () {
          agent
            .put('/api/v1/user')
            .query({
              where: {
                lastName: {
                  '!': 'Loblaw'
                }
              }
            })
            .send({
              lastName: 'Loblaw'
            })
            .expect('Content-Type', /json/)
            .expect(200, {
              success: true,
              result: {
                docs_updated: 10
              }
            }, function () {

              agent
                .get('/api/v1/user?limit=25')
                .expect('Content-Type', /json/)
                .expect(200)
                .expect(function (res) {
                  should(res.body).be.ok();
                  should(res.body.result).be.ok();
                  should(res.body.result).have.lengthOf(25);

                  for(var i = 0, j = res.body.result.length; i < j; i++) {
                    should(res.body.result[i].lastName).be.ok();
                    should(res.body.result[i].lastName).eql('Loblaw');
                  }
                })
                .end(next);

            });
        });
      });

      it('allows updating of N matching documents', function (next) {
        createTestUsers(function () {
          agent
            .put('/api/v1/user?limit=1')
            .send({
              lastName: {
                '!': 'Loblaw'
              }
            })
            .send({
              lastName: 'Loblaw'
            })
            .expect('Content-Type', /json/)
            .expect(200, {
              success: true,
              result: {
                docs_updated: 1
              }
            }, next);
        });
      });

      it('returns an error if no document is provided', function (next) {
        createTestUsers(function () {
          agent
            .put('/api/v1/user')
            .expect('Content-Type', /json/)
            .expect(400)
            .expect(function (res) {
              should(res.body).be.ok();
              should(res.body.error).be.ok();
              should(res.body.result).not.be.ok();
              should(res.body.error.name).be.ok();
              should(res.body.error.message).be.ok();
              should(res.body.error.name).eql('OryxError');
              should(res.body.error.message).eql('No body provided!');
            })
            .end(next);
        });
      });

    });

    describe('DELETE /', function () {

      it('removes all documents', function (next) {
        createTestUsers(function () {
          agent
            .delete('/api/v1/user')
            .expect('Content-Type', /json/)
            .expect(200, {
              success: true,
              result: {
                docs_removed: 25
              }
            }, next);
        });
      });

      it('removes N documents', function (next) {
        createTestUsers(function () {
          agent
            .delete('/api/v1/user?limit=10')
            .expect('Content-Type', /json/)
            .expect(200, {
              success: true,
              result: {
                docs_removed: 10
              }
            }, next);
        });
      });

      it('uses sort to remove documents', function (next) {
        createTestUsers(function () {
          agent
            .delete('/api/v1/user?limit=8&sort=firstName')
            .expect('Content-Type', /json/)
            .expect(200, {
              success: true,
              result: {
                docs_removed: 8
              }
            }, function () {

              agent
                .get('/api/v1/user?limit=25')
                .expect('Content-Type', /json/)
                .expect(200)
                .expect(function (res) {
                  should(res.body).be.ok();
                  should(res.body.result).be.ok();
                  should(res.body.result).have.lengthOf(17);

                  for(var i = 0, j = res.body.result.length; i < j; i++) {
                    should(res.body.result[i].lastName).be.ok();
                    should(res.body.result[i].lastName).not.eql('Barbara');
                  }
                })
                .end(next);
            });
        });
      });

      it('removes all documents matching a query', function (next) {
        createTestUsers(function () {
          agent
            .delete('/api/v1/user')
            .query({
              where: {
                firstName: 'Barbara'
              }
            })
            .expect('Content-Type', /json/)
            .expect(200, {
              success: true,
              result: {
                docs_removed: 8
              }
            }, function () {

              agent
                .get('/api/v1/user?limit=25')
                .expect('Content-Type', /json/)
                .expect(200)
                .expect(function (res) {
                  should(res.body).be.ok();
                  should(res.body.result).be.ok();
                  should(res.body.result).have.lengthOf(17);

                  for(var i = 0, j = res.body.result.length; i < j; i++) {
                    should(res.body.result[i].lastName).be.ok();
                    should(res.body.result[i].lastName).not.eql('Barbara');
                  }
                })
                .end(next);
            });
        });
      });

    });

    describe('GET /:id', function () {

      it('retrieves a model by id', function (next) {
        var user = {
          id: 1,
          firstName: 'Bob',
          lastName: 'Loblaw'
        };

        async.series([
          function (cb) {
            agent
              .post('/api/v1/user')
              .send(user)
              .expect('Content-Type', /json/)
              .expect(201, {
                success: true,                result: user
              }, cb);
          },
          function (cb) {
            agent
              .get('/api/v1/user/1')
              .expect('Content-Type', /json/)
              .expect(200, {
                success: true,                result: user
              }, cb);
          }
        ], next);
      });

      it('returns 404 if the instance is missing', function (next) {
        agent
          .get('/api/v1/user/15')
          .expect('Content-Type', /json/)
          .expect(404, next);
      });

    });

    describe('PUT /:id', function () {

      it('allow updating a model by id', function (next) {
        var user = {
          id: 1,
          firstName: 'Bob',
          lastName: 'Loblaw'
        };

        agent
          .post('/api/v1/user')
          .send(user)
          .expect('Content-Type', /json/)
          .expect(201, {
            success: true,            result: user
          }, function () {

            agent
              .put('/api/v1/user/1')
              .send({
                firstName: 'Bobby'
              })
              .expect('Content-Type', /json/)
              .expect(200, {
                success: true,                result: merge({}, user, {
                  firstName: 'Bobby'
                })
              }, next);

          });
      });

      it('returns 404 if the instance is missing', function (next) {
        agent
          .put('/api/v1/user/15')
          .expect('Content-Type', /json/)
          .expect(404, next);
      });

    });

    describe('DELETE /:id', function () {

      it('deletes a model by id', function (next) {
        var user = {
          id: 1,
          firstName: 'Bob',
          lastName: 'Loblaw'
        };

        async.series([
          function (cb) {
            agent
              .post('/api/v1/user')
              .send(user)
              .expect('Content-Type', /json/)
              .expect(201, {
                success: true,                result: user
              }, cb);
          },
          function (cb) {
            agent
              .get('/api/v1/user/1')
              .expect('Content-Type', /json/)
              .expect(200, {
                success: true,                result: user
              }, cb);
          },
          function (cb) {
            agent
              .delete('/api/v1/user/1')
              .expect('Content-Type', /json/)
              .expect(200, {
                success: true,                result: {
                  docs_removed: 1
                }
              }, cb);
          },
          function (cb) {
            agent
              .get('/api/v1/user/1')
              .expect('Content-Type', /json/)
              .expect(404, {
                success: false,                result: { }
              }, cb);
          }
        ], next);
      });

      it('returns 404 if the instance is missing', function (next) {
        agent
          .delete('/api/v1/user/15')
          .expect('Content-Type', /json/)
          .expect(404, next);
      });

    });

    describe('POST /:id', function () {

      it('finds an existing model', function (next) {
        var user = {
          id: 1,
          firstName: 'Bob',
          lastName: 'Loblaw'
        };

        agent
          .post('/api/v1/user')
          .send(user)
          .expect('Content-Type', /json/)
          .expect(201, {
            success: true,            result: user
          }, function () {

            agent
              .post('/api/v1/user/1')
              .send({
                id: 2,
                firstName: 'Bobby',
                lastName: 'Loblaw'
              })
              .expect('Content-Type', /json/)
              .expect(200, {
                success: true,                result: user
              }, next);

          });
      });

      it('finds and creates a missing model', function (next) {
        var user = {
          id: 1,
          firstName: 'Bob',
          lastName: 'Loblaw'
        };

        agent
          .post('/api/v1/user/1')
          .send(user)
          .expect('Content-Type', /json/)
          .expect(200, {
            success: true,            result: user
          }, next);
      });

    });

    describe('GET /info', function () {

      it('returns basic model information', function (next) {
        agent
          .get('/api/v1/user/info')
          .expect('Content-Type', /json/)
          .expect(200, {
            success: true,            result: {
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
                'GET /custom_route',
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

    describe('GET /count', function () {

      it('counts model instances', function (next) {
        createTestUsers(function () {
          agent
            .get('/api/v1/user/count')
            .expect('Content-Type', /json/)
            .expect(200, {
              success: true,
              result: {
                doc_count: 25
              }
            }, next);
        });
      });

      it('counts instances up to N', function (next) {
        createTestUsers(function () {
          agent
            .get('/api/v1/user/count?limit=10')
            .expect('Content-Type', /json/)
            .expect(200, {
              success: true,
              result: {
                doc_count: 10
              }
            }, next);
        });
      });

      it('counts instances matching a query', function (next) {
        createTestUsers(function () {
          agent
            .get('/api/v1/user/count')
            .query({
              where: {
                firstName: 'Bob'
              }
            })
            .expect('Content-Type', /json/)
            .expect(200, {
              success: true,
              result: {
                doc_count: 9
              }
            }, next);
        });
      });

    });

    describe('GET /distinct/:field', function () {

      it('finds distinct values for a field', function (next) {
        createTestUsers(function () {
          agent
            .get('/api/v1/user/distinct/firstName')
            .expect('Content-Type', /json/)
            .expect(200, {
              success: true,
              result: ['Bob', 'Barbara', 'Bobby']
            }, next);
        });
      });

      it('finds N distinct values for a field', function (next) {
        createTestUsers(function () {
          agent
            .get('/api/v1/user/distinct/firstName?limit=3')
            .expect('Content-Type', /json/)
            .expect(200, {
              success: true,
              result: ['Bob', 'Barbara']
            }, next);
        });
      });

      it('sorts and returns distinct fields', function (next) {
        createTestUsers(function () {
          agent
            .get('/api/v1/user/distinct/firstName?sort=firstName')
            .expect('Content-Type', /json/)
            .expect(200, {
              success: true,
              result: ['Barbara', 'Bob', 'Bobby']
            }, next);
        });
      });

      it('sorts, limits and returns distinct fields', function (next) {
        createTestUsers(function () {
          agent
            .get('/api/v1/user/distinct/firstName?sort=firstName')
            .query({
              limit: 1
            })
            .expect('Content-Type', /json/)
            .expect(200, {
              success: true,
              result: ['Barbara']
            }, next);
        });
      });

      it('returns distinct values matching a query', function (next) {
        createTestUsers(function () {
          agent
            .get('/api/v1/user/distinct/firstName')
            .query({
              where: {
                firstName: {
                  startsWith: 'Bob'
                }
              }
            })
            .expect('Content-Type', /json/)
            .expect(200, {
              success: true,
              result: ['Bob', 'Bobby']
            }, next);
        });
      });

      it('sorts distinct values matching a query', function (next) {
        createTestUsers(function () {
          agent
            .get('/api/v1/user/distinct/firstName')
            .query({
              sort: {
                firstName: 'DESC'
              },
              where: {
                firstName: {
                  startsWith: 'Bob'
                }
              }
            })
            .expect('Content-Type', /json/)
            .expect(200, {
              success: true,
              result: ['Bobby', 'Bob']
            }, next);
        });
      });

    });

  });

});
