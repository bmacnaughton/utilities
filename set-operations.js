// return all setops. not sure it's useful really.
function all (s1, s2) {
  if (Array.isArray(s1) && Array.isArray(s2)) {
    s1 = new Set(s1);
    s2 = new Set(s2);
  } else if (typeof s1 === 'object' && typeof s2 === 'object') {
    s1 = new Set(Object.keys(s1));
    s2 = new Set(Object.keys(s2));
  } else if (s1.constructor !== Set || s2.constructor !== Set) {
    throw new TypeError('arguments must be arrays, objects, or sets');
  }

  return {
    s1, s2,
    union: union(s1, s2),
    intersection: intersection(s1, s2),
    difference: difference(s1, s2),
  };
}

function union (s1, s2) {
  return new Set([...s1, ...s2]);
}

function intersection (s1, s2) {
  return new Set([...s1].filter(i => s2.has(i)));
}

function difference (s1, s2) {
  return new Set([...s1].filter(i => !s2.has(i)));
}

module.exports = {
  all,
  union,
  intersection,
  difference,
}
