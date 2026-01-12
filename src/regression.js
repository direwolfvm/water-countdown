function computeProjection(observations) {
  if (!Array.isArray(observations) || observations.length < 2) {
    return {
      hasProjection: false,
      errorMessage: "Projection not available with fewer than 2 observations.",
    };
  }

  const times = observations.map((obs) => obs.observed_at.getTime());
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
      hasProjection: false,
      errorMessage: "Cannot estimate projection with current data.",
    };
  }

  const slope = numerator / denominator;
  if (slope <= 0) {
    return {
      hasProjection: false,
      errorMessage: "Cannot estimate date to reach 30000 with current data.",
    };
  }

  const intercept = meanY - slope * meanT;
  const target = 30000;
  const tTarget = (target - intercept) / slope;
  const projectedDate = new Date(tTarget);

  const latestObservation = observations[observations.length - 1].observed_at;
  if (projectedDate.getTime() < latestObservation.getTime()) {
    return {
      hasProjection: false,
      errorMessage: "Cannot estimate date to reach 30000 with current data.",
    };
  }

  const now = Date.now();
  const daysRemaining = Math.round((tTarget - now) / (1000 * 60 * 60 * 24));

  return {
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
