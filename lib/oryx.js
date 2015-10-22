// core modules
var fs = require('fs');
var path = require('path');

// npm modules
var app_root_path = require('app-root-path').path;
var Bluebird = require('bluebird');
var bodyparser = require('body-parser');
var merge = require('lodash.merge');
var micromatch = require('micromatch');
var Waterline = require('waterline');
var winston = require('winston');

// local modules
var loader = require('./loader');
var routes = require('./routes');

// exposed modules
var OryxError = require('./error');
var OryxResponse = require('./response');

// our list of valid HTTP methods
// to be accepted on custom routes
const valid_methods = [
  'GET', 'POST', 'PUT', 'DELETE',
  'PATCH', 'HEAD', 'OPTIONS', 'TRACE'
];

// a regular expression to validate
// that routes use the correct syntax
const route_regex = new RegExp(
  '(' + valid_methods.join('|') + ') \/[a-z]*', 'i'
);

// a json parser for use with any routes
const json_parser = bodyparser.json({ type: '*/*' });

// bootstrapping is done here in order
// to ensure that the 'fs' module has
// a Promise interface
(function () {
  Bluebird.promisifyAll(fs);
})();

/**
 * Constructor for Oryx, setting up the configuration for
 * the designated profile (defaulting to 'development'),
 * and creating a new ORM instance (currently Waterline).
 *
 * @param app the Express application
 * @param opts the custom options
 * @constructor
 */
function Oryx(app, opts) {
  // check for a valid application or agent
  if(!app || !app.listen) {
    throw new OryxError('Invalid app passed to Oryx!');
  }

  // check for the x-powered-by setting so that
  // we don't set it if the user doesn't want it
  if(app.get('x-powered-by')) {
    // we add a piece of middleware in order to
    // override the header on request, adding Oryx
    app.use(function (req, res, next) {
      res.header('X-Powered-By', 'Oryx & Express');
      next();
    });
  }

  // ensure valid options
  opts = Object(opts);

  // read in both an environment and a path to the configuration directory
  // they default to 'development' and './config' respectively - also load
  // any attempts at overriding the root of the application itself
  var app_root = opts['app_root'] || app_root_path;
  var config_path = opts['config_root'] || 'config';
  var profile = opts['profile'] || process.env['NODE_ENV'] || 'default';

  // define all properties on the instance
  // this is to ensure no overwriting
  Object.defineProperties(this, {
    // store a reference to the Express
    // application, for use when defining
    // routes and models
    app: {
      value: app
    },

    // set a custom application root this is
    // used to override the app-root-path module
    app_root: {
      value: app_root
    },

    // a place to store anything being bound
    // to this instance at runtime
    bindings: {
      value: {
        routes: routes
      }
    },

    // use the config loader to load and merge the necessary
    // configuration files, based on the passed in profile
    // or using the default values
    config: {
      value: loader(app_root, config_path, profile)
    },

    // we need a winston logger specific to this
    // instance, as log levels may be different
    // per instance of Oryx
    logger: {
      value: new winston.Logger({
        transports: [ new winston.transports.Console({ level: opts['log_level'] || 'debug' }) ]
      })
    },

    // create a single ORM for this instance,
    // used for defining any needed models
    orm: {
      value: new Waterline()
    },

    // store the profile string, just in case
    // we might need to use it again at any point
    profile: {
      value: profile
    }
  });
}

/**
 * A shorthand method for autowiring a Oryx instance
 * using the default values for both models and routes.
 *
 * This method will return a (Bluebird) Promise instance,
 * but also accepts a Node.js style callback.
 *
 * @param opts any custom options
 * @param cb a possible callback
 * @returns {Promise<R>|void}
 */
Oryx.prototype.autowire = function autowire(opts, cb) {
  // store a reference
  var _this = this;

  // ensure we parse function args correctly, in
  // case there are no options defined
  if (!cb && typeof opts === 'function') {
    cb = opts;
    opts = {};
  }

  // force an object from the options
  opts = Object(opts);

  // start the Promise chain
  return _this

    // load the models with the
    // given provided options
    .models(opts.models)

    // load the routes with the
    // given provided options
    .then(function (models) {

      // we need to resolve the models back to the Promise chain
      // in order to forward both them and the API back to the user
      return [Bluebird.resolve(models), _this.routes(opts.routes)];
    })

    // we have to then spread the result in order
    // to get both the models and apis back together
    .spread(function (models, apis) {
      return [models, apis];
    })

    // call any potential Node.js style callback
    .nodeify(cb, { spread: true });
};

