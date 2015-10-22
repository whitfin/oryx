var express = require('express');
var path = require('path');
var should = require('should');
var supertest = require('supertest');

var Oryx = require('../');
var resources = './test/resources';

describe('Response Headers', function () {

  it('sets the X-Powered-By header', function (next) {
    var app = express();

    var oryx = new Oryx(app, {
      app_root: path.resolve(resources),
      log_level: 'error'
    });

    oryx
      .models({
        path: './model_routes'
      })
      .then(function (models) {
        should(models).be.ok();
        should(models.length).eql(3);
        should(models[0]).eql('employee');
        should(models[1]).eql('manager');
        should(models[2]).eql('user');
      })
      .then(function () {
        return oryx.routes();
      })
      .then(function (apis) {
        should(apis).be.ok();
        should(apis.length).eql(1);
        should(apis[0]).eql('v1');
      })
      .then(function () {
        supertest
          .agent(app)
          .get('/api/v1/user/custom_route')
          .expect('Content-Type', /json/)
          .expect('X-Powered-By', 'Oryx & Express')
          .expect(200, {
            message: 'aloha!'
          }, next);
      })
      .catch(next);
  });

  it('does not set the X-Powered-By header when disabled', function (next) {
    var app = express();

    app.disable('x-powered-by');

    var oryx = new Oryx(app, {
      app_root: path.resolve(resources),
      log_level: 'error'
    });

    oryx
      .models({
        path: './model_routes'
      })
      .then(function (models) {
        should(models).be.ok();
        should(models.length).eql(3);
        should(models[0]).eql('employee');
        should(models[1]).eql('manager');
        should(models[2]).eql('user');
      })
      .then(function () {
        return oryx.routes();
      })
      .then(function (apis) {
        should(apis).be.ok();
        should(apis.length).eql(1);
        should(apis[0]).eql('v1');
      })
      .then(function () {
        supertest
          .agent(app)
          .get('/api/v1/user/custom_route')
          .expect('Content-Type', /json/)
          .expect(function (res) {
            should(res).be.ok();
            should(res.headers).be.ok();
            should(res.headers).not.have.property('X-Powered-By');
          })
          .expect(200, {
            message: 'aloha!'
          }, next);
      })
      .catch(next);
  });

});
