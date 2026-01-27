const router = require("express").Router();
const {
  load, save, isValidLink, today,
  normalizeName, uniqueName, applyNameToLink
} = require("../services/store");

const ADMIN_TOKEN = process.env.ADMIN_TOKEN;

router.post("/bulk", (req, res) => {
  if (req.query.token !== ADMIN_TOKEN) return res.sendStatus(403);

  const text = (req.body.text || "").trim();
  let baseName = (req.body.name || "").trim();
  if (!text) return res.json({ ok: true });

  const data = load();

  if (!baseName) baseName = today();
  baseName = normalizeName(baseName);

  text.split(/\r?\n/).forEach(line => {
    let link = line.trim();
    if (!isValidLink(link)) return;

    let name = uniqueName(baseName, data);
    link = applyNameToLink(link, name);
    data.push({ id: Date.now() + Math.random(), name, link });
  });

  save(data);
  res.json({ ok: true });
});

module.exports = router;
