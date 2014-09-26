module.exports = function(req, res, next) {
  req.wilson.tags.brand = 'hightail';
  //console.log('Set brand', req.wilson.tags.brand);

  next();
};