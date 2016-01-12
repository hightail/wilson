/**
 * Middleware to add debug-mode flag to config if header is present
 *
 * @param req
 * @param res
 * @param next
 */
module.exports = function(wilsonConfig) {
  function debugModeMiddlware(req, res, next) {
    // Check for debug mode header, if set then set our config
    if (req.headers['debug_mode'] === wilsonConfig.server.debugHeaderCode) {
      if (req.wilson) {
        // Set Debug mode on this config
        req.wilson.debugMode = true;

        // Also clear caching on this response since it has debug mode (don't want to CDN cache this for other clients)
        res.header("Cache-Control", "no-cache, no-store, must-revalidate");
        res.header("Pragma", "no-cache");
        res.header("Expires", 0);
      }
    }

    next();
  }

  return debugModeMiddlware;
};