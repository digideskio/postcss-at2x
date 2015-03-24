var path    = require('path');
var postcss = require('postcss');

var query = [
  '(min--moz-device-pixel-ratio: 1.5)',
  '(-o-min-device-pixel-ratio: 3/2)',
  '(-webkit-min-device-pixel-ratio: 1.5)',
  '(min-device-pixel-ratio: 1.5)',
  '(min-resolution: 144dpi)',
  '(min-resolution: 1.5dppx)'
];

module.exports = at2x;

function at2x(opts) {
  opts = opts || {};

  return function(root) {
    root.eachDecl(/^background/, function(decl) {
      if (!backgroundWithHiResURL(decl)) {
        return;
      }

      var topLevelNode = decl.parent.parent;
      var params = (topLevelNode.name === 'media') ?
                 combineMediaQuery(topLevelNode.params.split(/,\s*/), query) :
                 query.join(', ');
      var media = postcss.atRule({ name: 'media', params: params });
      var rule = postcss.rule({ selector: decl.parent.selector });

      rule.append(postcss.decl({
        prop: decl.prop,
        value: parseUrl(decl)
      }));

      media.append(rule);
      root.append(media);
    });
  };
}

/**
 * Combines existing media query with 2x media query.
 */
function combineMediaQuery(base, additional) {
  var finalQuery = [];
  base.forEach(function(b) {
    additional.forEach(function(a) {
      finalQuery.push(b + ' and ' + a);
    });
  });
  return finalQuery.join(', ');
}

function parseUrl(decl) {
  // Strip out `at-2x`
  var val = decl.value.replace(/\s+(at-2x)\s*(;|$)/, '$2');
  decl.value = val;

  var i = val.indexOf('url(');
  var url = val.slice(i + 4, val.indexOf(')', i));
  var ext = path.extname(url);

  // ignore .svg
  if (ext === '.svg') {
    return;
  }

  // @2x url value
  var retinaUrl = path.join(path.dirname(url), path.basename(url, ext) + '@2x' + ext);

  // Replace all instances of `url(a/path/test.png)` with `url(a/path/test@2x.png)`.
  // This preserves other values set by background such as no-repeat, color etc
  return val.replace(/url\((.*?)\)/g, 'url(' + retinaUrl + ')');
}

function backgroundWithHiResURL(decl) {
  return decl.value.indexOf('url(') !== -1 &&
         decl.value.indexOf('at-2x') !== -1;
}
