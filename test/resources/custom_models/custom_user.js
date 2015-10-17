module.exports = function (Waterline) {

  return Waterline.Collection.extend({
    identity: 'custom_user',
    connection: 'default',
    attributes: {
      firstName: 'string',
      lastName: 'string'
    },

    includes: ['/test']
  });

};
