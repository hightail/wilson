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
    /**** Do any filtering of client-served config based on response local config settings ****/

    // i18n resStore Namespace filtering
    if (_.isArray(res.locals.wilsonConfig.client.i18n.clientSafeNamespaces)) {
      // Init new resStore for config
      var lang    = res.locals.wilsonConfig.client.i18n.lng;
      var store   = {};
      store[lang] = {};

      // Copy relevant namespace sub-objects
      _.each(res.locals.wilsonConfig.client.i18n.clientSafeNamespaces, function(ns) {
        store[lang][ns] = res.locals.wilsonConfig.client.i18n.resStore[lang][ns];
      });

      res.locals.wilsonConfig.client.i18n.resStore = store;
    }

    //Pass in res.locals to use wilsonConfig in the template
    var result = template(res.locals);

    res.status(200).set('Content-Type', 'application/javascript').send(result);
  }
};