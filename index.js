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
  return (
    typeof link === "string" &&
    (link.startsWith("vmess://") || link.startsWith("vless://"))
  );
}

// ---------- SUB ----------
app.get("/", (req, res) => {
  const token = req.query.token;

  if (token !== SUB_TOKEN) {
    return res.status(403).send("Forbidden");
  }

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
  if (!isValidLink(link)) return res.status(400).json({ error: "Invalid vmess/vless link" });

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
  if (!isValidLink(link)) return res.status(400).json({ error: "Invalid vmess/vless link" });

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

// ---------- UI ----------
app.get("/admin", (req, res) => {
  res.send(`
<!DOCTYPE html>
<html>
<head>
<title>Subscription Panel</title>
<style>
body{
  font-family:system-ui;
  background:#0f172a;
  color:#e5e7eb;
  padding:20px;
}

.card{
  background:#020617;
  padding:20px;
  border-radius:10px;
  max-width:1100px;
  margin:auto;
  box-shadow:0 0 20px #000;
}

input,button{
  padding:10px;
  border-radius:6px;
  border:none;
}

input{width:100%}

button{
  background:#2563eb;
  color:white;
  cursor:pointer;
}

button:hover{opacity:.8}

.table-wrap{
  overflow-x:auto;
}

table{
  width:100%;
  margin-top:20px;
  border-collapse:collapse;
  table-layout:fixed;
}

th,td{
  border-bottom:1px solid #1e293b;
  padding:8px;
  vertical-align:top;
}

td[contenteditable]{
  background:#020617;
  outline:none;
  word-break:break-all;
  white-space:pre-wrap;
}

td{
  word-break:break-all;
  white-space:pre-wrap;
}

.error{
  color:#f87171;
  margin-top:10px;
}

/* Mobile */
@media(max-width:700px){
  th:nth-child(1), td:nth-child(1){
    width:90px;
    font-size:12px;
  }
  button{
    padding:6px;
    font-size:12px;
  }
}

.error{color:#f87171;margin-top:10px}
</style>
</head>
<body>

<div class="card">
<h2>Campaign Manager</h2>

<input id="token" placeholder="Admin Token"><br><br>

<div style="display:flex;gap:10px">
<input id="newLink" placeholder="link">
<button onclick="add()">Add</button>
</div>

<div id="msg" class="error"></div>

<div class="table-wrap">
  <table id="tbl">
    <tr><th>ID</th><th>Link</th><th></th></tr>
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
    tbl.innerHTML+=\`
    <tr>
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

app.listen(3000, () => console.log("Running on 3000"));
