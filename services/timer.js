const countDown = (emit = console.log, from = 3, to = 0) => {
  let count = from;
  const interval = setInterval(() => {
    emit(count);

    count--;

    if (count === to) clearInterval(interval);
  }, 1000);

  return interval;
};

const countUp = (emit = console.log, from = 0, to = 91) => {
  let count = from;
  const interval = setInterval(() => {
    emit(count);

    count++;

    if (count === to) clearInterval(interval);
  }, 1000);

  return interval;
};

class Timer {
  interval = null;

  startCounter = (emit = console.log) => {
    console.log('Start timer');
    this.interval = countDown(emit);

    setTimeout(() => {
      this.interval = countUp(emit);
    }, 3000);
  };

  cancelCounter = () => clearInterval(this.interval);
}

module.exports = { countDown, countUp, Timer };
