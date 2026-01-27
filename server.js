require("dotenv").config();
const express = require("express");
const path = require("path");

const app = express();

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

app.use("/api", require("./routes/nodes"));
app.use("/api", require("./routes/bulk"));

app.get("/admin", (req, res) => {
  res.sendFile(path.join(__dirname, "public/admin.html"));
});

app.get("/admin.html", (req, res) => {
  res.redirect(301, "/admin");
});

app.get("/", (req, res) => {
  if (req.query.token !== process.env.SUB_TOKEN) return res.sendStatus(403);
  const { load } = require("./services/store");
  res.type("text").send(load().map(x => x.link).join("\n"));
});

app.listen(3000, () => console.log("Running on 3000"));