const path = require("path");
const express = require("express");
const dashboardRouter = require("./routes/dashboard");
const observationsRouter = require("./routes/observations");
const { initDb } = require("./db");

const app = express();

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "..", "views"));

app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "..", "public")));

app.use("/", dashboardRouter);
app.use("/observations", observationsRouter);

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).send("Something went wrong.");
});

const port = process.env.PORT || 8080;

initDb()
  .then(() => {
    app.listen(port, () => {
      console.log(`Server listening on port ${port}`);
    });
  })
  .catch((err) => {
    console.error("Failed to initialize database", err);
    process.exit(1);
  });
