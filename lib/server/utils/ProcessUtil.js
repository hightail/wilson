/**
 *
 *
 * Author: justin.fiedler
 * Date: 11/20/13
 */



var hookWrite = function(outstream, callback) {
  callback = callback || function() {};

  var oldWrite = outstream.write;

  outstream.write = (function(write) {
    return function(string, encoding, fd) {
      write.apply(outstream, arguments);
      callback(string, encoding, fd);
    }
  })(outstream.write);

  return function() {
    outstream.write = oldWrite;
  };
};

var hookStdOut = function(callback) {
  return hookWrite(process.stdout, callback);
};

var hookStdErr = function(callback) {
  return hookWrite(process.stderr, callback);
};

var replaceWrite = function(outstream, callback) {
  callback = callback || function() {};
  var oldWrite = outstream.write;

  //replace stdout write with the given callback
  outstream.write = function(string, encoding, fd) {
    callback(string, encoding, fd);
  };

  //Return a function to re-enable stdout
  return function() {
    outstream.write = oldWrite
  };
};

var replaceStdOut = function(callback) {
  return replaceWrite(process.stdout, callback);
};

var replaceStdErr = function(callback) {
  return replaceWrite(process.stderr, callback);
};

var disableStdOut = function() {
  return replaceStdOut();
};

var disableStdErr = function() {
  return replaceStdErr();
};

module.exports = {
  hookStdOut: hookStdOut,
  hookStdErr: hookStdErr,
  replaceStdOut: replaceStdOut,
  replaceStdErr: replaceStdErr,
  disableStdOut: disableStdOut,
  disableStdErr: disableStdErr
};
