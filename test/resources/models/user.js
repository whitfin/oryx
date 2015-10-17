module.exports = function (Waterline) {

  return Waterline.Collection.extend({
    identity: 'user',
    connection: 'default',
    autoCreatedAt: false,
    autoUpdatedAt: false,
    attributes: {
      firstName: 'string',
      lastName: 'string'
    }
  });

};
