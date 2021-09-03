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
 * @returns {function} a function that takes an async/promise-returning
 * function as a parameter.
 */

function asyncPoolFactory(n) {
  const promises = Array(n);
  const freeslots = [...promises.keys()];

  // execute fn
  async function xq(fn) {
    // if there are no free slots wait for one to open
    if (!freeslots.length) {
      await Promise.race(promises);
    }
    const slot = freeslots.splice(0, 1)[0];
    promises[slot] = fn()
      .then(r => {
        // clear the promise and add that slot to the free slots list
        delete promises[slot];
        freeslots.push(slot);
        return r;
      });
  }

  xq.promises = promises;
  xq.freeslots = freeslots;
  // provide a function the user can call to wait on any unsettled promises
  xq.done = async() => Promise.all(promises);

  // return the executor
  return xq;
}

module.exports = asyncPoolFactory

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
  async function main() {
    const done = [];
    const xq = asyncPoolFactory(10);

    const start = Date.now();

    let n = 24;
    while (n > 0) {
      const p = new Promise(resolve => {
        setTimeout(resolve, 1000);
      });
      await xq(() => p);
      n -= 1;
    }

    await xq.done();
    const et = Date.now() - start;
    return et;
  }

  main().then(et => console.log(et));

}
