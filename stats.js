'use strict';

function stats(array) {
  const n = array.length;
  const total = array.reduce((tot, v) => tot + v, 0);
  const mean = total / n;
  const stddev = variance(array) ** 0.5;

  return {n, total, mean, stddev};
}

function mean(array) {
  return array.reduce((tot, v) => tot + v, 0) / array.length;
}

function variance(array) {
  const average = mean(array);
  return mean(array.map((num) => (num - average) ** 2));
}

function stddev(array) {
  return variance(array) ** 0.5;
}

module.exports = {
  stats,
  mean,
  variance,
  stddev
};
