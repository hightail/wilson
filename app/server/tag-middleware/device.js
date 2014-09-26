module.exports = function(req, res, next) {
  var userAgent = req.headers['user-agent'];

  var device = "unknown";

  var tests = {
    "iphone":   /iPhone/,
    "ipad":     /iPad/,
    "ipod":     /iPod/,
    "android":  /Android/,
    "winphone": /Windows Phone/,
    "webos":    /webOS/,
    "mac":      /(Intel|PPC) Mac OS X/,
    "linux":    /(Linux|FreeBSD|OpenBSD|Ubuntu|SunOS)/i,
    "windows":  /Windows NT/
  };

  for (var deviceType in tests) {
    if (tests[deviceType].test(userAgent)) {
      device = deviceType;
      break;
    }
  }

  req.wilson.tags.device = device;

  next();
};