'use strict';

// Generate all combinations of array elements
// https://stackoverflow.com/questions/15298912/javascript-generating-combinations-from-n-arrays-with-m-elements
//
function* combinations(head, ...tail) {
  const remainder = tail.length ? combinations(...tail) : [[]];
  for (const r of remainder) {
    for (const h of head) {
      yield [h, ...r];
    }
  }
}

module.exports = combinations;
