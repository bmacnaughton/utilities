// this is not particularly useful in a node environment. it seems that
// making multiple calls to setTimeout() is more costly than just using
// multiple intervals. see t-timeout.js and t-interval.js. makes sense:
// same number of calls to callback functions, but setTimeout() requires
// a separate call from javascript to V8 for each timer. also allocation
// of timer, insertion into V8's queue, etc.

// a time is {time, fn, repeat}
class TimerQueue {
  constructor (options = {}) {
    this.timers = [];         // list of {time, fn, repeat} ordered by time
    this.id = undefined;      // the setTimeout() id, if any
    this.next = undefined;    // the time targeted by setTimeout()
    this.unref = options.unref || false;
  }

  // time in ms before popping timer
  addTimer (ms, fn, options = {}) {
    // if repeat is non-zero, it's an interval timer
    let repeat = options.repeat ? ms : 0;
    const target = Date.now() + ms;

    this.insertTimer(target, {time: target, fn, repeat});

    // if there are no more timers in the queue after executing those that
    // expired we're done.
    if (this.executeExpired() === 0) {
      return;
    }

    // if a new timer pops before the current timeout clear it.
    if (this.next && this.timers[0].time < this.next) {
      clearTimeout(this.id);
      this.setNextTimeout();
    } else if (!this.next) {
      this.setNextTimeout();
    }
  }

  insertTimer(time, timerInfo) {
    let i = 0;
    while (this.timers[i] && time >= this.timers[i].time) {
      i += 1;
    }
    this.timers.splice(i, 0, timerInfo);
  }

  setNextTimeout () {
    this.next = this.timers[0].time;
    this.id = setTimeout(() => {
      if (this.executeExpired()) {
        // if there is at least one timer in the queue after executing those
        // that expired, set the next timeout.
        this.setNextTimeout();
      } else {
        this.next = undefined;
        this.id = undefined;
      }
    }, this.timers[0].time - Date.now()).unref();

  }

  executeExpired () {
    let now = Date.now();

    // execute any functions whose time has come.
    while (this.timers.length && this.timers[0].time <= now) {
      const timer = this.timers.shift();
      timer.fn();

      // update just in case a function takes a long time to execute.
      now = Date.now();
      if (timer.repeat) {
        timer.time = now + timer.repeat;
        this.insertTimer(timer.time, timer);
      }
    }

    return this.timers.length;
  }

}

module.exports = TimerQueue

if (!module.parent) {
  const tq = new TimerQueue();

  /* eslint-disable no-console */
  new Promise(resolve => {
    tq.addTimer(1000, function f1000 () {
      console.log('1000');
      resolve('done');
    });
    tq.addTimer(250, function f250 () {console.log('250')});
    tq.addTimer(350, function f350 () {console.log('350')});
    tq.addTimer(1, function f1 () {
      console.log('1');
      tq.addTimer(100, function f100 () {console.log('100')}, {repeat: true});
    });
  })
    .then(r => console.log(r))
    .catch(e => console.log('error', e.message));

  // an ref'd timer so the other doesn't go away
  setTimeout(() => {
    console.log('timeout');
  }, 5000);
}
