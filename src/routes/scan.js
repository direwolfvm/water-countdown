const express = require("express");
const { query } = require("../db");

const router = express.Router();

router.get("/", async (req, res, next) => {
  try {
    const fountainId = req.query.fountain_id || "";
    let lastValue = null;

    if (fountainId) {
      // Get the most recent observation for this fountain
      const result = await query(
        "SELECT value FROM observations WHERE fountain_id = $1 ORDER BY observed_at DESC LIMIT 1",
        [fountainId]
      );
      if (result.rows.length > 0) {
        lastValue = Number(result.rows[0].value);
      }
    }

    res.render("layout", {
      title: "Scan Counter",
      body: "scan",
      fountainId,
      lastValue,
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
