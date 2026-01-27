const fs = require("fs");
const path = require("path");

const FILE = process.env.DATA_FILE || path.join(process.cwd(), "nodes.json");

function load() {
  if (!fs.existsSync(FILE)) return [];
  try {
    return JSON.parse(fs.readFileSync(FILE, "utf8"));
  } catch {
    return [];
  }
}

function save(data) {
  fs.writeFileSync(FILE, JSON.stringify(data, null, 2));
}

function isValidLink(link) {
  return typeof link === "string" &&
    (link.startsWith("vmess://") || link.startsWith("vless://"));
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

function normalizeName(name) {
  return name.trim().replace(/\s+/g, "-");
}

function uniqueName(base, data, ignoreId = null) {
  let name = base;
  let i = 1;
  while (data.find(x => x.name === name && x.id != ignoreId)) {
    name = `${base}-${i++}`;
  }
  return name;
}

function applyNameToLink(link, name) {
  const i = link.indexOf("#");
  const clean = i === -1 ? link : link.slice(0, i);
  return clean + "#" + encodeURIComponent(name);
}

module.exports = {
  load,
  save,
  isValidLink,
  today,
  normalizeName,
  uniqueName,
  applyNameToLink
};
