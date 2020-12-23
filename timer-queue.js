// a time is {time, fn}
class TimerQueue {
  constructor () {
    this.timers = [];         // list of {time, fn} ordered by time
    this.id = undefined;      // the setTimeout() id, if any
    this.next = undefined;    // the time targeted by setTimeout()
  }

  // time in ms before popping timer
  addTimer (ms, fn) {
    const target = Date.now() + ms;

    let i = 0;
    while (this.timers[i] && target >= this.timers[i].time) {
      i += 1;
    }
    this.timers.splice(i, 0, {time: target, fn});

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

  setNextTimeout () {
    this.next = this.timers[0].time;
    this.id = setTimeout(() => {
      if (this.executeExpired()) {
        this.setNextTimeout();
      } else {
        this.next = undefined;
        this.id = undefined;
      }
    }, this.timers[0].time - Date.now());
  }

  executeExpired () {
    let now = Date.now();

    // execute any functions whose time has come.
    while (this.timers.length && this.timers[0].time <= now) {
      const timer = this.timers.shift();
      timer.fn();
      // update just in case a function takes a long time to execute.
      now = Date.now();
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
      tq.addTimer(100, function f100 () {console.log('100')});
    });
  })
    .then(r => console.log(r))
    .catch(e => console.log('error', e.message));
}
