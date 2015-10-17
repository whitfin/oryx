module.exports = function (Waterline) {

  return Waterline.Collection.extend({
    identity: 'user',
    connection: 'default',

    attributes: {
      firstName: 'string',
      lastName: 'string'
    },

    autoCreatedAt: false,
    autoUpdatedAt: false,

    custom_routes: {

      'GET /custom_route': function (model, req, res) {
        res.status(200).json({
          message: 'aloha!'
        }).end();
      },

      'WRONG /custom_route': function (model, req, res) {
        res.status(200).json({
          message: 'aloha!'
        }).end();
      }

    }
  });

};
