/**
 * ENDPOINT: /config
 */

var path = require('path'),
    fs = require('fs'),
    _ = require('lodash'),
    hbs = require('hbs');

module.exports = function(wilsonConfig, logger) {
  //Load index page
  var configHbsPath = path.join(__dirname, '../templates/wilson-config.hbs');
  var configHbs = fs.readFileSync(configHbsPath, 'utf8');
  var template = hbs.compile(configHbs);

  //The /config route handler
  return function(req, res) {
    //Pass in res.locals to use wilsonConfig in the template
    var result = template(res.locals);

    res.status(200).set('Content-Type', 'application/javascript').send(result);
  }
};