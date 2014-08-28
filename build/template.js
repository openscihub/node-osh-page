var fs = require('fs');
var argv = require('minimist')(process.argv.slice(2));
var path = require('path');

var __template = path.join(process.cwd(), argv._[0]);
var __out = path.join(process.cwd(), argv._[1]);
var template = fs.readFileSync(__template, {encoding: 'utf8'});

fs.writeFileSync(
  __out,
  template.replace(/IMPORT (\S+)/g, function(match, __file) {
    __file = path.join(
      path.dirname(__template), __file
    );
    return fs.readFileSync(__file, {encoding: 'utf8'});
  })
);
