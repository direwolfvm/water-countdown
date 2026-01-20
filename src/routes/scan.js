const express = require("express");

const router = express.Router();

router.get("/", (req, res) => {
  const fountainId = req.query.fountain_id || "";
  res.render("layout", {
    title: "Scan Counter",
    body: "scan",
    fountainId,
  });
});

module.exports = router;
