/**
 * ENDPOINT: /wilson/config
 *
 * Returns the current version of the app
 *
 * e.x.
 * {
 *    "version": "1.0.0"
 * }
 *
 */

var path = require('path'),
    fs = require('fs'),
    _ = require('lodash'),
    hbs = require('hbs');

module.exports = function(wilsonConfig) {

  return function(req, res) {
    //console.log(app.settings);
    var config = _.merge({}, wilsonConfig.client, req.wilson);

    //log out the config
    //console.dir(config);

    //Load index page
    var configHbsPath = path.join(__dirname, '../templates/wilson-config.hbs');
    var configHbs = fs.readFileSync(configHbsPath, 'utf8');

    var template = hbs.compile(configHbs);
    var result = template({
      wilsonConfig: JSON.stringify(config)
    });

    res.status(200).set('Content-Type', 'application/javascript').send(result);
  }
};