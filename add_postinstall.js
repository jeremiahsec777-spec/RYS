const fs = require('fs');

let pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
pkg.scripts = pkg.scripts || {};
pkg.scripts.postinstall = "patch-package";
fs.writeFileSync('package.json', JSON.stringify(pkg, null, 2));
