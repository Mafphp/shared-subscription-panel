const express = require("express");
const fs = require("fs");
const path = require("path");


const app = express();
const FILE = process.env.DATA_FILE || path.join(process.cwd(), "nodes.json");
const ADMIN_TOKEN = "changeme123";

app.use(express.json());

function load() {
  if (!fs.existsSync(FILE)) return [];
  return JSON.parse(fs.readFileSync(FILE));
}

function save(data) {
  fs.writeFileSync(FILE, JSON.stringify(data, null, 2));
}

// ---- SUB ----
app.get("/sub", (req, res) => {
  const nodes = load().map(x => x.link);
  res.set("Content-Type", "text/plain");
  res.send(nodes.join("\n"));
});

// ---- API ----
app.get("/api/nodes", (req, res) => {
  if (req.query.token !== ADMIN_TOKEN) return res.sendStatus(403);
  res.json(load());
});

app.post("/api/nodes", (req, res) => {
  if (req.query.token !== ADMIN_TOKEN) return res.sendStatus(403);
  const data = load();
  data.push({ id: Date.now(), link: req.body.link });
  save(data);
  res.json({ ok: true });
});

app.put("/api/nodes/:id", (req, res) => {
  if (req.query.token !== ADMIN_TOKEN) return res.sendStatus(403);
  const data = load();
  const node = data.find(x => x.id == req.params.id);
  if (!node) return res.sendStatus(404);
  node.link = req.body.link;
  save(data);
  res.json({ ok: true });
});

app.delete("/api/nodes/:id", (req, res) => {
  if (req.query.token !== ADMIN_TOKEN) return res.sendStatus(403);
  const data = load().filter(x => x.id != req.params.id);
  save(data);
  res.json({ ok: true });
});

// ---- UI ----
app.get("/admin", (req, res) => {
  res.send(`
<!DOCTYPE html>
<html>
<head>
<title>Sub Panel</title>
<style>
body{font-family:sans-serif;background:#111;color:#eee}
input,button{padding:6px}
table{border-collapse:collapse;width:100%}
td,th{border:1px solid #444;padding:6px}
</style>
</head>
<body>
<h2>Subscription Manager</h2>

<input id="token" placeholder="Admin Token"/>
<br><br>

<input id="newLink" style="width:80%" placeholder="vmess / vless link"/>
<button onclick="add()">Add</button>

<table id="tbl">
<tr><th>ID</th><th>Link</th><th>Action</th></tr>
</table>

<script>
async function loadNodes(){
  const t = token.value;
  const r = await fetch('/api/nodes?token='+t);
  const d = await r.json();
  tbl.innerHTML='<tr><th>ID</th><th>Link</th><th>Action</th></tr>';
  d.forEach(n=>{
    tbl.innerHTML+=\`
    <tr>
      <td>\${n.id}</td>
      <td contenteditable onblur="edit(\${n.id},this.innerText)">\${n.link}</td>
      <td><button onclick="del(\${n.id})">X</button></td>
    </tr>\`;
  });
}

async function add(){
  await fetch('/api/nodes?token='+token.value,{
    method:'POST',
    headers:{'Content-Type':'application/json'},
    body:JSON.stringify({link:newLink.value})
  });
  newLink.value='';
  loadNodes();
}

async function edit(id,val){
  await fetch('/api/nodes/'+id+'?token='+token.value,{
    method:'PUT',
    headers:{'Content-Type':'application/json'},
    body:JSON.stringify({link:val})
  });
}

async function del(id){
  await fetch('/api/nodes/'+id+'?token='+token.value,{method:'DELETE'});
  loadNodes();
}
</script>

<button onclick="loadNodes()">Load</button>
</body>
</html>
`);
});

app.listen(3000, () => console.log("Running 3000"));
