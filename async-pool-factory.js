'use strict';

//
// async pool executor
//

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

module.exports = asyncPoolFactory;

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

  const N = 24;
  let n = N;
  let totalTime = 0;
  const minTime = 500;
  const maxTime = 1500;
  async function main() {
    const done = [];
    const xq = asyncPoolFactory(10);

    const start = Date.now();
    while (n > 0) {
      // capture actual time for each of the async functions
      const thisTime = Date.now();
      const time = Math.floor(Math.random() * (maxTime - minTime)) + minTime;

      const p = new Promise(resolve => {
        setTimeout(function() {
          // aggregate total time spent
          totalTime += Date.now() - thisTime;
          resolve();
        }, time);
      });
      done.push(await xq(() => {
        // return the promise
        return p;
      }));
      n -= 1;
    }

    // wait on all to complete
    await xq.done();
    const et = Date.now() - start;
    return et;
  }

  // eslint-disable-next-line no-console
  main().then(et => console.log(`executed ${N} timeouts totaling ${totalTime}ms in ${et}ms`));

}
