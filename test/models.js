var express = require('express');
var path = require('path');
var should = require('should');

var Oryx = require('../');
var resources = './test/resources';

describe('Models', function () {

  describe('via Promise', function () {

    it('automatically loads models by default', function (next) {
      var app = express();

      var oryx = new Oryx(app, {
        app_root: path.resolve(resources),
        log_level: 'error'
      });

      oryx
        .models()
        .then(function (models) {
          should(models).be.ok();
          should(models.length).eql(1);
          should(models[0]).eql('user');
        })
        .then(next)
        .catch(next);
    });

    it('loads models from a given directory', function (next) {
      var app = express();

      var oryx = new Oryx(app, {
        app_root: path.resolve(resources),
        log_level: 'error'
      });

      oryx
        .models({
          path: './custom_models'
        })
        .then(function (models) {
          should(models).be.ok();
          should(models.length).eql(1);
          should(models[0]).eql('custom_user');
        })
        .then(next)
        .catch(next);
    });

    it('loads models from a several directories', function (next) {
      var app = express();

      var oryx = new Oryx(app, {
        app_root: path.resolve(resources),
        log_level: 'error'
      });

      oryx
        .models({
          path: ['./custom_models','./models']
        })
        .then(function (models) {
          should(models).be.ok();
          should(models.length).eql(2);
          should(models[0]).eql('custom_user');
          should(models[1]).eql('user');
        })
        .then(next)
        .catch(next);
    });

    it('ignores invalid models', function (next) {
      var app = express();

      var oryx = new Oryx(app, {
        app_root: path.resolve(resources),
        log_level: 'error'
      });

      oryx
        .models({
          path: ['./invalid_models']
        })
        .then(function (models) {
          should(models).be.ok();
          should(models.length).eql(0);
        })
        .then(next)
        .catch(next);
    });

    it('safely ignores invalid models whilst loading other models', function (next) {
      var app = express();

      var oryx = new Oryx(app, {
        app_root: path.resolve(resources),
        log_level: 'error'
      });

      oryx
        .models({
          path: ['./custom_models','./models','./invalid_models']
        })
        .then(function (models) {
          should(models).be.ok();
          should(models.length).eql(2);
          should(models[0]).eql('custom_user');
          should(models[1]).eql('user');
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
        .models({
          path: ['./missing_folder']
        })
        .catch(function (err) {
          should(err).be.ok();
          should(err.message).be.ok();
          should(err.message).startWith('Unable to read model directory: ');
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
        .models({
          path: ['./models/user.js']
        })
        .catch(function (err) {
          should(err).be.ok();
          should(err.message).be.ok();
          should(err.message).startWith('Unable to read model directory: ');
          should(err.message).endWith('oryx/test/resources/models/user.js');
          next();
        });
    });

  });

  describe('via callback', function () {

    it('automatically loads models by default', function (next) {
      var app = express();

      var oryx = new Oryx(app, {
        app_root: path.resolve(resources),
        log_level: 'error'
      });

      oryx.models(function (err, models) {
        if(err) {
          return next(err);
        }

        should(models).be.ok();
        should(models.length).eql(1);
        should(models[0]).eql('user');

        next();
      });
    });

    it('loads models from a given directory', function (next) {
      var app = express();

      var oryx = new Oryx(app, {
        app_root: path.resolve(resources),
        log_level: 'error'
      });

      oryx.models({
        path: './custom_models'
      }, function (err, models) {
        if(err) {
          return next(err);
        }

        should(models).be.ok();
        should(models.length).eql(1);
        should(models[0]).eql('custom_user');

        next();
      });
    });

    it('loads models from a several directories', function (next) {
      var app = express();

      var oryx = new Oryx(app, {
        app_root: path.resolve(resources),
        log_level: 'error'
      });

      oryx.models({
        path: ['./custom_models','./models']
      }, function (err, models) {
        if(err) {
          return next(err);
        }

        should(models).be.ok();
        should(models.length).eql(2);
        should(models[0]).eql('custom_user');
        should(models[1]).eql('user');

        next();
      });
    });

    it('ignores invalid models', function (next) {
      var app = express();

      var oryx = new Oryx(app, {
        app_root: path.resolve(resources),
        log_level: 'error'
      });

      oryx.models({
        auto: true,
        path: ['./invalid_models']
      }, function (err, models) {
        if(err) {
          return next(err);
        }

        should(models).be.ok();
        should(models.length).eql(0);

        next();
      });
    });

    it('safely ignores invalid models whilst loading other models', function (next) {
      var app = express();

      var oryx = new Oryx(app, {
        app_root: path.resolve(resources),
        log_level: 'error'
      });

      oryx.models({
        path: ['./custom_models','./models','./invalid_models']
      }, function (err, models) {
        if(err) {
          return next(err);
        }

        should(models).be.ok();
        should(models.length).eql(2);
        should(models[0]).eql('custom_user');
        should(models[1]).eql('user');

        next();
      });
    });

    it('throws an error if a missing directory is provided', function (next) {
      var app = express();

      var oryx = new Oryx(app, {
        app_root: path.resolve(resources),
        log_level: 'error'
      });

      oryx.models({
        path: ['./missing_folder']
      }, function (err) {
        should(err).be.ok();
        should(err.message).be.ok();
        should(err.message).startWith('Unable to read model directory: ');
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

      oryx.models({
        path: ['./models/user.js']
      }, function (err) {
        should(err).be.ok();
        should(err.message).be.ok();
        should(err.message).startWith('Unable to read model directory: ');
        should(err.message).endWith('oryx/test/resources/models/user.js');
        next();
      });
    });

  });

});
