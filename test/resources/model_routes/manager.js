module.exports = function (Waterline) {

  return Waterline.Collection.extend({
    identity: 'manager',
    connection: 'default',
    attributes: {
      firstName: 'string',
      lastName: 'string'
    },

    includes: ['GET /', 'GET /:id'],
    excludes: ['GET /:id'],

    custom_routes: {

      'GET /': function (model, req, res) {
        res.status(200).json({
          model: 'manager'
        }).end();
      }

    }
  });

};
