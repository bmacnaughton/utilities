'use strict';

// https://stackoverflow.com/questions/4459928/how-to-deep-clone-in-javascript
function clone (obj, hash = new WeakMap()) {
  if (Object(obj) !== obj) return obj;      // primitives
  if (hash.has(obj)) return hash.get(obj);  // cyclic reference
  let result;

  if (obj instanceof Set) {
    result = new Set(obj);                  // treat set as a value
  } else if (obj instanceof Map) {
    result = new Map(Array.from(obj, ([key, val]) => [key, clone(val, hash)]));
  } else if (obj instanceof Date) {
    result = new Date(obj);
  } else if (obj instanceof RegExp) {
    result = new RegExp(obj.source, obj.flags);
  } else if (obj.constructor) {
    result = new obj.constructor();
  } else {
    result = Object.create(null);
  }
  hash.set(obj, result);
  return Object.assign(result, ...Object.keys(obj).map(key => {
    return {[key]: clone(obj[key], hash)};
  }));
}

module.exports = clone;
