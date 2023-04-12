'use strict';

function permutations (arr, n = arr.length, out = []) {
  for (let i = 0; i < n; i++) {
    // if down to one remaining just use it
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

function* genPermutationsV0 (arr, n = arr.length, out = []) {
  for (let i = 0; i < n; i++) {
    // if down to one remaining just use it
    if (n === 2) {
      yield arr.slice();
    } else {
      yield* genPermutations(arr, n - 1);
    }
    const j = n % 2 == 0 ? i : 0;
    const t = arr[n - 1];
    arr[n - 1] = arr[j];
    arr[j] = t;
  }
}

function* genPermutations (arr, n = arr.length) {
  const factorials = [1];
  for (let i = 1; i <= n; i++) {
    factorials[i] = factorials[i - 1] * i;
  }

  for (let i = 0; i < factorials[n]; i++) {
    const onePermutation = [];
    const temp = arr.slice();
    let positionCode = i;
    for (let position = arr.length; position > 0; position--) {
      const selected = Math.floor(positionCode / factorials[position - 1]);
      onePermutation.push(temp[selected]);
      positionCode = positionCode % factorials[position - 1];
      temp.splice(selected, 1);
    }
    yield onePermutation;
  }
}

module.exports = {permutations, genPermutations, genPermutationsV0};

if (!module.parent) {
  const gp = genPermutations;
  const dOdd = [1, 2, 4];
  const dEven = [1, 2, 4, 8];

  let r = [...gp(dOdd)];
  /* eslint-disable no-console */
  console.log(r);

  r = [...gp(dEven)];
  console.log(r);

  r = [...gp(['n', 'o', 'd', 'e'])];
  console.log(r.map(letters => letters.join('')));
}
