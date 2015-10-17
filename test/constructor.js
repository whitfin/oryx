var express = require('express');
var path = require('path');
var should = require('should');

var Oryx = require('../');
var resources = './test/resources';

describe('Constructor', function () {

  var app = express();

  it('requires an Express app as the first argument', function () {
    should.throws(
      function () {
        new Oryx();
      },
      Oryx.OryxError
    );
  });

  it('only accepts Express-like apps', function () {
    should.throws(
      function () {
        new Oryx({
          // fake an app
        });
      },
      Oryx.OryxError
    );
  });

  it('handles non-object options', function () {
    new Oryx(app);
    new Oryx(app, 5);
    new Oryx(app, '5');
    new Oryx(app, null);
  });

  it('adds several read-only values to the instance', function () {
    var h = new Oryx(app);

    should(h.app).be.ok();
    should(h.app_root).be.ok();
    should(h.config).be.ok();
    should(h.logger).be.ok();
    should(h.orm).be.ok();
    should(h.profile).be.ok();
  });

  describe('app_root option', function () {

    it('allows for overriding the application root', function () {
      var h = new Oryx(app, {
        app_root: path.resolve(resources),
        config_root: 'config',
        profile: 'development'
      });

      should(h.profile).be.ok();
      should(h.profile).eql('development');
      should(h.config.what_line).be.ok();
      should(h.config.what_line).eql(5);
    });

    it('defaults to detecting the app root', function () {
      var h = new Oryx(app);

      should(h.app_root).be.ok();
      should(h.app_root).eql(path.resolve('./'));
    });

  });

  describe('config_root option', function () {

    it('allows for overriding the config path', function () {
      should.throws(
        function () {
          new Oryx(app, {
            config_root: 'config/directory',
            profile: 'development'
          });
        },
        Oryx.OryxError
      );

      try {
        new Oryx(app, {
          config_root: 'config/directory',
          profile: 'development'
        });
      } catch(e) {
        should(e.message).startWith('Cannot find module');
        should(e.message).endWith('/oryx/config/directory/development\'');
      }
    });

    it('defaults to using ./config', function () {
      should.throws(
        function () {
          new Oryx(app, {
            profile: 'development'
          });
        },
        Oryx.OryxError
      );

      try {
        new Oryx(app, {
          profile: 'development'
        });
      } catch(e) {
        should(e.message).startWith('Cannot find module');
        should(e.message).endWith('/oryx/config/development\'');
      }
    });

  });

  describe('profile option', function () {

    it('can accept a custom profile', function () {
      var h = new Oryx(app, {
        config_root: resources + '/config',
        profile: 'development'
      });

      should(h.profile).be.ok();
      should(h.profile).eql('development');
    });

    it('can use an profile variable to set the profile', function () {
      process.env['NODE_ENV'] = 'development';

      var h = new Oryx(app, {
        config_root: resources + '/config'
      });

      should(h.profile).be.ok();
      should(h.profile).eql('development');

      delete process.env['NODE_ENV'];
    });

    it('can set a default value', function () {
      var h = new Oryx(app, {
        config_root: resources + '/config'
      });

      should(h.profile).be.ok();
      should(h.profile).eql('default');

      delete process.env['NODE_ENV'];
    });

  });

});
