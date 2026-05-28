const express = require("express");
const { query } = require("../db");
const { REGRESSION_TYPES, computeProjection } = require("../regression");

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
    const selectedRegressionType = REGRESSION_TYPES.some(
      (option) => option.id === req.query.regression_type
    )
      ? req.query.regression_type
      : "linear";
    const projection = computeProjection(
      observations,
      target,
      selectedRegressionType
    );

    let chartPoints = [];
    let regressionLine = [];
    let chartStartMs = null;

    if (observations.length > 0) {
      chartStartMs = observations[0].observed_at.getTime();
      chartPoints = observations.map((obs) => ({
        x: (obs.observed_at.getTime() - chartStartMs) / (1000 * 60 * 60 * 24),
        y: obs.value,
      }));
    }

    if (projection.hasRegression && Array.isArray(projection.regressionLine)) {
      regressionLine = projection.regressionLine;
    }

    res.render("layout", {
      title: "Water Fountain Tracker",
      body: "dashboard",
      fountains,
      regressionTypes: REGRESSION_TYPES,
      selectedRegressionType,
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
