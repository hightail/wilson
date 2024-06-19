/**
 * Logger
 *
 * Custom logger based on winston.
 *
 * User: dan.nguyen
 * Date: 10/10/13
 */

var winston = require('winston');

module.exports = function(wilsonConfig) {
  return winston.createLogger({
    level: wilsonConfig.server.deploy.logLevel,
    format: winston.format.json(),
    exitOnError: false,
    transports: [new winston.transports.Console()]
  });
}