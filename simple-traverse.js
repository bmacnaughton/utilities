'use strict';
/* eslint-disable block-spacing, brace-style */
/* eslint-disable complexity */
function simpleTraverse(obj, cb) {
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

/* eslint-disable block-spacing, brace-style */
/* eslint-disable complexity */
function* simpleTraverseGen(obj) {
  if (typeof obj !== 'object' || obj === null) {
    return;
  }
  const history = new WeakSet();
  const path = [];
  function* traverse(obj) {
    // prevent endless looping on self-referential objects
    if (history.has(obj)) {
      return;
    }
    history.add(obj);

    if (Array.isArray(obj)) {
      for (const k in obj) {
        path.push(k);
        if (typeof obj[k] === 'object' && obj[k] !== null) {
          yield* traverse(obj[k]);
        } else if (typeof obj[k] === 'string' && obj[k]) {
          yield [path, 'leaf', obj[k]];
        }
        path.pop();
      }
    } else {
      for (const k in obj) {
        yield [path, 'key', k];
        if (typeof obj[k] === 'object' && obj[k] !== null) {
          path.push(k);
          yield* traverse(obj[k]);
          path.pop();
        } else if (typeof obj[k] === 'string' && obj[k]) {
          path.push(k);
          yield [path, 'leaf', obj[k]];
          path.pop();
        }
      }
    }
  }

  yield *traverse(obj);
}


/* eslint no-unused-vars: ["error", { "varsIgnorePattern": "o\\d" }]*/
/* eslint-disable object-curly-spacing */
const o1 = {bruce: {wayne: {a: ['a', 'b', 'c']}}};
const o2 = {bruce: {wayne: {a: ['a', 'b', 'c', {another: {level: {of: [8, 9, {z: 'zee'}]}}}]}}};
const o3 = ['z', {an: {other: 'thing'}}];
const o4 = {x: {y: '', z: 'zee'}};

simpleTraverse(o4, function(...args) {console.log(...args);});


for (const [path, type, value] of simpleTraverseGen(o1)) {
  console.log(path, type, value);
}
