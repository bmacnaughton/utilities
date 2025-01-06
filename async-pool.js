'use strict';

//
// async pool factory and class implementations
//

/*
random data:
total requests: 128931
stop - start: {"rss":1359011840,"heapTotal":1348739072,"heapUsed":286737472,"external":2460311,"arrayBuffers":1443463}
final - start: {"rss":270696448,"heapTotal":186155008,"heapUsed":33806888,"external":-4128,"arrayBuffers":-7108}
child process exited with code null
 */

/**
 * return a function that will execute up to the specified
 * number of async functions simultaneously.
 *
 * @param {integer} n the number of simultaneous functions that
 * can be active
 * @returns {function} a function that takes a promise-returning
 * function as a parameter.
 */

function asyncPoolFactory(n) {
  // these are the xq "instances" that have not settled
  const promises = Array(n);
  // these indexes (in promises) are available for use.
  const freeslots = [...promises.keys()];

  // execute fn
  async function xq(fn) {
    // if there are no free slots, wait for one to open.
    if (!freeslots.length) {
      await Promise.race(promises);
    }
    // get the first free slot and use it for the function's promise
    const slot = freeslots.shift();
    promises[slot] = fn()
      .then(r => {
        // clear the promise and add that slot to the free slots list. this leaves
        // a hole in the promises list but it will be filled in when that slot is
        // reused.
        delete promises[slot];
        freeslots.push(slot);
        return r;
      });
  }

  xq.promises = promises;
  xq.freeslots = freeslots;
  // provide a function the user can call to wait on any unsettled promises
  // after they have exhausted their need to call xq(). this would be used when
  // there is a list of tasks to complete and the end of it has been reached.
  xq.done = async () => Promise.all(promises);

  // return the executor
  return xq;
}

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

    const startTime = Date.now();
    const slot = this.freeslots.shift();
    this.promises[slot] = fn()
      .then(() => {
        delete this.promises[slot];
        this.freeslots.push(slot);
        cb(Date.now() - startTime);
      });
  }

  async done() {
    return Promise.all(this.promises);
  }
}

module.exports = {asyncPoolFactory, AsyncPool};

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
    // create an async pool of up to 10 simultaneous functions. xq is
    // the executor - pass async functions to it.
    const xq = asyncPoolFactory(10);

    const ap = new AsyncPool(10);

    const start = Date.now();
    // execute a total of N
    while (n > 0) {
      // capture actual time for each of the async functions
      const thisTime = Date.now();
      const timeToWait = Math.floor(Math.random() * (maxTime - minTime)) + minTime;

      const p = new Promise(resolve => {
        setTimeout(function() {
          // aggregate total time spent
          totalTime += Date.now() - thisTime;
          resolve();
        }, timeToWait);
      });
      const f = () => p;
      //done.push(await (useFactory ? xq(f) : ap.xq(f)));
      await (useFactory ? xq(f) : ap.xq(f));
      n -= 1;
    }

    // wait on all to complete
    await (useFactory ? xq.done() : ap.done());
    // calculate the elapsed time for all to complete.
    const et = Date.now() - start;
    return et;
  }

  const executor = process.argv.length > 3 ? useTimedXq : main;

  async function useTimedXq() {
    const ap = new AsyncPool(10);

    const start = Date.now();
    // execute a total of N
    while (n > 0) {
      // computer wait time for each of the async functions
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

  // eslint-disable-next-line no-console
  executor().then(et => console.log(`executed ${N} timeouts totaling ${totalTime}ms in ${et}ms`));


}
