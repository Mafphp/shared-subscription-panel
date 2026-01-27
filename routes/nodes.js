const router = require("express").Router();
const {
  load, save, isValidLink, today,
  normalizeName, uniqueName, applyNameToLink
} = require("../services/store");

const ADMIN_TOKEN = process.env.ADMIN_TOKEN;

router.get("/nodes", (req, res) => {
  if (req.query.token !== ADMIN_TOKEN) return res.sendStatus(403);
  res.json(load());
});

router.post("/nodes", (req, res) => {
  if (req.query.token !== ADMIN_TOKEN) return res.sendStatus(403);

  let { link, name } = req.body;
  link = (link || "").trim();
  name = (name || "").trim();

  if (!isValidLink(link)) return res.status(400).json({ error: "Invalid link" });

  const data = load();

  if (!name) name = today();
  name = normalizeName(name);
  name = uniqueName(name, data);

  link = applyNameToLink(link, name);

  data.push({ id: Date.now(), name, link });
  save(data);

  res.json({ ok: true });
});

router.put("/nodes/:id", (req, res) => {
  if (req.query.token !== ADMIN_TOKEN) return res.sendStatus(403);

  let { link, name } = req.body;
  link = (link || "").trim();
  name = (name || "").trim();

  const data = load();
  const node = data.find(x => x.id == req.params.id);
  if (!node) return res.sendStatus(404);

  if (!name) name = today();
  name = normalizeName(name);
  name = uniqueName(name, data, node.id);

  if (!link) link = node.link;
  if (!isValidLink(link)) return res.status(400).json({ error: "Invalid link" });

  link = applyNameToLink(link, name);

  node.name = name;
  node.link = link;

  save(data);
  res.json({ ok: true });
});

router.delete("/nodes/:id", (req, res) => {
  if (req.query.token !== ADMIN_TOKEN) return res.sendStatus(403);
  save(load().filter(x => x.id != req.params.id));
  res.json({ ok: true });
});

module.exports = router;
