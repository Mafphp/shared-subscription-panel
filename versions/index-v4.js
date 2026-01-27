require("dotenv").config();
const express = require("express");
const fs = require("fs");
const path = require("path");

const app = express();
const FILE = process.env.DATA_FILE || path.join(process.cwd(), "nodes.json");
const ADMIN_TOKEN = process.env.ADMIN_TOKEN;
const SUB_TOKEN = process.env.SUB_TOKEN;

app.use(express.json());

// ---------- Utils ----------
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

// ---------- SUB ----------
app.get("/", (req, res) => {
  if (req.query.token !== SUB_TOKEN) return res.status(403).send("Forbidden");
  const nodes = load().map(x => x.link);
  res.set("Content-Type", "text/plain");
  res.send(nodes.join("\n"));
});

// ---------- API ----------
app.get("/api/nodes", (req, res) => {
  if (req.query.token !== ADMIN_TOKEN) return res.sendStatus(403);
  res.json(load());
});

app.post("/api/nodes", (req, res) => {
  if (req.query.token !== ADMIN_TOKEN) return res.sendStatus(403);

  let { link, name } = req.body;
  link = (link || "").trim();
  name = (name || "").trim();

  if (!isValidLink(link))
    return res.status(400).json({ error: "Invalid vmess/vless link" });

  const data = load();

  if (!name) name = today();
  name = normalizeName(name);
  name = uniqueName(name, data);

  link = applyNameToLink(link, name);

  data.push({ id: Date.now(), name, link });
  save(data);

  res.json({ ok: true });
});

// ---- BULK ----
app.post("/api/bulk", (req, res) => {
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

app.put("/api/nodes/:id", (req, res) => {
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
  if (!isValidLink(link))
    return res.status(400).json({ error: "Invalid vmess/vless link" });

  link = applyNameToLink(link, name);

  node.name = name;
  node.link = link;

  save(data);
  res.json({ ok: true });
});

app.delete("/api/nodes/:id", (req, res) => {
  if (req.query.token !== ADMIN_TOKEN) return res.sendStatus(403);
  const data = load().filter(x => x.id != req.params.id);
  save(data);
  res.json({ ok: true });
});

// ---------- UI ----------
app.get("/admin", (req, res) => {
  res.send(`
<!DOCTYPE html>
<html>
<head>
<title>Subscription Panel</title>
<style>
body{font-family:system-ui;background:#0f172a;color:#e5e7eb;padding:20px}
.card{background:#020617;padding:20px;border-radius:10px;max-width:1100px;margin:auto}
input,textarea,button{padding:10px;border-radius:6px;border:none;width:100%}
button{background:#2563eb;color:white;cursor:pointer}
table{width:100%;margin-top:20px;border-collapse:collapse}
th,td{border-bottom:1px solid #1e293b;padding:8px}
td[contenteditable]{background:#020617;outline:none;word-break:break-all}
.error{color:#f87171;margin-top:10px}
</style>
</head>
<body>

<div class="card">
<h2>Campaign Manager</h2>

<input id="token" placeholder="Admin Token"><br><br>
<hr/>

<input id="newName" placeholder="name (optional)">

<hr/>

<input id="newLink" placeholder="single link">
<button onclick="add()">Add</button>

<br><br>
<hr/>

<textarea id="bulk" rows="6" placeholder="Bulk nodes..."></textarea>
<button onclick="bulkAdd()">Bulk Add</button>

<div id="msg" class="error"></div>

<hr/>
<table id="tbl"></table>

<br>
<button onclick="loadNodes()">Load Nodes</button>
</div>

<script>
async function loadNodes(){
  msg.innerText="";
  const r = await fetch('/api/nodes?token='+token.value);
  if(!r.ok){msg.innerText="Auth failed";return;}
  const d = await r.json();
  tbl.innerHTML='<tr><th>ID</th><th>Name</th><th>Link</th><th></th></tr>';
  d.forEach(n=>{
    tbl.innerHTML+=\`
    <tr>
      <td>\${n.id}</td>
      <td contenteditable onblur="edit(\${n.id},this.innerText,null)">\${n.name}</td>
      <td contenteditable onblur="edit(\${n.id},null,this.innerText)">\${n.link}</td>
      <td><button onclick="del(\${n.id})">Delete</button></td>
    </tr>\`;
  });
}

async function add(){
  const r = await fetch('/api/nodes?token='+token.value,{
    method:'POST',
    headers:{'Content-Type':'application/json'},
    body:JSON.stringify({name:newName.value,link:newLink.value})
  });
  if(r.ok){newName.value="";newLink.value="";loadNodes();}
}

async function bulkAdd(){
  const r = await fetch('/api/bulk?token='+token.value,{
    method:'POST',
    headers:{'Content-Type':'application/json'},
    body:JSON.stringify({name:newName.value,text:bulk.value})
  });
  if(r.ok){bulk.value="";loadNodes();}
}

async function edit(id,name,link){
  const p={};
  if(name!==null)p.name=name;
  if(link!==null)p.link=link;

  await fetch('/api/nodes/'+id+'?token='+token.value,{
    method:'PUT',
    headers:{'Content-Type':'application/json'},
    body:JSON.stringify(p)
  });
}

async function del(id){
  await fetch('/api/nodes/'+id+'?token='+token.value,{method:'DELETE'});
  loadNodes();
}
</script>

</body>
</html>
`);
});

app.listen(3000, () => console.log("Running on 3000"));
