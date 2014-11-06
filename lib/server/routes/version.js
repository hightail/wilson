/**
 * ENDPOINT: /wilson/version
 *
 * Returns the current version of the app
 *
 * e.x.
 * {
 *    "version": "1.0.0"
 * }
 *
 */
module.exports = function(wilsonConfig) {
  return function(req, res) {
    //console.log(app.settings);
    var appVersion      = wilsonConfig.client.app.version;
    //console.log('appVersion', appVersion);
    res.status(200).set('Content-Type', 'application/javascript').send({
      version: appVersion
    });
  }
}