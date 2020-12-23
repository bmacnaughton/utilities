
class Debounce {
  constructor (fn, options = {}) {
    this.fn = fn;
    this.deltaT = 'deltaTime' in options ? options.deltaTime : 5000;
    this.deltaC = 'deltaCount' in options ? options.deltaCount : 100;
    this.this = options.this || this;

    this.count = 0;
    // start time and count at negative values so the first occurrence will
    // always take place no matter what the settings.
    this.lastTime = -this.deltaT;
    this.lastCount = -this.deltaC;

  }

  execute (...args) {
    this.count += 1;
    const now = Date.now();
    // has the count of errors exceeded the delta limit or the time window been exceeded?
    if ((this.count - this.lastCount) >= this.deltaC || (now - this.lastTime) > this.deltaT) {
      this.lastCount = this.count;
      this.lastTime = now;
      return this.fn(...args);
    }

    return undefined;
  }
}

module.exports = Debounce
