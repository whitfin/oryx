// npm modules
var Bluebird = require('bluebird');
var define = require('lodash.set');
var merge = require('lodash.merge');

// local modules
var OryxError = require('./error');
var OryxResponse = require('./response');

// constants
const specialKeys = [
  'limit', 'skip', 'sort',
  'select', 'where'
];

/**
 * Export of all routes which may be defined for a
 * given model. All properties in this module are
 * keyed by the route to be given to Express, mapper
 * to a function value which is given a model instance
 * to use when creating the route on the app.
 *
 * @type {*}
 */
module.exports = {

  /**
   * Interacts with the model instances, using any
   * valid Waterline queries, provided either query
   * parameters or a request body. Limits default to
   * 10, in order to avoid accidentally querying the
   * entire instance set.
   *
   * @param model the model for this request
   * @param req the request object
   * @param res the response object
   */
  'GET /': function (model, req, res) {
    // parse any parameters
    parameters(req)
      // pass the parsed params to Waterline
      .then(model.find.bind(model))
      // use our default exit handler for a valid body
      .then(exitWithBody.bind(exitWithBody, res, 200))
      // catch any errors with the default handler
      .catch(errorHandler(res));
  },

  /**
   * Creates a model instance, using the request
   * body as the payload. This will be validated by
   * Waterline, and any necessary errors will be returned
   * to the user.
   *
   * @param model the model for this request
   * @param req the request object
   * @param res the response object
   */
  'POST /': function (model, req, res) {
    model
      // pass the request body to Waterline
      .create(req.body)
      // use our default exit handler for a valid body
      .then(exitWithBody.bind(exitWithBody, res, 201))
      // catch any errors with the default handler
      .catch(errorHandler(res));
  },

  /**
   * Updates a model instance, using the 'doc' field of
   * the request body as the payload. Updates will be
   * validated by Waterline.
   *
   * @param model the model for this request
   * @param req the request object
   * @param res the response object
   */
  'PUT /': function (model, req, res) {
    // ensure that we have a valid update document
    // to use alongside the update request
    if (typeof(req.body) !== 'object' || Object.keys(req.body).length === 0) {
      // create an error, requiring that the field
      // be included in any requests
      var err = new OryxError('No body provided!');
      // return the error to the user
      return exitWithError(res, 400, err);
    }

    // parse all params - updates are unlimited by default
    // in order to take advantage of query matching
    parameters(req, { limit: undefined })

      // pass all parameters to Waterline, and
      // pass the 'doc' field as the update document
      .then(function (params) {
        return model.update(params, req.body);
      })

      // then we take the response and return a count
      // containing the number of documents updated
      // by this request - it would be possible to return
      // all the documents, however this could easily
      // become a huge payload
      .then(function (docs) {

        // exit with a success response code, and a
        // basic count of updated documents
        exitWithBody(res, 200, {
          docs_updated: docs.length
        });
      })

      // catch any errors with the default handler
      .catch(errorHandler(res));
  },

  /**
   * Deletes model instances matching the given parameters.
   * Returns a count of the number of documents deleted.
   *
   * @param model the model for this request
   * @param req the request object
   * @param res the response object
   */
  'DELETE /': function (model, req, res) {
    // parse all params - deletes are unlimited by default
    // in order to take advantage of query matching
    parameters(req, { limit: undefined })

      // pass all parameters to Waterline - it can
      // do the heavy lifting for us
      .then(model.destroy.bind(model))

      // then we use the returned documents to
      // return a count of removed documents
      .then(function (docs) {

        // use our default exit handler, passing
        // a 200 response and the document count
        exitWithBody(res, 200, {
          docs_removed: docs.length
        });
      })

      // catch any errors with the default handler
      .catch(errorHandler(res));
  },

  /**
   * Returns a count of documents matching the provided
   * parameters. Parameters can be provided either via
   * query string or request body.
   *
   * @param model the model for this request
   * @param req the request object
   * @param res the response object
   */
  'GET /count': function (model, req, res) {
    // parse all params - counts are unlimited by default
    // in order to take advantage of query matching
    parameters(req, { limit: undefined })

      // pass all parameters to Waterline - it can
      // do the heavy lifting for us
      .then(model.count.bind(model))

      // we then return the count to the user,
      // based on the response from Waterline
      .then(function (count) {

        // use our default exit handler, passing
        // a 200 response and the document count
        exitWithBody(res, 200, {
          doc_count: count
        });
      })

      // catch any errors with the default handler
      .catch(errorHandler(res));
  },

  /**
   * Returns basic information about the model, currently
   * just the model name and the defined schema.
   *
   * @param model the model for this request
   * @param req the request object
   * @param res the response object
   */
  'GET /info': function (model, req, res) {
    // simply exit with a 200 response and some information
    // about the metadata of the model - namely the model
    // name and the schema definition of the model
    exitWithBody(res, 200, {
      name: model.name,
      schema: model._attributes,
      routes: model.routes
    });
  },

  /**
   * Finds distinct values for the provided field name,
   * potentially matching a query defined in either the
   * query parameters or the request body.
   *
   * @param model the model for this request
   * @param req the request object
   * @param res the response object
   */
  'GET /distinct/:field': function (model, req, res) {
    // distinct requests are unlimited by default -
    // we also merge over the desired field for inclusion
    parameters(req, { limit: undefined, select: [req.params.field] })

      // pass all parameters to Waterline - it can
      // do the heavy lifting for us
      .then(model.find.bind(model))

      // we receive a list of matching documents (with
      // the 'select' applied, so we translate to a list
      // of values in an array before returning
      .then(function (docs) {

        // translate the returned documents by
        // pulling out the value cared about - we then
        // filter to ensure that there are no duplicates
        var values = docs

          // return the field we care about from within
          // the document - there should only be one field
          // within the document in the first place
          .map(function (doc) {
            return doc[req.params.field];
          })

          // ensure that we're not duplicating unique
          // values inside our array of values
          .filter(function (value, index, self) {
            return self.indexOf(value) === index;
          });

        // exit with a 200 response code and the
        // calculated unique values
        exitWithBody(res, 200, values);
      })

      // catch any errors with the default handler
      .catch(errorHandler(res));
  },

  /**
   * Retrieves a document by it's document id. If the document
   * does not exist, a 404 response is returned alongside an
   * empty object.
   *
   * @param model the model for this request
   * @param req the request object
   * @param res the response object
   */
  'GET /:id': function (model, req, res) {
    model
      // lookup the document directly by
      // the primary key from path params
      .findOne(req.params.id)

      // then we return the document if it
      // exists, if not it's a 404 response
      .then(function (doc) {

        // short circuit
        if (!doc) {
          // return a 404 response and an empty
          // object if the document does not exist
          return exitWithBody(res, 404, {});
        }

        // return a 200 response alongside
        // the document
        exitWithBody(res, 200, doc);
      })

      // catch any errors with the default handler
      .catch(errorHandler(res));
  },

  /**
   * The equivalent of findOrCreate, this will return a
   * document if it exists, or will create a new document
   * from the request body.
   *
   * @param model the model for this request
   * @param req the request object
   * @param res the response object
   */
  'POST /:id': function (model, req, res) {
    // define a new field of the primary key set to the value
    // defined in the path parameters, in order to force the
    // creation of the new document with the correct idenfier
    var body = define(
      req.body, '["' + model.primaryKey + '"]', req.params.id
    );

    model
      // pass the values through to Waterline - the second
      // parameter is an object which needs the primary key
      // merging across so we don't just create a new document
      .findOrCreate(req.params.id, body)
      // use our default exit handler for a valid body
      .then(exitWithBody.bind(exitWithBody, res, 200))
      // catch any errors with the default handler
      .catch(errorHandler(res));
  },

  /**
   * Updates a specific model instance, using the document
   * id. If the document does not exist, a 404 response will
   * be returned. Otherwise the updated document will be
   * returned.
   *
   * @param model the model for this request
   * @param req the request object
   * @param res the response object
   */
  'PUT /:id': function (model, req, res) {
    model
      // directly pass in the request body as
      // we cannot be sure what fields may or
      // may not be desired in the update
      .update(req.params.id, req.body)

      // then we do the typical - if the document
      // doesn't exist, we return a 404 response,
      // otherwise we return the updated document
      .then(function (doc) {

        // short circuit
        if (!doc || doc.length === 0) {
          // return a 404 response and an empty
          // object if the document does not exist
          return exitWithBody(res, 404, {});
        }

        // return a 200 response alongside the doc
        exitWithBody(res, 200, doc[0]);
      })

      // catch any errors with the default handler
      .catch(errorHandler(res));
  },

  /**
   * Deletes an instance of a model by the document id.
   * If the model does not exist, a 404 response is
   * returned.
   *
   * @param model the model for this request
   * @param req the request object
   * @param res the response object
   */
  'DELETE /:id': function (model, req, res) {
    model
      // simply pass the document id along to
      // Waterline, it can do it all for us
      .destroy(req.params.id)

      // then we do the typical - if the document
      // doesn't exist, we return a 404 response,
      // otherwise we return a count (similar to
      // mass deletion)
      .then(function (docs) {

        // short circuit
        if (!docs || docs.length === 0) {
          // return a 404 response and an empty
          // object if the document does not exist
          return exitWithBody(res, 404, {
            docs_removed: 0
          });
        }

        // otherwise we return just the count
        // of documents removed (this should always
        // be one)
        exitWithBody(res, 200, {
          docs_removed: docs.length
        });
      })

      // catch any errors with the default handler
      .catch(errorHandler(res));
  }

};

