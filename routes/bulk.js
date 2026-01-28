const router = require("express").Router();
const {
  load, save, isValidLink, today,
  normalizeName, uniqueName, applyNameToLink, updatePsInLink
} = require("../services/store");

const ADMIN_TOKEN = process.env.ADMIN_TOKEN;

router.post("/bulk", (req, res) => {
  if (req.query.token !== ADMIN_TOKEN) return res.sendStatus(403);

  const text = (req.body.text || "").trim();
  let baseName = (req.body.name || "").trim();
  let priority = parseInt(req.body.priority) || 0;
  if (!text) return res.json({ ok: true });

  const data = load();
    let maxId = data.length > 0 ? Math.max(...data.map(x => x.id || 0)) : 0;

  if (!baseName) baseName = today();
  baseName = normalizeName(baseName);

  const lines = text.split(/\r?\n/).filter(line => line.trim());
  if (lines.length === 0) return res.json({ ok: true });

  let added = 0;
  lines.forEach((line, index) => {
    let link = line.trim();
    if (!isValidLink(link)) return;

    let name = baseName;
    link = updatePsInLink(link, name);
    data.push({ id: ++maxId, created: Date.now(), name, link, priority });
    added++;
  });

  save(data);
  res.json({ ok: true, added });
});

module.exports = router;