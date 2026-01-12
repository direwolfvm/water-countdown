const express = require("express");
const { query } = require("../db");

const router = express.Router();

router.get("/", async (req, res, next) => {
  try {
    const { rows } = await query(
      "SELECT id, observed_at, value FROM observations ORDER BY observed_at ASC"
    );

    res.render("layout", {
      title: "Manage Observations",
      body: "observations",
      observations: rows,
      error: null,
    });
  } catch (err) {
    next(err);
  }
});

router.post("/", async (req, res, next) => {
  try {
    const valueRaw = req.body.value;
    const value = Number(valueRaw);

    if (!valueRaw || Number.isNaN(value)) {
      const { rows } = await query(
        "SELECT id, observed_at, value FROM observations ORDER BY observed_at ASC"
      );
      return res.status(400).render("layout", {
        title: "Manage Observations",
        body: "observations",
        observations: rows,
        error: "Please enter a valid numeric value.",
      });
    }

    await query(
      "INSERT INTO observations (observed_at, value) VALUES (NOW(), $1)",
      [value]
    );

    return res.redirect("/observations");
  } catch (err) {
    return next(err);
  }
});

module.exports = router;