/**
 * Generates a callback closure to pass to the Promise
 * of all Waterline methods. This simply returns a callback
 * function for the Promise which wraps any error in a new
 * OryxError, and returns a 400 code.
 *
 * @param res
 * @returns {Function}
 */
function errorHandler(res) {
  // return a function to be used
  // as a callback
  return function (err) {
    // wrap the provided error in a OryxError, just to
    // keep all error handling consistent with the lib
    exitWithError(res, 400, new OryxError(err.message));
  };
}

/**
 * Shorthand to return an error to the user, simply
 * setting success to false, setting the status code,
 * and setting the error.
 *
 * @param res the response instance
 * @param code the status code
 * @param err the error instance
 */
function exitWithError(res, code, err) {
  // exit with the provided code
  // and response body
  exit(res, code, {
    success: false,
    statusCode: code,
    error: err
  });
}

/**
 * Shorthand to return a body to the user, simply
 * setting success to true, setting the status code,
 * and setting the body.
 *
 * @param res the response instance
 * @param code the status code
 * @param body the body object
 */
function exitWithBody(res, code, body) {
  // exit with the provided code
  // and response body
  exit(res, code, new OryxResponse(code, body));
}

/**
 * Simple shorthand for returning a status code
 * and response body to the user. This will
 * end the connection.
 *
 * @param res the response instance
 * @param code the status code
 * @param body the body object
 */
