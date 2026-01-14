const express = require("express");
const { query } = require("../db");
const { computeProjection } = require("../regression");

const router = express.Router();

router.get("/", async (req, res, next) => {
  try {
    const fountainsResult = await query(
      "SELECT id, name, target FROM fountains ORDER BY name ASC"
    );
    const fountains = fountainsResult.rows;
    const requestedId = Number(req.query.fountain_id);
    const defaultFountain = fountains[0] || null;
    const selectedFountain =
      fountains.find((fountain) => fountain.id === requestedId) ||
      defaultFountain;

    const { rows } = selectedFountain
      ? await query(
          "SELECT observed_at, value FROM observations WHERE fountain_id = $1 ORDER BY observed_at ASC",
          [selectedFountain.id]
        )
      : { rows: [] };

    const observations = rows.map((row) => ({
      observed_at: new Date(row.observed_at),
      value: Number(row.value),
    }));

    const targetValue = selectedFountain ? Number(selectedFountain.target) : 30000;
    const target = Number.isNaN(targetValue) ? 30000 : targetValue;
    const projection = computeProjection(observations, target);

    let chartPoints = [];
    let regressionLine = [];
    let chartStartMs = null;

    if (observations.length > 0) {
      chartStartMs = observations[0].observed_at.getTime();
      chartPoints = observations.map((obs) => ({
        x: (obs.observed_at.getTime() - chartStartMs) / 1000,
        y: obs.value,
      }));
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
      fountains,
      selectedFountain,
      chartPoints,
      regressionLine,
      chartStartMs,
      projection,
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
