var should = require('should');

var loader = require('../lib/loader');
var Oryx = require('../');

var config_path = 'resources/config';

describe('Loader', function () {

  it('can load a default config', function () {
    var conf = loader(__dirname, config_path, 'development');

    should(conf).be.ok();

    should(conf.waterline).be.ok();
    should(conf.waterline.adapters).be.ok();
    should(conf.waterline.adapters.memory).be.ok();
    should(conf.waterline.adapters.memory.identity).be.ok();
    should(conf.waterline.adapters.memory.identity).eql('sails-memory');

    should(conf.waterline.connections).be.ok();
    should(conf.waterline.connections.default).be.ok();
    should(conf.waterline.connections.default.adapter).be.ok();
    should(conf.waterline.connections.default.adapter).eql('memory');
  });

  it('is able to handle a null profile', function () {
    var conf = loader(__dirname, config_path, null);

    should(conf).be.ok();

    should(conf.waterline).be.ok();
    should(conf.waterline.adapters).be.ok();
    should(conf.waterline.adapters.memory).be.ok();
    should(conf.waterline.adapters.memory.identity).be.ok();
    should(conf.waterline.adapters.memory.identity).eql('sails-memory');

    should(conf.waterline.connections).be.ok();
    should(conf.waterline.connections.default).be.ok();
    should(conf.waterline.connections.default.adapter).be.ok();
    should(conf.waterline.connections.default.adapter).eql('memory');
  });

  it('is able to handle an undefined profile', function () {
    var conf = loader(__dirname, config_path, undefined);

    should(conf).be.ok();

    should(conf.waterline).be.ok();
    should(conf.waterline.adapters).be.ok();
    should(conf.waterline.adapters.memory).be.ok();
    should(conf.waterline.adapters.memory.identity).be.ok();
    should(conf.waterline.adapters.memory.identity).eql('sails-memory');

    should(conf.waterline.connections).be.ok();
    should(conf.waterline.connections.default).be.ok();
    should(conf.waterline.connections.default.adapter).be.ok();
    should(conf.waterline.connections.default.adapter).eql('memory');
  });

  it('is able to handle an invalid default profile', function () {
    var conf = loader(__dirname, 'resources/invalid_config', undefined);

    should(conf).be.ok();

    should(conf.waterline).be.ok();
    should(conf.waterline.adapters).be.ok();
    should(conf.waterline.adapters.memory).be.ok();
    should(conf.waterline.adapters.memory.identity).be.ok();
    should(conf.waterline.adapters.memory.identity).eql('sails-memory');

    should(conf.waterline.connections).be.ok();
    should(conf.waterline.connections.default).be.ok();
    should(conf.waterline.connections.default.adapter).be.ok();
    should(conf.waterline.connections.default.adapter).eql('memory');
  });

  it('correctly merges new configurations', function () {
    var conf = loader(__dirname, config_path, 'development');

    should(conf).be.ok();

    should(conf.waterline).be.ok();
    should(conf.what_line).be.ok();
    should(conf.what_line).eql(5);

    should(conf.waterline.adapters).be.ok();
    should(conf.waterline.adapters.memory).be.ok();
    should(conf.waterline.adapters.memory.identity).be.ok();
    should(conf.waterline.adapters.memory.identity).eql('sails-memory');

    should(conf.waterline.custom_value).be.ok();
    should(conf.waterline.custom_value).eql(5);

    should(conf.waterline.connections).be.ok();
    should(conf.waterline.connections.default).be.ok();
    should(conf.waterline.connections.default.adapter).be.ok();
    should(conf.waterline.connections.default.adapter).eql('memory');
  });

  it('does not throw an error if it fails to load the default config', function () {
    loader(__dirname, config_path, 'default');
  });

  it('throws an Error if an invalid profile is provided', function () {
    should.throws(
      function () {
        loader(__dirname, config_path, 'production');
      },
      Oryx.OryxError
    );

    try {
      loader(__dirname, config_path, 'production');
    } catch(e) {
      should(e.message).startWith('Cannot find module');
      should(e.message).endWith('/resources/config/production\'');
    }
  });

});
