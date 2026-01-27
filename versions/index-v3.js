// ---------- Load env ----------
require("dotenv").config();
const express = require("express");
const fs = require("fs");
const path = require("path");

const app = express();
const FILE = process.env.DATA_FILE || path.join(process.cwd(), "nodes.json");
const ADMIN_TOKEN = process.env.ADMIN_TOKEN;
const SUB_TOKEN = process.env.SUB_TOKEN;
const PORT = process.env.PORT || 3000;

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
  return (
    typeof link === "string" &&
    (link.startsWith("vmess://") || link.startsWith("vless://"))
  );
}

// ---------- SUB ----------
app.get("/", (req, res) => {
  const token = req.query.token;
  if (token !== SUB_TOKEN) return res.status(403).send("Forbidden");

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

  const link = (req.body.link || "").trim();
  if (!isValidLink(link))
    return res.status(400).json({ error: "Invalid vmess/vless link" });

  const data = load();
  if (data.find(x => x.link === link))
    return res.status(409).json({ error: "Duplicate link" });

  data.push({ id: Date.now(), link });
  save(data);
  res.json({ ok: true });
});

app.put("/api/nodes/:id", (req, res) => {
  if (req.query.token !== ADMIN_TOKEN) return res.sendStatus(403);

  const link = (req.body.link || "").trim();
  if (!isValidLink(link))
    return res.status(400).json({ error: "Invalid vmess/vless link" });

  const data = load();
  const node = data.find(x => x.id == req.params.id);
  if (!node) return res.sendStatus(404);

  if (data.find(x => x.link === link && x.id != node.id))
    return res.status(409).json({ error: "Duplicate link" });

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

// ---------- Bulk add ----------
app.post("/api/nodes/bulk", (req, res) => {
  if (req.query.token !== ADMIN_TOKEN) return res.sendStatus(403);

  const text = (req.body.text || "").trim();
  if (!text) return res.status(400).json({ error: "Empty input" });

  const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  const data = load();
  let added = 0, skipped = 0;

  for (const link of lines) {
    if (!isValidLink(link) || data.find(x => x.link === link)) {
      skipped++;
      continue;
    }
    data.push({ id: Date.now() + Math.floor(Math.random() * 1000), link });
    added++;
  }

  save(data);
  res.json({ added, skipped });
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
.card{background:#020617;padding:20px;border-radius:10px;max-width:1100px;margin:auto;box-shadow:0 0 20px #000}
input,button,textarea{padding:10px;border-radius:6px;border:none}
input,textarea{width:100%}
button{background:#2563eb;color:white;cursor:pointer}
button:hover{opacity:.8}
.table-wrap{overflow-x:auto}
table{width:100%;margin-top:20px;border-collapse:collapse;table-layout:fixed}
th,td{border-bottom:1px solid #1e293b;padding:8px;vertical-align:top}
td[contenteditable]{background:#020617;outline:none;word-break:break-all;white-space:pre-wrap}
td{word-break:break-all;white-space:pre-wrap}
.error{color:#f87171;margin-top:10px}
@media(max-width:700px){th:nth-child(1),td:nth-child(1){width:90px;font-size:12px}button{padding:6px;font-size:12px}}
</style>
</head>
<body>

<div class="card">
<h2>Subscription Manager</h2>

<input id="token" placeholder="Token"><br><br>

<h3>Add Single Node</h3>
<div style="display:flex;gap:10px">
<input id="newLink" placeholder="vmess:// or vless:// link">
<button onclick="add()">Add</button>
</div>

<h3>Add Bulk Nodes</h3>
<textarea id="bulkLinks" placeholder="Paste multiple vmess/vless links here" rows="6"></textarea>
<button onclick="addBulk()">Add Bulk</button>

<div id="msg" class="error"></div>

<div class="table-wrap">
<table id="tbl">
<tr><th style="width:90px">ID</th><th>Link</th><th style="width:80px"></th></tr>
</table>
</div>

<br>
<button onclick="loadNodes()">Load Nodes</button>
</div>

<script>
async function loadNodes(){
  msg.innerText="";
  const r = await fetch('/api/nodes?token='+token.value);
  if(!r.ok){msg.innerText="Auth failed";return;}
  const d = await r.json();
  tbl.innerHTML='<tr><th style="width:90px">ID</th><th>Link</th><th style="width:80px"></th></tr>';
  d.forEach(n=>{
    tbl.innerHTML+=\`<tr>
      <td>\${n.id}</td>
      <td contenteditable onblur="edit(\${n.id},this.innerText)">\${n.link}</td>
      <td><button onclick="del(\${n.id})">Delete</button></td>
    </tr>\`;
  });
}

async function add(){
  msg.innerText="";
  const r = await fetch('/api/nodes?token='+token.value,{
    method:'POST',
    headers:{'Content-Type':'application/json'},
    body:JSON.stringify({link:newLink.value})
  });
  const d = await r.json().catch(()=>({}));
  if(!r.ok){msg.innerText=d.error||"Error";return;}
  newLink.value="";
  loadNodes();
}

async function addBulk(){
  msg.innerText="";
  const text = bulkLinks.value;
  if(!text){ msg.innerText="Nothing to add"; return; }

  const r = await fetch('/api/nodes/bulk?token='+token.value, {
    method:'POST',
    headers:{'Content-Type':'application/json'},
    body: JSON.stringify({ text })
  });
  const d = await r.json().catch(()=>({}));
  if(!r.ok){msg.innerText=d.error||"Error"; return;}
  msg.innerText="Added: "+d.added+", Skipped: "+d.skipped;
  bulkLinks.value="";
  loadNodes();
}

async function edit(id,val){
  const r = await fetch('/api/nodes/'+id+'?token='+token.value,{
    method:'PUT',
    headers:{'Content-Type':'application/json'},
    body:JSON.stringify({link:val})
  });
  if(!r.ok) msg.innerText="Edit failed";
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

// ---------- Start Server ----------
app.listen(PORT, () => console.log("Running on port", PORT));
