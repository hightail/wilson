/**
 * Middleware that creates a req.wilson object to use for Wilson configuration per request
 *
 * @param req
 * @param res
 * @param next
 */
module.exports = function(wilsonConfig) {
  function configMiddlware(req, res, next) {
    //create request specific wilson config
    if (!req.wilson) {
      req.wilson = {
        tags: {
          language: wilsonConfig.client.i18n.defaultLng
        }
      };
    }

    next();
  }

  return configMiddlware;
};