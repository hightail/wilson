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
  var projectPaths = wilsonConfig.server.projectPaths;

  var routingJson = require(path.join(projectPaths.root, projectPaths.routes));

  return function(req, res) {
    //console.log(app.settings);
    var config = _.merge({}, wilsonConfig.client, routingJson, req.wilson);

    //TODO: Remove this hackery once we clean up i18n
    //config.i18n.lng = 'en';

    //log out the config
    console.dir(config);


    //Load index page
    var indexHbsPath = path.join(__dirname, '../templates/wilson-config.hbs');
    var indexHbs = fs.readFileSync(indexHbsPath, 'utf8');

    var template = hbs.compile(indexHbs);
    var result = template({
      config: JSON.stringify(config)
    });

    res.status(200).set('Content-Type', 'application/javascript').send(result);

    //console.log('appVersion', appVersion);
    //res.status(200).set('Content-Type', 'application/javascript').send(config);
  }
};

module.exports.$inject = ['wilson.config'];