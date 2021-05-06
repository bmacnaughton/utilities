'use strict';

function permutations(arr, n = arr.length, out = []) {
  for (let i = 0; i < n; i++) {
    // if down to one remaing just use it
    if (n === 2) {
      out.push(arr.slice());
    } else {
      permutations(arr, n - 1, out);
    }
    const j = n % 2 == 0 ? i : 0;
    const t = arr[n - 1];
    arr[n - 1] = arr[j];
    arr[j] = t;
  }
  return out;
}