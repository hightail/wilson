module.exports = function(req, res, next) {
  req.wilson.tags.brand = 'CocaCola';
  next();
};