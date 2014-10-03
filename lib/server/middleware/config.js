/**
 * Middleware that creates a req.wilson object to use for Wilson configuration per request
 *
 * @param req
 * @param res
 * @param next
 */
module.exports = function(req, res, next) {
  //create request specific wilson config
  if (!req.wilson) {
    req.wilson = {
      tags: {}
    };
  }

  next();
};