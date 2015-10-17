/**
 * A simple response class used with Oryx when defining
 * model routes. This is exposed so that users may also
 * take advantage of this formatting.
 *
 * @param code the response code
 * @param body the body to return, if any
 * @constructor
 */
function OryxResponse(code, body) {
  // a 2xx or 3xx response code denotes success
  this.success = /[2|3]\d{2}/.test(code && code.toString());
  // ensure a body exists
  this.result = typeof body === 'string' ? { message: body } : Object(body);
}

// export the constructor
module.exports = OryxResponse;
