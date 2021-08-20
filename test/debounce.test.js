'use strict';

const expect = require('chai').expect;

const Debounce = require('../debounce');

describe('test debounce wrapper', function() {
  it('should debounce by count with default delta of 100', function() {
    // how many times debouncedFunc was called.
    let count = 0;
    // lastCount's expected value each time debouncedFunc is called.
    let expectedCount = 1;

    let i;
    function debouncedFunc() {
      expect(this.lastCount).equal(i);
      expect(this.lastCount).equal(expectedCount);
      expectedCount += db.deltaC;
      count += 1;
    }
    const db = new Debounce(debouncedFunc);

    for (i = 1; i < 1001; i++) {
      db.execute();
    }
    expect(count).equal(10);
  });

  it('should debounce by count with delta of 500', function() {
    // how many times debouncedFunc was called.
    let count = 0;
    // lastCount's expected value each time debouncedFunc is called.
    let expectedCount = 1;
    let i;

    function debouncedFunc() {
      expect(this.lastCount).equal(i);
      expect(this.lastCount).equal(expectedCount);
      expectedCount += db.deltaC;
      count += 1;
    }

    const db = new Debounce(debouncedFunc, {deltaCount: 500});

    count = 0;
    expectedCount = 1;
    for (i = 1; i < 1001; i++) {
      db.execute();
    }
    expect(count).equal(2);
  });

  it('should debounce repetitive logging by time', function(done) {
    this.timeout(5000);
    // don't have mocha highlight this (even yellow) as a slow test.
    this.slow(10000);

    const kMaxSeconds = 4;

    const options = {
      deltaCount: Infinity,        // don't ever log due to count
      deltaTime: 1000              // log at most one time per second
    };

    let count = 0;
    let expectedCount = 0;

    function debouncedFunc() {
      count += 1;
    }

    const db = new Debounce(debouncedFunc, options);

    let i = 0;
    // how many seconds to let the test run.
    const id = setInterval(function() {
      i += 1;
      if (i >= kMaxSeconds) {
        clearInterval(id);
        clearInterval(lid);
        // one per second should have been logged
        expect(count).equal(kMaxSeconds);
        // total number of calls to the debounced function should be correct
        expect(db.count).equal(expectedCount);
        done();
      }
    }, 1000);

    // invoke debounced function every 10 ms
    const lid = setInterval(function() {
      expectedCount += 1;
      db.execute();
    }, 10);

  });
});
