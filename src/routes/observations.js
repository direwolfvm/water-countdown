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
      editMode: req.query.edit === "1",
    });
  } catch (err) {
    next(err);
  }
});

router.post("/bulk", async (req, res, next) => {
  try {
    const ids = Array.isArray(req.body.id) ? req.body.id : [req.body.id];
    const updates = [];
    const deletes = [];
    const deletePassword = req.body.delete_password;
    let deleteDenied = false;

    for (const idRaw of ids) {
      const id = Number(idRaw);
      if (Number.isNaN(id)) {
        continue;
      }

      const deleteFlag = req.body[`delete_${id}`];
      if (deleteFlag) {
        if (deletePassword !== "fountain") {
          deleteDenied = true;
          continue;
        }
        deletes.push(id);
        continue;
      }

      const valueRaw = req.body[`value_${id}`];
      const value = Number(valueRaw);
      if (valueRaw && !Number.isNaN(value)) {
        updates.push({ id, value });
      }
    }

    for (const id of deletes) {
      await query("DELETE FROM observations WHERE id = $1", [id]);
    }

    for (const { id, value } of updates) {
      await query("UPDATE observations SET value = $1 WHERE id = $2", [
        value,
        id,
      ]);
    }

    if (deleteDenied) {
      const { rows } = await query(
        "SELECT id, observed_at, value FROM observations ORDER BY observed_at ASC"
      );
      return res.status(403).render("layout", {
        title: "Manage Observations",
        body: "observations",
        observations: rows,
        error: "Delete password incorrect. No rows were deleted.",
        editMode: true,
      });
    }

    return res.redirect("/observations");
  } catch (err) {
    return next(err);
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
        editMode: false,
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
