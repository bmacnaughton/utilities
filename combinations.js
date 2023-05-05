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

//
// tagged combinations generator. it takes any number of arguments of the form:
// {key1: [value1, value2]}, {keyA: [valueA, valueB]} and returns an array of
// the combinations:
// [
//   [{key1: value1}, {keyA: valueA}],
//   [{key1: value2}, {keyA: valueA}],
//   [{key1: value1}, {keyA: valueB}],
//   [{key1: value2}, {keyA: valueB}],
// ]
//
// the number of combinations generated is equal to the multiplication of the
// lengths of each array supplied as an argument. arrays of zero length are skipped.
//
function* makeTaggedCombinations(head, ...tail) {
  const key = Object.keys(head)[0];
  const values = head[key];
  const remainder = tail.length ? makeCombinations(...tail) : [[]];
  // skip empty arrays so they don't result in zero combinations.
  if (values.length) {
    for (const r of remainder) {
      for (const h of values) {
        yield [{ [key]: h }, ...r];
      }
    }
  } else {
    for (const r of remainder) {
      yield [...r];
    }
  }
}

module.exports = {
  combinations,
  makeTaggedCombinations,
};
