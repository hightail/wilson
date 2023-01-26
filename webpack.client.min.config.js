const path = require('path');

module.exports = {
  entry: './lib/client/src/wilson.js',
  mode: 'production',
  output: {
    filename: 'client.wilson.min.js',
    path: path.resolve(__dirname, 'lib/client'),
  }
};