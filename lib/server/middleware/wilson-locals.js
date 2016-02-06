/**
 * Middleware to add "wilsonConfig" to app.locals for use in templates
 *
 * @param req
 * @param res
 * @param next
 */
var _ = require('lodash');

module.exports = function(wilsonConfig, hidash) {
  function configLocalsMiddlware(req, res, next) {
    var config = _.cloneDeep(wilsonConfig);
    //console.log('config', config);

    //merge req config info to the client config
    hidash.mergeAll(config.client, req.wilson);

    res.locals.wilsonConfig = config;

    // Post filtering on config based on wilson-config properties
    if (_.isArray(config.client.i18n.clientSafeNamespaces)) {
      // Init new resStore for config
      var lang    = res.locals.wilsonConfig.client.i18n.lng;
      var store   = {};
      store[lang] = {};

      // Copy relevant namespace sub-objects
      _.each(config.client.i18n.clientSafeNamespaces, function(ns) {
        store[lang][ns] = config.client.i18n.resStore[lang][ns];
      });

      res.locals.wilsonConfig.client.i18n.resStore = store;
    }

    next();
  }

  return configLocalsMiddlware;
};