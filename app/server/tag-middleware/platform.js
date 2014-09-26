module.exports = function(req, res, next) {
  var userAgent = req.headers['user-agent'];

  var platform  = "unknown";

  var tests = {
    "mobile":     /mobile|iPhone|Android(?=.*mobile)|Windows Phone/i,
    "tablet":     /iPad|Android(?!.*mobile)/i,
    "desktop":    /(Intel|PPC) Mac OS X|Windows NT|(Linux|FreeBSD|OpenBSD|Ubuntu|SunOS)/i
  };

  for (var platformType in tests) {
    if (tests[platformType].test(userAgent)) {
      platform = platformType;
      break;
    }
  }

  req.wilson.tags.platform = platform;

  next();
};