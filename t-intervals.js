const timers = [];

const TIMER_COUNT = 10;
const TIMER_INTERVAL = 100; // interval in ms
const TIMER_COUNTDOWN = 100; // how many times for timer to pop

let n = TIMER_COUNT;

const initialCpu = process.cpuUsage();

for (let i = 0; i < TIMER_COUNT; i++) {
  // closure items
  let myCounter = TIMER_COUNTDOWN;
  const myIx = i;

  timers.push(setInterval(() => {
    myCounter -= 1;
    if (myCounter <= 0) {
      clearInterval(timers[myIx]);
      timers[myIx] = null;
      n -= 1;
      if (n <= 0) {
        const finalCpu = process.cpuUsage(initialCpu);
        console.log(`user: ${finalCpu.user}µs, system: ${finalCpu.system}µs`);
      }
    }
  }, TIMER_INTERVAL));
}
console.log('Timers started');

