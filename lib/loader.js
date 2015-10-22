// core modules
var path = require('path');

// npm modules
var merge = require('lodash.merge');

// local modules
var OryxError = require('./error');

// due to a strange waterline adapter nuance
// that I don't really understand, we need to
// refresh the reference to the adapter on
// every instance, to avoid clashes between them
function refresh(module) {
  delete require.cache[require.resolve(module)];
  return require(module);
}

/**
 * A pretty basic configuration loader, loading both
 * a default configuration and an environment-specific
 * configuration, merging the latter over the former.
 *
 * If a configuration cannot be loaded, it fails silently
 * unless we're running in a non-development environment.
 * This is (obviously) to avoid cases such as writing to
 * the wrong database, and so on.
 *
 * @param root the application root
 * @param dir the config directory
 * @param profile the profile to load
 * @returns {*}
 */
module.exports = function loader(root, dir, profile) {
  // holder for the config
  var config;

  // resolve the path to the custom configuration
  // directory, as specified by the user
  var config_dir = path.resolve(root, dir);

  try {
    // load default configuration from the config dir -
    // this file should always be named default.js
    config = require(path.resolve(config_dir, 'default'));
  } catch(e) {
    config = { };
  }

  // if there is no environment set, then we simply return the default
  // profile - this takes into account null/undefined and wasted merges
  if(profile === null || profile === undefined || profile === 'default') {
    return ensure(config);
  }

  try {
    // load the necessary configuration for the environment,
    // and merge it over the default configuration - this
    // provides a very simple override method
    merge(config, require(path.resolve(config_dir, profile)));
  } catch(e) {
    // throw errors in order to disrupt the Promise chain
    throw new OryxError(e.message);
  }

  // return new config
  return ensure(config);
};

/**
 * Ensures that a configuration has all necessary properties.
 * At present, this ensures that ORM settings are defined if
 * missing, in order to allow for basic usage.
 *
 * @param config the configuration to ensure
 * @returns {Object}
 */
function ensure(config) {
  // ensure ORM, add a default memory entry
  var merged = merge({
    waterline: {
      adapters: {
        memory: refresh('sails-memory')
      },
      connections: {
        'default': {
          adapter: 'memory'
        }
      }
    }
  }, config);

  // return a frozen configuration
  return Object.freeze(merged);
}