function exit(res, code, body) {
  // simply set the status, body and end
  res.status(code).json(body).end();
}

/**
 * Parses parameters from both the query parameters
 * and the request body, in order to normalize parameters
 * for Waterline requests used by almost all routes in
 * this file.
 *
 * @param req the request instance
 * @param def default overrides
 * @returns {*} an options object
 */
function parameters(req, def) {

  // create and return a new Bluebird Promise
  // object to allow chaining onto this method
  return new Bluebird(function (resolve, reject) {
    // create a set of defaults to be
    // used if not overridden
    var params = {
      limit: 10,
      skip: 0,
      sort: {},
      where: {}
    };

    // if we have defaults passed into this
    // function, we need to override the defaults
    if (typeof def === 'object') {
      // for every key in the passed-in defaults,
      // we overwrite the entry in the defaults object
      Object.keys(def).forEach(function (key) {
        params[key] = def[key];
      });
    }

    // small function to parse any values into
    // JSON, if they are already JSON strings
    function parse(val) {
      // determine if we have a string value
      // and if so, attempt to parse JSON
      if (typeof(val) === 'string') {
        try {
          return JSON.parse(val);
        } catch(e) { }
      }
      // otherwise simply
      // return input
      return val;
    }

    // we want to use a custom 'where' clause as
    // a start point - this allows merging of filters
    // which might not already be inside this object
    if (req.query.hasOwnProperty('where')) {
      params.where = parse(req.query.where);
    }

    // iterate through the keys, merging them into
    // the parameters object, and attempting to parse
    // any strings in order to accept JSON payloads
    Object.keys(req.query).forEach(function (key) {
      // grab the value we're working on
      var val = parse(req.query[key]);

      // if this isn't a reserved key, we add it
      // into the 'where' object as a query filter
      if (specialKeys.indexOf(key) === -1) {
        params.where[key] = val;
        return;
      }

      // special case the 'select' key
      if (key === 'select') {
        // the 'select' value should always
        // be an array, so we coerce as needed
        if (!(val instanceof Array)) {
          val = [val];
        }
      }

      // we don't want to overwrite
      // the 'where' accidentally
      if (key !== 'where') {
        params[key] = val;
      }
    });

    // ensure that the 'where' param is a valid Object
    // or an Array - this is a special compatibility piece
    // to deal with Object.keys changes between ES5 -> ES6
    if (typeof(params.where) !== 'object') {

      // prepare an error message in case
      // we need to exit the Promise chain
      var err = new OryxError(
        'Invalid \'where\' parameter specified!'
      );

      // reject due to having an
      // invalid where clause
      return reject(err);
    }

    // pass back the newly
    // validated params
    resolve(merge({ }, params));
  });

}
