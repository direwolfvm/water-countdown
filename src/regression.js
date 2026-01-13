function computeProjection(observations) {
  if (!Array.isArray(observations) || observations.length < 2) {
    return {
      hasRegression: false,
      hasProjection: false,
      errorMessage: "Projection not available with fewer than 2 observations.",
    };
  }

  const epochTimes = observations.map((obs) => obs.observed_at.getTime());
  const t0 = epochTimes[0];
  const times = epochTimes.map((t) => (t - t0) / 1000);
  const values = observations.map((obs) => Number(obs.value));

  const mean = (arr) => arr.reduce((sum, val) => sum + val, 0) / arr.length;
  const meanT = mean(times);
  const meanY = mean(values);

  let numerator = 0;
  let denominator = 0;
  for (let i = 0; i < times.length; i += 1) {
    const tDiff = times[i] - meanT;
    const yDiff = values[i] - meanY;
    numerator += tDiff * yDiff;
    denominator += tDiff * tDiff;
  }

  if (denominator === 0) {
    return {
      hasRegression: false,
      hasProjection: false,
      errorMessage: "Cannot estimate projection with current data.",
    };
  }

  const slope = numerator / denominator;
  const intercept = meanY - slope * meanT;

  const regression = {
    slope,
    intercept,
    t0,
  };

  if (slope <= 0) {
    return {
      hasRegression: true,
      regression,
      hasProjection: false,
      errorMessage: "Cannot estimate date to reach 30000 with current data.",
    };
  }

  const target = 30000;
  const tTarget = (target - intercept) / slope;
  const projectedDate = new Date(t0 + tTarget * 1000);

  const latestObservation = observations[observations.length - 1].observed_at;
  if (projectedDate.getTime() < latestObservation.getTime()) {
    return {
      hasRegression: true,
      regression,
      hasProjection: false,
      errorMessage: "Cannot estimate date to reach 30000 with current data.",
    };
  }

  const now = Date.now();
  const daysRemaining = Math.round(
    (projectedDate.getTime() - now) / (1000 * 60 * 60 * 24)
  );

  return {
    hasRegression: true,
    regression,
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
  computeProjection,
};
