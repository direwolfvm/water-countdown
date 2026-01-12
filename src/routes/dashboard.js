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

    const labels = observations.map((obs) =>
      obs.observed_at.toISOString().slice(0, 19).replace("T", " ")
    );
    const values = observations.map((obs) => obs.value);

    const projection = computeProjection(observations);

    res.render("layout", {
      title: "Water Fountain Tracker",
      body: "dashboard",
      labels,
      values,
      projection,
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
