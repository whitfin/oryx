module.exports = function (Waterline) {

  return Waterline.Collection.extend({
    identity: 'employee',
    connection: 'default',
    attributes: {
      firstName: 'string',
      lastName: 'string'
    },

    autoCreatedAt: false,
    autoUpdatedAt: false,

    includes: [
      'GET /info','PUT [/,]*',  // globs
      /POST \/.*/,/DELETE \/.*/ // regex
    ],
    excludes: [
      /DELETE \/$/
    ]
  });

};
