'use strict';

//
// async pool class implementation
//
// each instance is a fixed-size pool for executing async functions, allowing
// parallel execution up to the pool size. because of the nature of node, this
// is not useful for CPU-bound functions; it is intended to allow multiple
// async activities to proceed in parallel. the main benefit to this, versus
// using using Promise.all() is that it does not wait for all promises to
// resolve before starting another batch of executions - it starts executing a
// new function as soon as one completes. the primary benefit compared with
// Promise.race() is that it handles limiting the number of simultaneous
// activities to a fixed number. The primary negative is that the return value
// from the async functions is not available to the caller.
//
const timeout = require('node:timers/promises').setTimeout;


class AsyncPool {
  constructor(n) {
    // total number of async instances that can be in progress
    this.n = n;
    // these are the xq "instances" that have not settled
    this.promises = Array(n);
    // these indexes in promises are available for use.
    this.freeslots = [...this.promises.keys()];
  }

  // fn must return a promise.
  async xq(fn) {
    // if no free slots, wait for one to open up.
    if (!this.freeslots.length) {
      await Promise.race(this.promises);
    }

    // get the first free slot and use it for the function's promise
    const slot = this.freeslots.shift();
    this.promises[slot] = fn()
      .then(r => {
        // clear the promise and add that slot to the free slots list. this leaves
        // a hole in the promises list but it will be filled in when that slot is
        // reused. Promise.all() and Promise.race() aren't affected by the holes.
        delete this.promises[slot];
        this.freeslots.push(slot);
        return r;
      });
  }

  // add timedXq
  async timedXq(fn, cb) {
    if (!this.freeslots.length) {
      await Promise.race(this.promises);
    }

    const slot = this.freeslots.shift();
    const startTime = Date.now();
    this.promises[slot] = fn()
      .then(() => {
        cb(Date.now() - startTime);
        delete this.promises[slot];
        this.freeslots.push(slot);
      });
  }


  async done() {
    return Promise.all(this.promises);
  }
}

module.exports = {AsyncPool};

//
// how to use it
//
// await xq(your async/promise-returning function) and it will
// invoke functions up to the limit specified when you created
// it.
//
// when you're done with all the functions you wish to execute
// await xq.done() to wait for any unsettled promises.
//

if (require.main === module) {
  let useFactory = true;
  if (process.argv.length > 2) {
    useFactory = false;
  }

  const N = 24;
  let n = N;
  let totalTime = 0;
  // const minTime = 500;
  // const maxTime = 1500;
  const minTime = 1000;
  const maxTime = 1000;

  async function main() {
    const done = [];

    const ap = new AsyncPool(10);

    const start = Date.now();
    // execute a total of N
    while (n > 0) {
      // capture actual time for each of the async functions
      const thisTime = Date.now();
      const timeToWait = Math.floor(Math.random() * (maxTime - minTime)) + minTime;

      const p = timeout(timeToWait, timeToWait)
        .then(() => totalTime += Date.now() - thisTime);

      //const f = () => p.then(r => console.log(r));
      const f = () => p;
      await ap.xq(f);
      n -= 1;
    }

    // wait on all to complete
    await ap.done();
    // calculate the elapsed time for all to complete.
    const et = Date.now() - start;
    return et;
  }

  let executor = main;

  if (process.argv[2] === undefined) {
    executor = main;
  } else if (process.argv[2] === '-t') {
    executor = useTimedXq;
  } else if (process.argv[2] === '-f') {
    executor = fubar;
  } else {
    console.error('invalid argument', process.argv[2]);
  }

  async function useTimedXq() {
    const ap = new AsyncPool(10);

    const start = Date.now();
    // execute a total of N
    while (n > 0) {
      // compute wait time for each of the async functions
      const timeToWait = Math.floor(Math.random() * (maxTime - minTime)) + minTime;

      const fn = () => new Promise(resolve => setTimeout(resolve, timeToWait));

      await ap.timedXq(fn, (et) => totalTime += et);
      n -= 1;
    }

    await ap.done();

    // calculate the elapsed time for all to complete.
    const et = Date.now() - start;
    return et;
  }

  async function fubar() {
    const t1 = timeout(1000, 1);
    const t2 = timeout(2000, 2);
    const t3 = timeout(3000, 3);
    const promises = [t1, t2, t3];
    console.log(await Promise.race(promises));
    console.log(await Promise.race(promises));
    console.log(await Promise.race(promises));
  }

  // eslint-disable-next-line no-console
  executor().then(et => console.log(`executed ${N} timeouts totaling ${totalTime}ms in ${et}ms`));


}