/**
 * Binds all models to the Oryx instance, using either
 * custom options or a set of defaults. Allows for basic
 * automated loading (if the app is laid out correctly).
 * Returns a (Bluebird) Promise instance, but also accepts
 * a Node.js style callback.
 *
 * This method should be called before bindRoutes due to
 * the models being bootstrapped onto the instance.
 *
 * @param opts any custom options
 * @param cb a possible callback
 * @returns {Promise<R>|void}
 */
Oryx.prototype.models = function models(opts, cb) {
  // ensure we parse function args correctly, in
  // case there are no options defined
  if (!cb && typeof opts === 'function') {
    cb = opts;
    opts = {};
  }

  // force an object from the options
  opts = Object(opts);

  // pluck out variables from the options
  var pathArray = Boolean(opts.path instanceof Array);
  var validPath = pathArray || typeof opts.path === 'string';

  // model directories
  var dirs;

  // if we don't have a valid path, we have to
  // default to using the models directory - this
  // behaviour is synonymous with 'auto'
  if (!validPath) {
    // default the directories to simply
    // the 'models' directory
    dirs = ['models'];
  } else {
    // alternatively we simply use the paths
    // provided by the user, and ensure they're
    // parsed into an array for common usage
    dirs = pathArray ? opts.path : [opts.path];
  }

  // store a reference to this
  var _this = this;

  // begin Promise chain
  return Bluebird

    // resolve with the directories mapped to be relative
    // ensuring we're looking at the correct place
    .resolve(
      dirs.map(function (p) {
        return path.resolve(_this.app_root, p);
      })
    )

    // for every directory we need to check that
    // we can read it, and that it is indeed
    // a directory (as opposed to a file)
    .each(function (dir) {

      // wrap the directory in a Promise
      return Bluebird.resolve(dir)

        // then we have to ensure that the
        // directory is readable, before we move
        // onto reading it in using fs
        .then(function (dir) {

          // read the directory
          return fs.statAsync(dir)

            // ensure that the directory is actually
            // a valid directory, otherwise we throw
            // an error into the Promise chain
            .then(function (stat) {

              // ensure a directory
              if(!stat.isDirectory()) {

                // throw an error message which will be caught by the Promise
                // and formatted into a more information exception
                return Bluebird.reject(new OryxError('Path resolves to a non-directory!'));
              }

              // valid directory
              return dir;
            })

            // catch any errors resulting from the inner
            // Promise chain, so that we can pass a custom
            // error back, rather than an fs error
            .catch(function (e) {
              // don't care about the error
              throw(new OryxError('Unable to read model directory: ' + dir, { cause: e }));
            });
        })

        // try to read the directory, and pass the
        // list of files on to the Promise chain,
        // in order to allow iteration
        .then(fs.readdirAsync.bind(fs))

        // for every file in the directory, we need
        // to ensure that we only read in .js files
        .each(function (file) {

          // ensure the file is a javascript file
          if (file.slice(-3) === '.js') {

            // define the resolved file path
            var filepath = path.resolve(dir, file);

            // require in the library file
            var lib = require(filepath);

            // if the library is not an exported function
            // it's an invalid model, so we ignore it
            if (typeof lib !== 'function') return;

            // create the model, passing in the ORM instance
            // to help with defining the models
            var model = lib(Waterline);

            // basic validation of the file to ensure that we're
            // actually reading a model file, rather than any
            // random js logic
            if (model.hasOwnProperty('super_')) {

              // attempt to load the model into the ORM
              _this.orm.loadCollection(model);
            } else {

              // log a warning, letting the user know we can't load the file
              // this is not an error, rather a prompt to check just in case
              _this.logger.warn('Unable to load model: ' + filepath);
            }
          }
        });
    })

    // once all models have been bootstrapped onto
    // the ORM, we need to initialize it by passing
    // in the config, and storing the resulting models
    .then(function () {

      // use Bluebird to convert the node style
      // callback to a Promise, in order to allow
      // adding it to our Promise chain
      return Bluebird.promisify(_this.orm.initialize, _this.orm)

        // execute this promise, passing in the
        // waterline configuration from the merged
        // config file attached to the Oryx instance
        (_this.config.waterline)

        // we receive an object containing the model
        // metadata, so we attach the models to the
        // instance and then forward them further down
        // the Promise chain
        .then(function (models) {

          // we only need to store collections, rather
          // than the waterline connections - we pass
          // to the Object constructor for type safety
          _this.bindings.models = Object(models.collections);

          // give models to the chain
          return _this.bindings.models;
        });
    })

    // now we have our models, we can log the status
    // of the instance and then forward the names of
    // the models back to the user for any validation
    .then(function (models) {

      // pluck out the names of the models, again using
      // the Object constructor for type safety
      var names = Object.keys(Object(models));

      // log an appropriate message, based on the number
      // of models we have managed to load - either the
      // names of the models or a message informing the
      // user that no models could be found
      _this.logger.debug(names.length > 0
        ? 'Loaded models: ' + JSON.stringify(names)
        : 'No models found to load');

      // alias the name of each model
      // to the 'name' property, in order
      // to provide a more obvious access
      // to the user
      names.forEach(function (m) {
        models[m].name = m;
      });

      // pass the names to the user
      return names;
    })

    // we want to allow Promises
    // or node-style callbacks
    .nodeify(cb);
};

