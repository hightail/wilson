/**
 * Middleware to set headers to prevent caching
 */

module.exports = function(req, res, next) {
  res.header("Cache-Control", "no-cache, no-store, must-revalidate");
  res.header("Pragma", "no-cache");
  res.header("Expires", 0);

  next();
}
