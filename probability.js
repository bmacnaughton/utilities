'use strict';


// calculate the probability of n of the possibilities coming up
// sampleCount times in a row.
function probability(possibilities, sampleCount, n = 1) {
  sampleCount = Math.floor(sampleCount);
  possibilities = Math.floor(possibilities);

  // if there is only one possibility the chance is 100%
  if (possibilities <= 1) {
    return possibilities;
  }

  possibilities = n / possibilities;

  let chance = 1;
  while (sampleCount-- > 0) {
    chance *= possibilities;
  }
  return chance;
}

module.exports = {
  probability,
};
