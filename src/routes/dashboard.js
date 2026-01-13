const express = require("express");
const { query } = require("../db");
const { computeProjection } = require("../regression");

const router = express.Router();

router.get("/", async (req, res, next) => {
  try {
    const { rows } = await query(
      "SELECT observed_at, value FROM observations ORDER BY observed_at ASC"
    );

    const observations = rows.map((row) => ({
      observed_at: new Date(row.observed_at),
      value: Number(row.value),
    }));

    const projection = computeProjection(observations);

    let chartPoints = [];
    let regressionLine = [];
    let chartStartMs = null;
    let chartMaxY = 30000;

    if (observations.length > 0) {
      chartStartMs = observations[0].observed_at.getTime();
      chartPoints = observations.map((obs) => ({
        x: (obs.observed_at.getTime() - chartStartMs) / 1000,
        y: obs.value,
      }));
      const maxValue = Math.max(...chartPoints.map((point) => point.y));
      chartMaxY = Math.max(maxValue * 1.1, maxValue + 100, 1000);
    }

    if (projection.hasRegression && chartPoints.length > 1) {
      const { slope, intercept } = projection.regression;
      const tStart = 0;
      const tEnd = chartPoints[chartPoints.length - 1].x;
      regressionLine = [
        { x: tStart, y: intercept + slope * tStart },
        { x: tEnd, y: intercept + slope * tEnd },
      ];
    }

    res.render("layout", {
      title: "Water Fountain Tracker",
      body: "dashboard",
      chartPoints,
      regressionLine,
      chartStartMs,
      chartMaxY,
      projection,
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
