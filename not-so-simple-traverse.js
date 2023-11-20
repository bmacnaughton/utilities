'use strict';

/* eslint-disable block-spacing, brace-style */
/* eslint-disable complexity */
function notSoSimpleTraverse(obj, cb) {
  if (typeof obj !== 'object' || obj === null) {
    return;
  }

  const history = new WeakSet();
  const path = [];
  function traverse(obj) {
    // prevent endless looping on self-referential objects
    if (history.has(obj)) {
      return;
    }
    history.add(obj);

    // if it's an array, put the keys in the path but don't callback on them;
    // they're just numbers.
    if (Array.isArray(obj)) {
      for (const k in obj) {
        path.push(k);
        if (typeof obj[k] === 'object' && obj[k] !== null) {
          traverse(obj[k]);
        } else if (typeof obj[k] === 'string' && obj[k]) {
          cb(path, 'leaf', obj[k]);
        }
        path.pop();
      }
    } else if (obj instanceof Map) {
      for (const entry of obj) {
        cb(path, 'key', entry[0]);
        path.push(entry[0]);
        if ()
        traverse(entry[1]);
        path.pop();
      }

    } else if (obj instanceof Set) {
      // how to handle? the set is basically just keys with no value.
    } else {
      for (const k in obj) {
        if (typeof obj[k] === 'object' && obj[k] !== null) {
          cb(path, 'key', k);
          path.push(k);
          traverse(obj[k]);
          path.pop();
        } else {
          cb(path, 'key', k);
          if (typeof obj[k] === 'string' && obj[k]) {
            path.push(k);
            cb(path, 'leaf', obj[k]);
            path.pop();
          }
        }
      }
    }
  }

  traverse(obj);
}
