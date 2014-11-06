/**
 * ENDPOINT: /wilson.css
 * ENDPOINT: /wilson.min.css
 *
 * Returns the concatenated CSS for all Wilson components
 *
 */
module.exports = function(wilsonConfig, SassService) {
  return function(req, res) {
    //Determine if we should serve minified CSS
    var minify = (req.path.indexOf('.min.css') > 0);

    var outputStyle = (minify) ? 'compressed' : 'nested';

    //Get the CSS and serve it
    SassService.getComponentCss({
      outputStyle: outputStyle
    }).then(
      function(css) {
        res.type('text/css').send(css);
      },
      function(error) {
        console.log('error', error);
        res.status(500).send(error);
      }
    );
  }
}