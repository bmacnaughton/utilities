const timers = [];

const TIMER_COUNT = 10;
const TIMER_INTERVAL = 100; // interval in ms
const TIMER_COUNTDOWN = 100; // how many times for timer to pop

let n = TIMER_COUNT;

const initialCpu = process.cpuUsage();

// adjust for using setTimeout(), not setInterval()
const TOTAL_TIMEOUTS = TIMER_COUNT * TIMER_COUNTDOWN;
const TIMEOUT_MS = TIMER_INTERVAL / TIMER_COUNT;

let timeoutsLeft = TOTAL_TIMEOUTS;

function timeoutHandler() {
  timeoutsLeft -= 1;
  if (timeoutsLeft <= 0) {
    const finalCpu = process.cpuUsage(initialCpu);
    console.log(`user: ${finalCpu.user}µs, system: ${finalCpu.system}µs`);
  } else {
    setTimeout(timeoutHandler, TIMEOUT_MS);
  }
}

setTimeout(timeoutHandler, TIMEOUT_MS);

