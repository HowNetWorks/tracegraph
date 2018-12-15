function cmp(a, b) {
  if (a === b) {
    return 0;
  }
  return a < b ? -1 : 1;
}

function sorted(iterable, key = null) {
  let func;
  if (key === null) {
    func = x => x;
  } else if (typeof key === "function") {
    func = key;
  } else {
    func = x => x[key];
  }

  const result = Array.from(iterable);
  for (let i = 0; i < result.length; i++) {
    result[i] = { index: i, key: func(result[i]), value: result[i] };
  }
  // Ensure that sorting is stable by comparing original indexes if the keys are
  // equal.
  result.sort((a, b) => cmp(a.key, b.key) || cmp(a.index, b.index));
  for (let i = 0; i < result.length; i++) {
    result[i] = result[i].value;
  }
  return result;
}

function permutations(things, cb) {
  const tmp = Array.from(things);
  const len = tmp.length;

  function permute(i) {
    if (i === len) {
      cb(tmp.slice());
      return;
    }

    const orig = tmp[i];
    for (let j = i; j < len; j += 1) {
      const pick = tmp[j];
      tmp[j] = orig;
      tmp[i] = pick;
      permute(i + 1);
      tmp[j] = pick;
    }
    tmp[i] = orig;
  }
  return permute(0);
}

export default { permutations, sorted };
