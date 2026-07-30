'use strict';

const fs = require('fs');
const path = require('path');

const PASSTHROUGH_ASSETS = [
  'lib/fancybox/source/jquery.fancybox.min.js'
];

hexo.extend.filter.register('after_generate', function () {
  PASSTHROUGH_ASSETS.forEach(route => {
    const source = path.join(hexo.source_dir, route);
    hexo.route.set(route, () => fs.createReadStream(source));
  });
});
