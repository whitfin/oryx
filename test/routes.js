var express = require('express');
var path = require('path');
var should = require('should');
var supertest = require('supertest');

var Oryx = require('../');
var resources = './test/resources';

describe('Routes', function () {

  describe('via Promise', function () {

    it('automatically loads an api by default', function (next) {
      var app = express();
      var agent = supertest.agent(app);

      var oryx = new Oryx(app, {
        app_root: path.resolve(resources),
        log_level: 'error'
      });

      oryx
        .routes()
        .then(function (apis) {
          should(apis).be.ok();
          should(apis.length).eql(1);
          should(apis[0]).eql('v1');
        })
        .then(function () {
          agent
            .get('/api/v1/')
            .expect('Content-Type', /json/)
            .expect(200, {
              directory: 'routes'
            }, next);
        })
        .catch(next);
    });

    it('loads routes from a given directory', function (next) {
      var app = express();
      var agent = supertest.agent(app);

      var oryx = new Oryx(app, {
        app_root: path.resolve(resources),
        log_level: 'error'
      });

      oryx
        .routes({
          path: './api'
        })
        .then(function (apis) {
          should(apis).be.ok();
          should(apis.length).eql(1);
          should(apis[0]).eql('v1');
        })
        .then(function () {
          agent
            .get('/api/v1/')
            .expect('Content-Type', /json/)
            .expect(200, {
              directory: 'api'
            }, next);
        })
        .catch(next);
    });

    it('loads a list of custom apis', function (next) {
      var app = express();
      var agent = supertest.agent(app);

      var oryx = new Oryx(app, {
        app_root: path.resolve(resources),
        log_level: 'error'
      });

      oryx
        .routes({
          apis: [
            {
              version: 'v1',
              path: './api/v1'
            },
            {
              version: 'v2',
              path: './routes/api/v1'
            }
          ]
        })
        .then(function (apis) {
          should(apis).be.ok();
          should(apis.length).eql(2);
          should(apis[0]).eql('v1');
          should(apis[1]).eql('v2');
        })
        .then(function () {
          agent
            .get('/api/v1/')
            .expect('Content-Type', /json/)
            .expect(200, {
              directory: 'api'
            }, function (err) {
              if(err) {
                return next(err);
              }

              agent
                .get('/api/v2/')
                .expect('Content-Type', /json/)
                .expect(200, {
                  directory: 'routes'
                }, next);
            });
        })
        .catch(next);
    });

    it('allows mounting routes onto a custom base path', function (next) {
      var app = express();
      var agent = supertest.agent(app);

      var oryx = new Oryx(app, {
        app_root: path.resolve(resources),
        log_level: 'error'
      });

      oryx
        .routes({
          root: '/my-api/'
        })
        .then(function (apis) {
          should(apis).be.ok();
          should(apis.length).eql(1);
          should(apis[0]).eql('v1');
        })
        .then(function () {
          agent
            .get('/my-api/v1/')
            .expect('Content-Type', /json/)
            .expect(200, {
              directory: 'routes'
            }, next);
        })
        .catch(next);
    });

    it('allows mounting routes onto a custom base path with no trailing /', function (next) {
      var app = express();
      var agent = supertest.agent(app);

      var oryx = new Oryx(app, {
        app_root: path.resolve(resources),
        log_level: 'error'
      });

      oryx
        .routes({
          root: '/my-api'
        })
        .then(function (apis) {
          should(apis).be.ok();
          should(apis.length).eql(1);
          should(apis[0]).eql('v1');
        })
        .then(function () {
          agent
            .get('/my-api/v1/')
            .expect('Content-Type', /json/)
            .expect(200, {
              directory: 'routes'
            }, next);
        })
        .catch(next);
    });

    it('handles a single api parameter', function (next) {
      var app = express();
      var agent = supertest.agent(app);

      var oryx = new Oryx(app, {
        app_root: path.resolve(resources),
        log_level: 'error'
      });

      oryx
        .routes({
          apis: {
            version: 'v1',
            path: './api/v1'
          }
        })
        .then(function (apis) {
          should(apis).be.ok();
          should(apis.length).eql(1);
          should(apis[0]).eql('v1');
        })
        .then(function () {
          agent
            .get('/api/v1/')
            .expect('Content-Type', /json/)
            .expect(200, {
              directory: 'api'
            }, next);
        })
        .catch(next);
    });

    it('handles an api without a version', function (next) {
      var app = express();
      var agent = supertest.agent(app);

      var oryx = new Oryx(app, {
        app_root: path.resolve(resources),
        log_level: 'error'
      });

      oryx
        .routes({
          apis: {
            path: './api/v1'
          }
        })
        .then(function (apis) {
          should(apis).be.ok();
          should(apis.length).eql(1);
          should(apis[0]).eql('v1');
        })
        .then(function () {
          agent
            .get('/api/v1/')
            .expect('Content-Type', /json/)
            .expect(200, {
              directory: 'api'
            }, next);
        })
        .catch(next);
    });

    it('ignores un-versioned api directories', function (next) {
      var app = express();
      var agent = supertest.agent(app);

      var oryx = new Oryx(app, {
        app_root: path.resolve(resources),
        log_level: 'error'
      });

      oryx
        .routes({
          path: './unversioned_api'
        })
        .then(function (apis) {
          should(apis).be.ok();
          should(apis.length).eql(0);
        })
        .then(function () {
          agent
            .get('/api/none/')
            .expect(404, next);
        })
        .catch(next);
    });

    it('safely ignores invalid route definitions', function (next) {
      var app = express();

      var oryx = new Oryx(app, {
        app_root: path.resolve(resources),
        log_level: 'error'
      });

      oryx
        .routes({
          path: './invalid_api/api'
        })
        .then(function (apis) {
          should(apis).be.ok();
          should(apis.length).eql(0);
        })
        .then(next)
        .catch(next);
    });

    it('throws an error if a missing directory is provided', function (next) {
      var app = express();

      var oryx = new Oryx(app, {
        app_root: path.resolve(resources),
        log_level: 'error'
      });

      oryx
        .routes({
          path: './missing_folder'
        })
        .catch(function (err) {
          should(err).be.ok();
          should(err.message).be.ok();
          should(err.message).startWith('Unable to read API directory: ');
          should(err.message).endWith('oryx/test/resources/missing_folder');
          next();
        });
    });

    it('throws an error if an invalid directory is provided', function (next) {
      var app = express();

      var oryx = new Oryx(app, {
        app_root: path.resolve(resources),
        log_level: 'error'
      });

      oryx
        .routes({
          apis: {
            path: './api/v1/index.js'
          }
        })
        .catch(function (err) {
          should(err).be.ok();
          should(err.message).be.ok();
          should(err.message).startWith('Unable to read API directory: ');
          should(err.message).endWith('oryx/test/resources/api/v1/index.js');
          next();
        });
    });

  });

  describe('via callback', function () {

    it('automatically loads an api by default', function (next) {
      var app = express();
      var agent = supertest.agent(app);

      var oryx = new Oryx(app, {
        app_root: path.resolve(resources),
        log_level: 'error'
      });

      oryx.routes(function (err, apis) {
        if(err) {
          return next(err);
        }

        should(apis).be.ok();
        should(apis.length).eql(1);
        should(apis[0]).eql('v1');

        agent
          .get('/api/v1/')
          .expect('Content-Type', /json/)
          .expect(200, {
            directory: 'routes'
          }, next);
      });
    });

    it('loads routes from a given directory', function (next) {
      var app = express();
      var agent = supertest.agent(app);

      var oryx = new Oryx(app, {
        app_root: path.resolve(resources),
        log_level: 'error'
      });

      oryx.routes({
        path: './api'
      }, function (err, apis) {
        if (err) {
          return next(err);
        }

        should(apis).be.ok();
        should(apis.length).eql(1);
        should(apis[0]).eql('v1');

        agent
          .get('/api/v1/')
          .expect('Content-Type', /json/)
          .expect(200, {
            directory: 'api'
          }, next);
      });
    });

    it('loads a list of custom apis', function (next) {
      var app = express();
      var agent = supertest.agent(app);

      var oryx = new Oryx(app, {
        app_root: path.resolve(resources),
        log_level: 'error'
      });

      oryx.routes({
        apis: [
          {
            version: 'v1',
            path: './api/v1'
          },
          {
            version: 'v2',
            path: './routes/api/v1'
          },
          {
            base: 'v3',
            path: './routes/api/v1'
          }
        ]
      }, function (err, apis) {
        if (err) {
          return next(err);
        }

        should(apis).be.ok();
        should(apis.length).eql(3);
        should(apis[0]).eql('v1');
        should(apis[1]).eql('v2');
        should(apis[2]).eql('v3');

        agent
          .get('/api/v1/')
          .expect('Content-Type', /json/)
          .expect(200, {
            directory: 'api'
          }, function (err) {
            if(err) {
              return next(err);
            }

            agent
              .get('/api/v2/')
              .expect('Content-Type', /json/)
              .expect(200, {
                directory: 'routes'
              }, function (err) {
                if(err) {
                  return next(err);
                }

                agent
                  .get('/api/v3/')
                  .expect('Content-Type', /json/)
                  .expect(200, {
                    directory: 'routes'
                  }, next);
              });
          });
      });
    });

    it('allows mounting routes onto a custom base path', function (next) {
      var app = express();
      var agent = supertest.agent(app);

      var oryx = new Oryx(app, {
        app_root: path.resolve(resources),
        log_level: 'error'
      });

      oryx.routes({
        root: '/my-api/'
      }, function (err, apis) {
        if (err) {
          return next(err);
        }

        should(apis).be.ok();
        should(apis.length).eql(1);
        should(apis[0]).eql('v1');

        agent
          .get('/my-api/v1/')
          .expect('Content-Type', /json/)
          .expect(200, {
            directory: 'routes'
          }, next);
      });
    });

    it('allows mounting routes onto a custom base path with no trailing /', function (next) {
      var app = express();
      var agent = supertest.agent(app);

      var oryx = new Oryx(app, {
        app_root: path.resolve(resources),
        log_level: 'error'
      });

      oryx.routes({
        root: '/my-api'
      }, function (err, apis) {
        if (err) {
          return next(err);
        }

        should(apis).be.ok();
        should(apis.length).eql(1);
        should(apis[0]).eql('v1');

        agent
          .get('/my-api/v1/')
          .expect('Content-Type', /json/)
          .expect(200, {
            directory: 'routes'
          }, next);
      });
    });

    it('handles a single api parameter', function (next) {
      var app = express();
      var agent = supertest.agent(app);

      var oryx = new Oryx(app, {
        app_root: path.resolve(resources),
        log_level: 'error'
      });

      oryx.routes({
        apis: {
          api: 'v1',
          path: './api/v1'
        }
      }, function (err, apis) {
        if (err) {
          return next(err);
        }

        should(apis).be.ok();
        should(apis.length).eql(1);
        should(apis[0]).eql('v1');

        agent
          .get('/api/v1/')
          .expect('Content-Type', /json/)
          .expect(200, {
            directory: 'api'
          }, next);
      });
    });

    it('handles an api without a version', function (next) {
      var app = express();
      var agent = supertest.agent(app);

      var oryx = new Oryx(app, {
        app_root: path.resolve(resources),
        log_level: 'error'
      });

      oryx.routes({
        apis: {
          path: './api/v1'
        }
      }, function (err, apis) {
        if (err) {
          return next(err);
        }

        should(apis).be.ok();
        should(apis.length).eql(1);
        should(apis[0]).eql('v1');

        agent
          .get('/api/v1/')
          .expect('Content-Type', /json/)
          .expect(200, {
            directory: 'api'
          }, next);
      });
    });

    it('ignores un-versioned api directories', function (next) {
      var app = express();
      var agent = supertest.agent(app);

      var oryx = new Oryx(app, {
        app_root: path.resolve(resources),
        log_level: 'error'
      });

      oryx.routes({
        path: './unversioned_api'
      }, function (err, apis) {
        if (err) {
          return next(err);
        }

        should(apis).be.ok();
        should(apis.length).eql(0);

        agent
          .get('/api/none/')
          .expect(404, next);
      });
    });

    it('ignores invalid versions in custom APIs', function (next) {
      var app = express();
      var agent = supertest.agent(app);

      var oryx = new Oryx(app, {
        app_root: path.resolve(resources),
        log_level: 'error'
      });

      oryx.routes({
        apis: {
          version: 'test',
          path: './api/v1'
        }
      }, function (err, apis) {
        if (err) {
          return next(err);
        }

        should(apis).be.ok();
        should(apis.length).eql(0);

        agent
          .get('/api/test/')
          .expect(404, next);
      });
    });

    it('safely ignores invalid route definitions', function (next) {
      var app = express();

      var oryx = new Oryx(app, {
        app_root: path.resolve(resources),
        log_level: 'error'
      });

      oryx.routes({
        path: './invalid_api/api'
      }, function (err, apis) {
        if (err) {
          return next(err);
        }

        should(apis).be.ok();
        should(apis.length).eql(0);

        next();
      });
    });

    it('throws an error if a missing directory is provided', function (next) {
      var app = express();

      var oryx = new Oryx(app, {
        app_root: path.resolve(resources),
        log_level: 'error'
      });

      oryx.routes({
        path: './missing_folder'
      }, function (err) {
        should(err).be.ok();
        should(err.message).be.ok();
        should(err.message).startWith('Unable to read API directory: ');
        should(err.message).endWith('oryx/test/resources/missing_folder');
        next();
      });
    });

    it('throws an error if an invalid directory is provided', function (next) {
      var app = express();

      var oryx = new Oryx(app, {
        app_root: path.resolve(resources),
        log_level: 'error'
      });

      oryx.routes({
        apis: {
          path: './api/v1/index.js'
        }
      }, function (err) {
        should(err).be.ok();
        should(err.message).be.ok();
        should(err.message).startWith('Unable to read API directory: ');
        should(err.message).endWith('oryx/test/resources/api/v1/index.js');
        next();
      });
    });

  });

});
