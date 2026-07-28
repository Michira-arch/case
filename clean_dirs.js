const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, 'app', 'api', 'agency');
const getDirs = (d) => fs.readdirSync(d, { withFileTypes: true }).filter(dirent => dirent.isDirectory()).map(dirent => dirent.name);
const allDirs = getDirs(dir);

const rmdirRecursive = (d) => {
  if (fs.existsSync(d)) {
    fs.readdirSync(d).forEach((file, index) => {
      const curPath = path.join(d, file);
      if (fs.lstatSync(curPath).isDirectory()) { // recurse
        rmdirRecursive(curPath);
      } else { // delete file
        fs.unlinkSync(curPath);
      }
    });
    fs.rmdirSync(d);
  }
};

allDirs.forEach(d => {
  const fullPath = path.join(dir, d);
  if (d !== 'approve-member' && d !== 'join-request' && d !== 'invite') {
    rmdirRecursive(fullPath);
    console.log('Removed', d);
  }
});
