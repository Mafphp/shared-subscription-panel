const router = require("express").Router();
const {
  load, save, isValidLink, today,
  normalizeName, uniqueName, applyNameToLink, updatePsInLink
} = require("../services/store");

const ADMIN_TOKEN = process.env.ADMIN_TOKEN;

router.get("/nodes", (req, res) => {
  if (req.query.token !== ADMIN_TOKEN) return res.sendStatus(403);
  res.json(load());
});

router.post("/nodes", (req, res) => {
  if (req.query.token !== ADMIN_TOKEN) return res.sendStatus(403);

  let { link, name, priority } = req.body;
  link = (link || "").trim();
  name = (name || "").trim();
  priority = parseInt(priority) || 0;

  if (!isValidLink(link)) return res.status(400).json({ error: "Invalid link" });

  const data = load();

  if (!name) name = today();
  name = normalizeName(name);
  name = uniqueName(name, data);

  link = updatePsInLink(link, name);

  const maxId = data.length > 0 ? Math.max(...data.map(x => x.id || 0)) : 0;
data.push({ id: maxId + 1, created: Date.now(), name, link, priority });
  save(data);

  res.json({ ok: true });
});

router.put("/nodes/:id", (req, res) => {
  if (req.query.token !== ADMIN_TOKEN) return res.sendStatus(403);

  let { link, name, priority } = req.body;

  const data = load();
  const node = data.find(x => x.id == req.params.id);
  if (!node) return res.sendStatus(404);

  let updateName = name ? normalizeName((name || "").trim()) : node.name;
  updateName = uniqueName(updateName, data, node.id);

  let updateLink = link ? (link || "").trim() : node.link;
  if (updateLink && !isValidLink(updateLink)) {
    return res.status(400).json({ error: "Invalid link" });
  }
  updateLink = updatePsInLink(updateLink, updateName);

  let updatePriority = priority !== undefined ? parseInt(priority) : (node.priority || 0);
  node.name = updateName;
  node.link = updateLink;
  node.priority = updatePriority;

  save(data);
  res.json({ ok: true });
});

router.delete("/nodes/:id", (req, res) => {
  if (req.query.token !== ADMIN_TOKEN) return res.sendStatus(403);
  save(load().filter(x => x.id != req.params.id));
  res.json({ ok: true });
});

router.post("/nodes/reorder", (req, res) => {
  if (req.query.token !== ADMIN_TOKEN) return res.sendStatus(403);
  const { data } = req.body;
  if (Array.isArray(data)) {
    save(data);
    res.json({ ok: true });
  } else {
    res.status(400).json({ error: "Invalid data" });
  }
});

module.exports = router;