/**
 * Binds all APIs to the Oryx instance, using either
 * custom options or a set of defaults. Allows for basic
 * automated loading (if the app is laid out correctly).
 * Returns a (Bluebird) Promise instance, but also accepts
 * a Node.js style callback.
 *
 * @param opts any custom options
 * @param cb a possible callback
 * @returns {Promise<R>|void}
 */
Oryx.prototype.routes = function routes(opts, cb) {
  // ensure we parse function args correctly, in
  // case there are no options defined
  if (!cb && typeof opts === 'function') {
    cb = opts;
    opts = {};
  }

  // force an object from the options
  opts = Object(opts);

  // store a reference to this
  var _this = this;

  // pull out options from the passed in options parameter
  var apiArray = Boolean(opts.apis instanceof Array);

  // determine whether we have a valid path for the APIs
  // or not, due to required fields
  var validPath = apiArray || (typeof opts.apis === 'object' && opts.apis.hasOwnProperty('path'));

  // the api root needs to resolve from either the custom options or
  // from a default value of './routes/api'
  var root_path = path.resolve(_this.app_root, opts.path || 'routes/api');

  // the api_root defines the root of the url the api will
  // live under - this can  be controlled by just calling
  // app.use(BASE, app) but it's a more convenient method
  var api_root = (function (api_root) {

    // default to using a base path of '/api'
    var p = api_root || '/api';

    // we need to make sure that the api has
    // a trailing slash, just so that everything
    // is normalized
    if(p.substr(-1) !== '/') {
      p += '/';
    }

    // done
    return p;
  })(opts.root);

  // hold the starting promise
  var pm;

  // define the base promise, which
  // differs based on whether auto
  // is enabled or not
  if (validPath) {
    // we need to ensure that we're working with an array
    // so that we can resolve all the api paths being used
    var api_array = apiArray ? opts.apis : [opts.apis];

    // because auto is disabled, we're guaranteed a valid api
    // path, so unlike with the model loading, we
    // simply resolve a Promise with the array of APIs
    pm = Bluebird.resolve(

      // we use reduce to iterate the APIs, to we can safely
      // drop invalid ones without needing a filter/map combination
      api_array.reduce(function (apis, api) {
        // define the location of the provided API
        var location = path.resolve(_this.app_root, api.path);

        // if there is no 'version' key, we blindly
        // use the 'base' key, as the base can be
        // undefined in order to auto-generated
        if (!api.hasOwnProperty('version')) {

          // push the new API using the 'base' key as the API base
          apis.push({ base: api.base, path: location });
        } else {

          // if we have a 'version' key, we need
          // to ensure that it matches the version
          // pattern - this allows a user to replicate
          // behaviour taken by Oryx's loading
          if (/v\d+/.test(api.version)) {
            // push the new API using the 'version' key as the API base
            apis.push({ base: api.version, path: location });
          }
        }

        // pass the loaded APIs
        // to the next iteration
        return apis;
      }, [])
    );
  } else {
    // try to read the automatic directory, and
    // pass the list of files on to the Promise chain,
    // in order to allow iteration
    pm = fs.readdirAsync(root_path)

      // we need to filter out any APIs which do not live in a
      // versioned folder, in order to avoid reloading existing
      // routes - this is unchangeable at the current time
      .filter(function (api) {
        return /v\d+/.test(api);
      }, { concurrency: Infinity })

      // we now map each api to a version and the path
      // the version lives under - this allows us to
      // map them correctly in the app layer
      .map(function (api) {
        return {
          base: api,
          path: path.resolve(_this.app_root, root_path + '/' + api)
        };
      }, { concurrency: Infinity })

      // catch any errors resulting from the Promise chain,
      // so that we can pass a custom error back
      .catch(function (e) {
        // don't care about the error
        throw(new OryxError('Unable to read API directory: ' + root_path, { cause: e }));
      });
  }

  // begin Promise chain
  return pm

    // for each API, we need to load the directory and
    // require in the main oryx.js file, then load all
    // routes and models for the API
    .map(function (api) {

      // attempt to read the path of the API
      // to ensure that we are able to load from
      // it - it should be a directory
      return fs.statAsync(api.path)

        // ensure that the directory is actually
        // a valid directory, otherwise we throw
        // an error into the Promise chain
        .then(function (stat) {

          // ensure a directory
          if(!stat.isDirectory()) {

            // throw an error message which will be caught by the Promise
            // and formatted into a more information exception
            return Bluebird.reject(new OryxError('Path resolves to a non-directory!'));
          }

          // calculate the version of the API, from either a
          // pre-determined version, or the basename of the path
          api.base = api.base || path.basename(api.path);

          // catch-all
          try {

            // require in the API path, and attach it to listen
            // under the '/api_root/ver' path
            _this.app.use(api_root + api.base, require(api.path));

            // coerce the models to an object, for safety
            var models = Object(_this.bindings.models);

            // define a custom binding we'll provide
            // to all user and non-user defined routes
            var binding = {
              config: _this.config,
              logger: _this.logger,
              models: models
            };

            // once the API is loaded, we can define the paths
            // for all the models - we load these after the API
            // so the user can define overlapping routes in advance
            // should they wish to
            Object.keys(models).forEach(function (m) {

              // pluck out the current model
              var model = _this.bindings.models[m];

              // join our default routes to our model
              // routes, so we can handle in a common way
              var routes = merge({}, model['custom_routes'], _this.bindings.routes, function (a, b) {
                return a !== undefined ? a : b;
              });

              // clone the routes for filtering
              var route_keys = Object.keys(routes);

              // determine if we have been provided any includes
              // or excludes alongside the current model
              var includes = model['includes'] || route_keys;
              var excludes = model['excludes'] || [];

              // ensure model.routes exists
              model.routes = [];

              // define a match function for comparisons
              function match(route, regex) {
                // if the regex is just a string type
                if(typeof regex === 'string') {
                  // treat it as a glob
                  return micromatch.isMatch(route, regex, {});
                }
                // test using regex
                return regex.test(route);
              }

              // begin filtering of the routes we're
              // going to attach for this model
              route_keys
                // we then filter all routes on the model
                // to only use those using a valid syntax
                // of 'METHOD /url'
                .filter(function (r) {
                  return route_regex.test(r);
                })
                // includes
                .filter(function (route) {
                  return includes.some(match.bind(match, route));
                })
                // excludes
                .filter(function (route) {
                  return !excludes.some(match.bind(match, route));
                })
                // for every route applicable for the model, we now create a route handler
                // by passing the model through to the corresponding route - the returned route
                // is then used to attach at the endpoint '/api_root/ver/model/route'
                .forEach(function (r) {
                  // add the route to the model
                  model.routes.push(r);

                  // find the space in the string
                  var index = r.indexOf(' ');

                  // retrieve the pieces we care about
                  var method = r.substr(0, index).toLowerCase();
                  var path = r.substr(index + 1);

                  // attach the route
                  _this.app[method](
                    // define the model path
                    api_root + api.base + '/' + m + path,
                    // the body parser
                    json_parser,
                    // bind the model instance
                    routes[r].bind(binding, model)
                  );
                });
            });

            // finished!
            return api;
          } catch (e) {
            // should there be an error, we log out a warning that the API could not
            // be loaded - this should not be an error at this point, because it could
            // easily be a misconfiguration of a single route
            _this.logger.warn('Unable to load API [' + api.base + ',' + api.path + ']');
            // log out the actual error under
            // the debug log level so that
            // the user can see if necessary
            _this.logger.debug(e);
          }
        })

        // catch any errors resulting from the inner
        // Promise chain, so that we can pass a custom
        // error back, rather than an fs error
        .catch(function (e) {
          throw(new OryxError('Unable to read API directory: ' + path.resolve(api_root + api.path), { cause: e }));
        });
    }, { concurrency: Infinity })

    // for all the loaded APIs, we can
    // then return a list to the user
    // so they know what has been loaded
    .then(function (apis) {

      // filter out all of the APIs which resolve to
      // undefined, in case there are any - then map
      // to the version/bases used against each API
      return apis.reduce(function (bases, api) {
        if (!!api) {
          bases.push(api.base);
        }
        return bases;
      }, []);
    })

    // now we have our APIs, we can log the status
    // of the instance forward the loaded versions
    // back to the user for logging
    .then(function (apis) {

      // log an appropriate message, based on the number
      // of APIs we have managed to load
      _this.logger.debug(apis.length > 0
        ? 'Loaded APIs: ' + JSON.stringify(apis)
        : 'No APIs found to load');

      // pass the APIs to the user
      return apis;
    })

    // we want to allow Promises
    // or node-style callbacks
    .nodeify(cb);
};

// release the Oryx!
module.exports = Oryx;
module.exports.OryxError = OryxError;
module.exports.OryxResponse = OryxResponse;