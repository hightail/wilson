const path = require('path');

module.exports = {
  entry: './lib/client/src/wilson.js',
  mode: 'production',
  output: {
    filename: 'client.wilson.js',
    path: path.resolve(__dirname, 'lib/client'),
  },
  optimization: {
    minimize: false
  }
};