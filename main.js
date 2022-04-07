import S from "s-js";
import * as flyd from "flyd";
import * as kefir from "kefir";

function left(x) {
  return x + 1;
}

function right(x) {
  return x - 1;
}

function add(x, y) {
  return (x + y) / 2;
}

function sleep(duration) {
  return new Promise((resolve) => {
    setTimeout(resolve, duration);
  });
}

const createTest =
  ({ split, combine, depth }) =>
  (parent) => {
    if (depth === 0) {
      return parent;
    } else {
      return combine(
        ...split(parent).map(createTest({ split, combine, depth: depth - 1 }))
      );
    }
  };

function runTest({ name, create, subscribe, split, combine, set }) {
  const start = `${name}:start`,
    end = `${name}:end`,
    input = create(),
    output = createTest({ split, combine, depth: 10 })(input);

  subscribe((value) => {
    // performance.mark(`${name}:result:${value}`);
  }, output);

  performance.mark(start);

  for (let i = 0; i < 500; i++) {
    set(i, input);
  }

  performance.mark(end);
  performance.measure(name, start, end);
}

async function run() {
  let kefirEmitter;

  runTest({
    name: "kefir",
    create() {
      return kefir.stream((emitter) => {
        kefirEmitter = emitter;
      });
    },
    split(a) {
      return [a.map(left), a.map(right)];
    },
    combine(a, b) {
      return kefir.combine([a, b], add);
    },
    subscribe(fn, a) {
      a.onValue(fn);
    },
    set(value) {
      kefirEmitter.emit(value);
    },
  });

  await sleep(100);

  runTest({
    name: "flyd",
    create() {
      return flyd.stream(0);
    },
    split(a) {
      return [flyd.map(left, a), flyd.map(right, a)];
    },
    combine(a, b) {
      return flyd.combine((a, b) => add(a(), b()), [a, b]);
    },
    subscribe(fn, a) {
      flyd.combine((a) => fn(a()), [a]);
    },
    set(value, a) {
      a(value);
    },
  });

  await sleep(100);

  runTest({
    name: "s-js",
    create() {
      return S.data(0);
    },
    split(a) {
      return [S(() => left(a())), S(() => right(a()))];
    },
    combine(a, b) {
      return S(() => add(a(), b()));
    },
    subscribe(fn, a) {
      S(() => fn(a()));
    },
    set(value, a) {
      a(value);
    },
  });
}

window.addEventListener("load", run);
