const DAY_IN_MS = 1000 * 60 * 60 * 24;
const EPSILON = 1e-9;

const REGRESSION_TYPES = [
  {
    id: "linear",
    label: "Linear",
    example: "steady change",
  },
  {
    id: "quadratic",
    label: "Quadratic",
    example: "curving acceleration",
  },
  {
    id: "exponential",
    label: "Exponential",
    example: "compound growth",
  },
  {
    id: "logarithmic",
    label: "Logarithmic",
    example: "fast then leveling",
  },
  {
    id: "power",
    label: "Power",
    example: "scaling curve",
  },
];

function mean(values) {
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function solve3x3(matrix, vector) {
  const augmented = matrix.map((row, index) => [...row, vector[index]]);

  for (let pivot = 0; pivot < 3; pivot += 1) {
    let maxRow = pivot;
    for (let row = pivot + 1; row < 3; row += 1) {
      if (Math.abs(augmented[row][pivot]) > Math.abs(augmented[maxRow][pivot])) {
        maxRow = row;
      }
    }

    if (Math.abs(augmented[maxRow][pivot]) < EPSILON) {
      return null;
    }

    if (maxRow !== pivot) {
      [augmented[pivot], augmented[maxRow]] = [augmented[maxRow], augmented[pivot]];
    }

    const pivotValue = augmented[pivot][pivot];
    for (let column = pivot; column < 4; column += 1) {
      augmented[pivot][column] /= pivotValue;
    }

    for (let row = 0; row < 3; row += 1) {
      if (row === pivot) {
        continue;
      }

      const factor = augmented[row][pivot];
      for (let column = pivot; column < 4; column += 1) {
        augmented[row][column] -= factor * augmented[pivot][column];
      }
    }
  }

  return augmented.map((row) => row[3]);
}

function fitLinear(times, values) {
  const meanT = mean(times);
  const meanY = mean(values);

  let numerator = 0;
  let denominator = 0;
  for (let index = 0; index < times.length; index += 1) {
    const tDiff = times[index] - meanT;
    const yDiff = values[index] - meanY;
    numerator += tDiff * yDiff;
    denominator += tDiff * tDiff;
  }

  if (Math.abs(denominator) < EPSILON) {
    return null;
  }

  const slope = numerator / denominator;
  const intercept = meanY - slope * meanT;

  return {
    type: "linear",
    slope,
    intercept,
    predict: (time) => slope * time + intercept,
    projectTime: (target) => {
      if (slope <= 0) {
        return null;
      }
      return (target - intercept) / slope;
    },
    parameterLines: [
      `m (slope): ${slope.toFixed(4)} per day`,
      `b (intercept): ${intercept.toFixed(2)}`,
    ],
  };
}

function fitQuadratic(times, values) {
  const n = times.length;
  let sumX = 0;
  let sumX2 = 0;
  let sumX3 = 0;
  let sumX4 = 0;
  let sumY = 0;
  let sumXY = 0;
  let sumX2Y = 0;

  for (let index = 0; index < times.length; index += 1) {
    const x = times[index];
    const y = values[index];
    const x2 = x * x;

    sumX += x;
    sumX2 += x2;
    sumX3 += x2 * x;
    sumX4 += x2 * x2;
    sumY += y;
    sumXY += x * y;
    sumX2Y += x2 * y;
  }

  const solution = solve3x3(
    [
      [sumX4, sumX3, sumX2],
      [sumX3, sumX2, sumX],
      [sumX2, sumX, n],
    ],
    [sumX2Y, sumXY, sumY]
  );

  if (!solution) {
    return null;
  }

  const [a, b, c] = solution;

  return {
    type: "quadratic",
    a,
    b,
    c,
    predict: (time) => a * time * time + b * time + c,
    projectTime: (target, latestTime) => {
      if (Math.abs(a) < EPSILON) {
        if (Math.abs(b) < EPSILON) {
          return null;
        }
        const linearTime = (target - c) / b;
        return linearTime >= latestTime ? linearTime : null;
      }

      const adjustedC = c - target;
      const discriminant = b * b - 4 * a * adjustedC;
      if (discriminant < 0) {
        return null;
      }

      const root = Math.sqrt(discriminant);
      const roots = [
        (-b - root) / (2 * a),
        (-b + root) / (2 * a),
      ].filter((time) => Number.isFinite(time) && time >= latestTime);

      if (roots.length === 0) {
        return null;
      }

      return Math.min(...roots);
    },
    parameterLines: [
      `a: ${a.toFixed(6)}`,
      `b: ${b.toFixed(4)}`,
      `c: ${c.toFixed(2)}`,
    ],
  };
}

function fitExponential(times, values) {
  if (values.some((value) => value <= 0)) {
    return null;
  }

  const transformed = values.map((value) => Math.log(value));
  const linearFit = fitLinear(times, transformed);
  if (!linearFit) {
    return null;
  }

  const amplitude = Math.exp(linearFit.intercept);
  const rate = linearFit.slope;

  return {
    type: "exponential",
    amplitude,
    rate,
    predict: (time) => amplitude * Math.exp(rate * time),
    projectTime: (target) => {
      if (amplitude <= 0 || rate <= 0 || target <= 0) {
        return null;
      }
      return Math.log(target / amplitude) / rate;
    },
    parameterLines: [
      `A: ${amplitude.toFixed(2)}`,
      `k: ${rate.toFixed(6)} per day`,
    ],
  };
}

function fitLogarithmic(times, values) {
  const transformedTimes = times.map((time) => Math.log(time + 1));
  const linearFit = fitLinear(transformedTimes, values);
  if (!linearFit) {
    return null;
  }

  const a = linearFit.slope;
  const b = linearFit.intercept;

  return {
    type: "logarithmic",
    a,
    b,
    predict: (time) => a * Math.log(time + 1) + b,
    projectTime: (target) => {
      if (a <= 0) {
        return null;
      }
      return Math.exp((target - b) / a) - 1;
    },
    parameterLines: [
      `a: ${a.toFixed(4)}`,
      `b: ${b.toFixed(2)}`,
    ],
  };
}

function fitPower(times, values) {
  if (values.some((value) => value <= 0)) {
    return null;
  }

  const transformedTimes = times.map((time) => Math.log(time + 1));
  const transformedValues = values.map((value) => Math.log(value));
  const linearFit = fitLinear(transformedTimes, transformedValues);
  if (!linearFit) {
    return null;
  }

  const amplitude = Math.exp(linearFit.intercept);
  const exponent = linearFit.slope;

  return {
    type: "power",
    amplitude,
    exponent,
    predict: (time) => amplitude * Math.pow(time + 1, exponent),
    projectTime: (target) => {
      if (amplitude <= 0 || exponent <= 0 || target <= 0) {
        return null;
      }
      return Math.pow(target / amplitude, 1 / exponent) - 1;
    },
    parameterLines: [
      `A: ${amplitude.toFixed(2)}`,
      `b: ${exponent.toFixed(4)}`,
    ],
  };
}

function getRegressionLabel(type) {
  return REGRESSION_TYPES.find((option) => option.id === type)?.label || "Linear";
}

function buildEquation(fit) {
  switch (fit.type) {
    case "quadratic":
      return `y = ${fit.a.toFixed(6)}t^2 + ${fit.b.toFixed(4)}t + ${fit.c.toFixed(2)}`;
    case "exponential":
      return `y = ${fit.amplitude.toFixed(2)}e^(${fit.rate.toFixed(6)}t)`;
    case "logarithmic":
      return `y = ${fit.a.toFixed(4)} ln(t + 1) + ${fit.b.toFixed(2)}`;
    case "power":
      return `y = ${fit.amplitude.toFixed(2)}(t + 1)^${fit.exponent.toFixed(4)}`;
    case "linear":
    default:
      return `y = ${fit.slope.toFixed(4)}t + ${fit.intercept.toFixed(2)}`;
  }
}

function buildRegressionLine(fit, maxTime) {
  const finalTime = Math.max(maxTime, 1);
  const steps = 40;
  const points = [];

  for (let index = 0; index <= steps; index += 1) {
    const time = (finalTime * index) / steps;
    const value = fit.predict(time);
    if (Number.isFinite(value)) {
      points.push({ x: time, y: value });
    }
  }

  return points;
}

function computeProjection(observations, target, regressionType = "linear") {
  if (!Array.isArray(observations) || observations.length < 2) {
    return {
      hasRegression: false,
      hasProjection: false,
      errorMessage: "Projection not available with fewer than 2 observations.",
    };
  }

  const epochTimes = observations.map((obs) => obs.observed_at.getTime());
  const t0 = epochTimes[0];
  const times = epochTimes.map((time) => (time - t0) / DAY_IN_MS);
  const values = observations.map((obs) => Number(obs.value));
  const latestTime = times[times.length - 1];

  const fitters = {
    linear: fitLinear,
    quadratic: fitQuadratic,
    exponential: fitExponential,
    logarithmic: fitLogarithmic,
    power: fitPower,
  };

  const fit = fitters[regressionType]?.(times, values);
  if (!fit) {
    return {
      hasRegression: false,
      hasProjection: false,
      errorMessage: `Cannot fit a ${getRegressionLabel(regressionType).toLowerCase()} regression with current data.`,
    };
  }

  const regression = {
    type: fit.type,
    label: getRegressionLabel(fit.type),
    t0,
    equation: buildEquation(fit),
    parameterLines: [...fit.parameterLines, `t = days since ${new Date(t0).toISOString().slice(0, 10)}`],
  };

  const projectedTime = fit.projectTime(target, latestTime);
  const regressionLine = buildRegressionLine(fit, latestTime);

  if (!Number.isFinite(projectedTime) || projectedTime < latestTime) {
    return {
      hasRegression: true,
      regression,
      regressionLine,
      hasProjection: false,
      errorMessage: `Cannot estimate date to reach ${target} with current data.`,
    };
  }

  const projectedDate = new Date(t0 + projectedTime * DAY_IN_MS);
  const daysRemaining = Math.round(
    (projectedDate.getTime() - Date.now()) / DAY_IN_MS
  );

  return {
    hasRegression: true,
    regression,
    regressionLine,
    hasProjection: true,
    projectedDate: projectedDate.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    }),
    daysRemaining,
  };
}

module.exports = {
  REGRESSION_TYPES,
  computeProjection,
};
