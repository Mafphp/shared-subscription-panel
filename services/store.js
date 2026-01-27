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

function updatePsInLink(link, name) {
  if (!isValidLink(link)) return applyNameToLink(link, name);
  const protocol = link.startsWith('vmess://') ? 'vmess://' : 'vless://';
  let base64Part = link.substring(protocol.length);
  const hashIndex = base64Part.indexOf('#');
  if (hashIndex > -1) {
    base64Part = base64Part.substring(0, hashIndex);
  }
  try {
    const decoded = Buffer.from(base64Part, 'base64').toString('utf8');
    const config = JSON.parse(decoded);
    if (config && typeof config === 'object') {
      config.ps = name;
      const updated = JSON.stringify(config);
      const newBase64 = Buffer.from(updated).toString('base64');
      return protocol + newBase64;
    } else {
      throw new Error('Invalid config');
    }
  } catch (err) {
    console.error('Failed to update ps:', err);
    return applyNameToLink(link, name);
  }
}

module.exports = {
  load,
  save,
  isValidLink,
  today,
  normalizeName,
  uniqueName,
  applyNameToLink,
  updatePsInLink
};