const fs = require('fs');
let patch = fs.readFileSync('patches/react-native-worklets-core+1.3.3.patch', 'utf8');

// The diff created some garbage related to intermediate build files inside node_modules, we should strip it out so it only patches CMakeLists.txt
let lines = patch.split('\n');
let newLines = [];
let capture = true;
for (let line of lines) {
  if (line.startsWith('diff --git') && !line.includes('CMakeLists.txt')) {
    capture = false;
  }
  if (capture) {
    newLines.push(line);
  }
}
fs.writeFileSync('patches/react-native-worklets-core+1.3.3.patch', newLines.join('\n'));
