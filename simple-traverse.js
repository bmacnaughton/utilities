'use strict';
/* eslint-disable block-spacing, brace-style */
/* eslint-disable complexity */
function simpleTraverse(obj, cb) {
  if (typeof obj !== 'object' || obj === null) {
    return;
  }
  const path = [];
  function traverse(obj) {
    //console.log('into traverse', obj);
    const isArray = Array.isArray(obj);
    for (const k in obj) {
      if (isArray) {
        // if it is an array, store each index as in path but don't call the
        // callback on the index itself as they are just numeric strings.
        path.push(k);
        if (typeof obj[k] === 'object' && obj[k] !== null) {
          traverse(obj[k]);
        } else if (typeof obj[k] === 'string' && obj[k]) {
          cb(path, 'leaf', obj[k]);
        }
        path.pop();
      } else if (typeof obj[k] === 'object' && obj[k] !== null) {
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

  traverse(obj);
}
/* eslint no-unused-vars: ["error", { "varsIgnorePattern": "o\\d" }]*/
/* eslint-disable object-curly-spacing */
const o1 = {bruce: {wayne: {a: ['a', 'b', 'c']}}};
const o2 = {bruce: {wayne: {a: ['a', 'b', 'c', {another: {level: {of: [8, 9, {z: 'zee'}]}}}]}}};
const o3 = ['z', {an: {other: 'thing'}}];
const o4 = {x: {y: '', z: 'zee'}};

simpleTraverse(o4, function(...args) {console.log(...args);});
