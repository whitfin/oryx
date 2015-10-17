var should = require('should');

var OryxResponse = require('../').OryxResponse;

describe('OryxResponse', function () {

  it('creates a 2xx simple response', function () {
    var res = new OryxResponse(200, {
      message: 'Hi!'
    });

    should(res).be.ok();

    should(res.success).be.ok();
    should(res.success).eql(true);
    should(res.result).be.ok();
    should(res.result).be.an.Object;
    should(res.result.message).be.ok();
    should(res.result.message).eql('Hi!');
  });

  it('creates a 3xx simple response', function () {
    var res = new OryxResponse(301, {
      message: 'Hi!'
    });

    should(res).be.ok();

    should(res.success).be.ok();
    should(res.success).eql(true);
    should(res.result).be.ok();
    should(res.result).be.an.Object;
    should(res.result.message).be.ok();
    should(res.result.message).eql('Hi!');
  });

  it('creates a 4xx simple response', function () {
    var res = new OryxResponse(401, {
      message: 'Hi!'
    });

    should(res).be.ok();

    should(res.success).not.be.ok();
    should(res.result).be.ok();
    should(res.result).be.an.Object;
    should(res.result.message).be.ok();
    should(res.result.message).eql('Hi!');
  });

  it('handles String codes', function () {
    var res = new OryxResponse('200', {
      message: 'Hi!'
    });

    should(res).be.ok();

    should(res.success).be.ok();
    should(res.success).eql(true);
    should(res.result).be.ok();
    should(res.result).be.an.Object;
    should(res.result.message).be.ok();
    should(res.result.message).eql('Hi!');
  });

  it('defaults to 500 if the code cannot be parsed', function () {
    var res = new OryxResponse('test', {
      message: 'Hi!'
    });

    should(res).be.ok();

    should(res.success).not.be.ok();
    should(res.result).be.ok();
    should(res.result).be.an.Object;
    should(res.result.message).be.ok();
    should(res.result.message).eql('Hi!');
  });

  it('handles String bodies', function () {
    var res = new OryxResponse(200, 'Hi!');

    should(res).be.ok();

    should(res.success).be.ok();
    should(res.success).eql(true);
    should(res.result).be.ok();
    should(res.result).be.an.Object;
    should(res.result.message).be.ok();
    should(res.result.message).eql('Hi!');
  });

  it('handles empty bodies', function () {
    var res = new OryxResponse(200);

    should(res).be.ok();

    should(res.success).be.ok();
    should(res.success).eql(true);
    should(res.result).be.ok();
    should(res.result).be.an.Object;
    should(Object.keys(res.result)).have.length(0);
  });

  it('handles no arguments', function () {
    var res = new OryxResponse();

    should(res).be.ok();

    should(res.success).not.be.ok();
    should(res.result).be.ok();
    should(res.result).be.an.Object;
    should(Object.keys(res.result)).have.length(0);
  });

});
