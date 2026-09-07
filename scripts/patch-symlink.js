const fs = require('fs');
const path = require('path');

const origSymlink = fs.symlink;
const origSymlinkSync = fs.symlinkSync;
const fsPromises = fs.promises;
const origPromisesSymlink = fsPromises ? fsPromises.symlink : null;

function handleSymlinkFallback(target, dest, type) {
  const resolvedTarget = path.isAbsolute(target) ? target : path.resolve(path.dirname(dest), target);
  
  try {
    const stat = fs.statSync(resolvedTarget);
    if (stat.isDirectory()) {
      try {
        origSymlinkSync.call(fs, resolvedTarget, dest, 'junction');
        return;
      } catch {
        fs.cpSync(resolvedTarget, dest, { recursive: true, dereference: true });
        return;
      }
    } else {
      fs.copyFileSync(resolvedTarget, dest);
      return;
    }
  } catch {
    try {
      origSymlinkSync.call(fs, resolvedTarget, dest, 'junction');
    } catch {
      // Ignore if cannot link
    }
  }
}

fs.symlinkSync = function (target, dest, type) {
  try {
    return origSymlinkSync.call(fs, target, dest, type || 'junction');
  } catch (err) {
    if (err.code === 'EPERM') {
      return handleSymlinkFallback(target, dest, type);
    }
    throw err;
  }
};

fs.symlink = function (target, dest, type, cb) {
  if (typeof type === 'function') {
    cb = type;
    type = 'junction';
  }
  origSymlink.call(fs, target, dest, type || 'junction', function (err) {
    if (err && err.code === 'EPERM') {
      try {
        handleSymlinkFallback(target, dest, type);
        if (cb) return cb(null);
        return;
      } catch (e) {
        if (cb) return cb(e);
        return;
      }
    }
    if (cb) cb(err);
  });
};

if (origPromisesSymlink) {
  fsPromises.symlink = async function (target, dest, type) {
    try {
      return await origPromisesSymlink.call(fsPromises, target, dest, type || 'junction');
    } catch (err) {
      if (err.code === 'EPERM') {
        return handleSymlinkFallback(target, dest, type);
      }
      throw err;
    }
  };
}
