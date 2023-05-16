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

// worth nothing that the generator version is quite a bit slower than the
// callback version. the results of simple-bench with issue-38.json:
/*
$ BENCH=benchmarks/traverse-gen-vs-cb.js node index.js callback
[function chain: callback]
[100000 iterations x 10 groups (1000ms intergroup pause)]
[gc count: 499, gc time: 44.082]
[group times: 55.45, 46.41, 36.75, 42.82, 38.01, 39.95, 41.22, 43.20, 38.59, 46.42]
[raw group mean 42.881 stddev 5.236 (0.000 per iteration)]
[excluding times outside 42.881 +/- 10.47: 55.45]
  [clean group mean 41.485 (0.000 per iteration) stddev 3.311]
[mean: 0.0004148 per iteration]

$ BENCH=benchmarks/traverse-gen-vs-cb.js node index.js generator
[function chain: generator]
[100000 iterations x 10 groups (1000ms intergroup pause)]
[gc count: 280, gc time: 437.205]
[group times: 309.73, 274.91, 261.07, 257.43, 259.17, 253.70, 262.28, 256.37, 253.80, 253.65]
[raw group mean 264.210 stddev 16.319 (0.003 per iteration)]
[excluding times outside 264.210 +/- 32.64: 309.73]
  [clean group mean 259.152 (0.003 per iteration) stddev 6.334]
[mean: 0.002592 per iteration]
*/
