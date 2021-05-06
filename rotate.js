'use strict';

function rotate(a, n) {
  if (a.length === 0 || n === 0) {
    return a;
  }
  n = n % a.length;
  return [...a.slice(n), ...a.slice(0, n)];
}
