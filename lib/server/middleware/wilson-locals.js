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

    next();
  }

  return configLocalsMiddlware;
};