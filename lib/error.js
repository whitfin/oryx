/**
 * Custom error type for use by Oryx, used purely
 * so that users can catch OryxErrors without placing
 * a catchall in their Promise chain.
 *
 * @param message the error message
 * @param meta any error metadata
 * @constructor
 */
module.exports = function OryxError(message, meta) {
  // capture the stack trace into this Error, so that
  // it provides the necessary information to the user
  Error.call(this);
  Error.captureStackTrace(this, this.constructor);

  // set the properties of this Error
  this.name = this.constructor.name;
  this.message = message;
  this.meta = meta;
};

// ensure that the exported OryxError
// inherits the Error class
require('util').inherits(module.exports, Error);
