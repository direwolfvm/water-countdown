const express = require("express");
const { query } = require("../db");

const router = express.Router();

function selectFountain(fountains, requestedId) {
  if (!Array.isArray(fountains) || fountains.length === 0) {
    return null;
  }
  const id = Number(requestedId);
  return fountains.find((fountain) => fountain.id === id) || fountains[0];
}

router.get("/", async (req, res, next) => {
  try {
    const fountainsResult = await query(
      "SELECT id, name, target FROM fountains ORDER BY name ASC"
    );
    const fountains = fountainsResult.rows;
    const selectedFountain = selectFountain(fountains, req.query.fountain_id);

    const { rows } = await query(
      "SELECT id, observed_at, value FROM observations WHERE fountain_id = $1 ORDER BY observed_at ASC",
      [selectedFountain ? selectedFountain.id : null]
    );

    res.render("layout", {
      title: "Manage Observations",
      body: "observations",
      observations: rows,
      error: null,
      fountainError: null,
      fountains,
      selectedFountain,
      editMode: req.query.edit === "1",
    });
  } catch (err) {
    next(err);
  }
});

router.post("/fountains", async (req, res, next) => {
  try {
    const nameRaw = (req.body.name || "").trim();
    const targetRaw = req.body.target;
    const target = Number(targetRaw);

    if (!nameRaw || !targetRaw || Number.isNaN(target)) {
      const fountainsResult = await query(
        "SELECT id, name, target FROM fountains ORDER BY name ASC"
      );
      const fountains = fountainsResult.rows;
      const selectedFountain = selectFountain(fountains, req.body.fountain_id);
      const { rows } = await query(
        "SELECT id, observed_at, value FROM observations WHERE fountain_id = $1 ORDER BY observed_at ASC",
        [selectedFountain ? selectedFountain.id : null]
      );
      return res.status(400).render("layout", {
        title: "Manage Observations",
        body: "observations",
        observations: rows,
        error: null,
        fountainError: "Please enter a valid name and target.",
        fountains,
        selectedFountain,
        editMode: true,
      });
    }

    const insert = await query(
      "INSERT INTO fountains (name, target) VALUES ($1, $2) RETURNING id",
      [nameRaw, target]
    );

    return res.redirect(`/observations?fountain_id=${insert.rows[0].id}`);
  } catch (err) {
    if (err.code === "23505") {
      const fountainsResult = await query(
        "SELECT id, name, target FROM fountains ORDER BY name ASC"
      );
      const fountains = fountainsResult.rows;
      const selectedFountain = selectFountain(fountains, req.body.fountain_id);
      const { rows } = await query(
        "SELECT id, observed_at, value FROM observations WHERE fountain_id = $1 ORDER BY observed_at ASC",
        [selectedFountain ? selectedFountain.id : null]
      );
      return res.status(400).render("layout", {
        title: "Manage Observations",
        body: "observations",
        observations: rows,
        error: null,
        fountainError: "Fountain name already exists.",
        fountains,
        selectedFountain,
        editMode: true,
      });
    }
    return next(err);
  }
});

router.post("/fountains/:id/delete", async (req, res, next) => {
  try {
    const deletePassword = req.body.delete_password;
    const fountainId = Number(req.params.id);
    if (Number.isNaN(fountainId)) {
      return res.redirect("/observations");
    }

    if (deletePassword !== "fountain") {
      const fountainsResult = await query(
        "SELECT id, name, target FROM fountains ORDER BY name ASC"
      );
      const fountains = fountainsResult.rows;
      const selectedFountain = selectFountain(fountains, fountainId);
      const { rows } = await query(
        "SELECT id, observed_at, value FROM observations WHERE fountain_id = $1 ORDER BY observed_at ASC",
        [selectedFountain ? selectedFountain.id : null]
      );
      return res.status(403).render("layout", {
        title: "Manage Observations",
        body: "observations",
        observations: rows,
        error: null,
        fountainError: "Delete password incorrect. Fountain was not deleted.",
        fountains,
        selectedFountain,
        editMode: true,
      });
    }

    await query("DELETE FROM fountains WHERE id = $1", [fountainId]);
    return res.redirect("/observations");
  } catch (err) {
    return next(err);
  }
});

router.post("/bulk", async (req, res, next) => {
  try {
    const ids = Array.isArray(req.body.id) ? req.body.id : [req.body.id];
    const updates = [];
    const deletes = [];
    const deletePassword = req.body.delete_password;
    let deleteDenied = false;
    const fountainId = Number(req.body.fountain_id);

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
      const fountainsResult = await query(
        "SELECT id, name, target FROM fountains ORDER BY name ASC"
      );
      const fountains = fountainsResult.rows;
      const selectedFountain = selectFountain(fountains, fountainId);
      const { rows } = await query(
        "SELECT id, observed_at, value FROM observations WHERE fountain_id = $1 ORDER BY observed_at ASC",
        [selectedFountain ? selectedFountain.id : null]
      );
      return res.status(403).render("layout", {
        title: "Manage Observations",
        body: "observations",
        observations: rows,
        error: "Delete password incorrect. No rows were deleted.",
        fountainError: null,
        fountains,
        selectedFountain,
        editMode: true,
      });
    }

    return res.redirect(
      `/observations?fountain_id=${Number.isNaN(fountainId) ? "" : fountainId}`
    );
  } catch (err) {
    return next(err);
  }
});

router.post("/", async (req, res, next) => {
  try {
    const valueRaw = req.body.value;
    const value = Number(valueRaw);
    const fountainId = Number(req.body.fountain_id);

    if (!valueRaw || Number.isNaN(value) || Number.isNaN(fountainId)) {
      const fountainsResult = await query(
        "SELECT id, name, target FROM fountains ORDER BY name ASC"
      );
      const fountains = fountainsResult.rows;
      const selectedFountain = selectFountain(fountains, fountainId);
      const { rows } = await query(
        "SELECT id, observed_at, value FROM observations WHERE fountain_id = $1 ORDER BY observed_at ASC",
        [selectedFountain ? selectedFountain.id : null]
      );
      return res.status(400).render("layout", {
        title: "Manage Observations",
        body: "observations",
        observations: rows,
        error: "Please enter a valid numeric value.",
        fountainError: null,
        fountains,
        selectedFountain,
        editMode: false,
      });
    }

    await query(
      "INSERT INTO observations (observed_at, value, fountain_id) VALUES (NOW(), $1, $2)",
      [value, fountainId]
    );

    return res.redirect(`/observations?fountain_id=${fountainId}`);
  } catch (err) {
    return next(err);
  }
});

module.exports = router;
