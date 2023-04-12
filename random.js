'use strict';

//https://stackoverflow.com/questions/521295/seeding-the-random-number-generator-in-javascript
//
// const seed = 1337 ^ 0xDEADBEEF; // 32-bit seed with optional XOR value
// Pad seed with Phi, Pi and E.
// https://en.wikipedia.org/wiki/Nothing-up-my-sleeve_number
function getRandom(seed = Date.now() >>> 0) {
  const fn = sfc32(0x9E3779B9, 0x243F6A88, 0xB7E15162, seed);
  fn.seed = seed;
  return fn;
}

function sfc32(a, b, c, d) {
  return function() {
    a >>>= 0; b >>>= 0; c >>>= 0; d >>>= 0;
    var t = (a + b) | 0;
    a = b ^ b >>> 9;
    b = c + (c << 3) | 0;
    c = (c << 21 | c >>> 11);
    d = d + 1 | 0;
    t = t + d | 0;
    c = c + t | 0;
    return (t >>> 0) / 4294967296;
  }
}

class Random {
  constructor(seed) {
    this.fn = getRandom(seed);
  }

  intMinMax(min, max) {
    return Math.floor(this.fn() * (max - min + 1)) + min;
  }

  minMax(min, max) {
    return this.fn() * (max - min) + min;
  }

}

module.exports = {
  getRandom,
  Random,
};
