'use strict';
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const { WebSocketServer, WebSocket } = require('ws');

// A single-instance relay for private games. The elected player runs game rules.
const {MiniGame,TYPES}=require('./mini-engine.cjs');
const sessions=new Map();
const publicRoot=path.join(__dirname,'public');
const docs = new Map();
const TTL = 24 * 60 * 60 * 1000;
const MAX_DOCS = 2000;
const server = http.createServer((req, res) => {
  const pathname = new URL(req.url, 'http://localhost').pathname;
  if (pathname === '/healthz') {
    res.writeHead(200, { 'Content-Type': 'text/plain' }); return res.end('ok');
  }
  let file;try{const relative=decodeURIComponent(pathname==='/'?'/index.html':pathname);if(relative.split('/').some(p=>p.startsWith('.')))throw Error();file=path.resolve(publicRoot,'.'+relative);if(!file.startsWith(publicRoot+path.sep))throw Error()}catch{res.writeHead(404);return res.end('Not found')}
  fs.readFile(file,(error,data)=>{if(error){res.writeHead(404);return res.end('Not found')}const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.mp3':'audio/mpeg','.svg':'image/svg+xml','.json':'application/json'};res.writeHead(200,{'Content-Type':mime[path.extname(file)]||'application/octet-stream','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(data)});
});
const wss = new WebSocketServer({ server, maxPayload: 512 * 1024, perMessageDeflate: false });
function send(ws, data) {
  if (ws.readyState !== WebSocket.OPEN) return;
  if (ws.bufferedAmount > 2 * 1024 * 1024) return ws.close(1013, 'Slow connection');
  ws.send(JSON.stringify(data));
}
function validObject(data) {
  if (!data || typeof data !== 'object' || Array.isArray(data)) return false;
  return !JSON.stringify(data).match(/"(?:__proto__|constructor|prototype)"\s*:/);
}
wss.on('connection', ws => {
  ws.paths = new Set(); ws.alive = true; ws.windowAt = Date.now(); ws.count = 0;
  ws.on('error', () => {});
  ws.on('pong', () => { ws.alive = true; });
  ws.on('message', raw => {
    try {
      if (Date.now() - ws.windowAt > 1000) { ws.windowAt = Date.now(); ws.count = 0; }
      if (++ws.count > 150) return ws.close(1008, 'Too many messages');
      const m = JSON.parse(raw.toString());
      if(m?.t?.startsWith('mini:')){miniMessage(ws,m);return}
      if (!m || typeof m.p !== 'string' || !/^(games|cfg)\/[A-Z0-9]{4}$/.test(m.p)) return;
      if (m.t === 'sub') {
        if (ws.paths.size >= 16 && !ws.paths.has(m.p)) return;
        ws.paths.add(m.p); const row = docs.get(m.p);
        send(ws, { p: m.p, d: row?.data || null }); return;
      }
      if (!['set', 'upd'].includes(m.t) || !ws.paths.has(m.p) || !validObject(m.d)) return;
      const old = docs.get(m.p);
      // A new room cannot overwrite a room already using the same code.
      if (m.t === 'set' && m.p.startsWith('games/') && old) return;
      if (!old && m.t === 'upd') return;
      if (!old && docs.size >= MAX_DOCS) return;
      const data = m.t === 'upd' ? { ...old.data, ...m.d } : m.d;
      if (Buffer.byteLength(JSON.stringify(data)) > 512 * 1024) return;
      docs.set(m.p, { data, updated: Date.now() });
      for (const client of wss.clients) if (client.paths.has(m.p)) send(client, { p: m.p, d: data });
    } catch { /* Ignore malformed messages without stopping other rooms. */ }
  });
});
function miniMessage(ws,m){
 if(!/^[A-Z0-9]{4}$/.test(m.room||'')||typeof m.uid!=='string'||typeof m.id!=='string')return;
 const doc=docs.get('games/'+m.room)?.data;if(!doc||!Array.isArray(doc.seats)||!doc.mini||doc.mini.id!==m.id)return;
 const seat=doc.seats.findIndex(s=>s.uid===m.uid&&!s.kicked);if(seat<0)return;
 const key=m.room+'/'+m.id;let row=sessions.get(key);
 if(m.t==='mini:create'&&!row){if(doc.host!==m.uid||!TYPES[doc.mini.type])return;const seats=doc.mini.participants.map(i=>({id:i,uid:doc.seats[i]?.uid,name:doc.seats[i]?.n,color:doc['P'+i]?.c,face:doc['P'+i]?.face})).filter(s=>s.uid);if(seats.length<2||seats.length>6)return;row={game:new MiniGame(doc.mini,seats),created:Date.now(),room:m.room};sessions.set(key,row)}
 if(!row)return;ws.miniKey=key;ws.miniUid=m.uid;
 if(m.t==='mini:ready')row.game.setReady(m.uid);
 if(m.t==='mini:input')row.game.input(m.uid,m.input||{});
 if(m.t==='mini:forfeit'&&doc.host===m.uid){const p=row.game.players.find(p=>p.uid===m.target);if(p&&doc.seats[p.id]?.kicked){p.inv=0;row.game.damage(p,99,'forfeit');row.game.setReady(p.uid)}}
 if(m.t!=='mini:input')send(ws,{t:'mini:state',room:m.room,state:row.game.snapshot()});
}
let broadcastTick=0;const simulation=setInterval(()=>{
 for(const [key,row] of sessions){const doc=docs.get('games/'+row.room)?.data;if(!doc?.mini||doc.mini.id!==row.game.id){if(Date.now()-row.created>120000)sessions.delete(key);continue}
 for(const p of row.game.players)if(doc.seats[p.id]?.kicked){if(!p.dead){p.inv=0;row.game.damage(p,99,'forfeit')}row.game.setReady(p.uid)}
 row.game.update(1/30);if(broadcastTick%3===0){const state=row.game.snapshot();for(const client of wss.clients)if(client.miniKey===key)send(client,{t:'mini:state',room:row.room,state})}
 }broadcastTick++;
},1000/30);
const heartbeat = setInterval(() => {
  for (const ws of wss.clients) {
    if (!ws.alive) { ws.terminate(); continue; }
    ws.alive = false; ws.ping();
  }
  for (const [key, row] of docs) {
    if (Date.now() - row.updated > TTL && ![...wss.clients].some(ws => ws.paths.has(key))) docs.delete(key);
  }
}, 30000);
const cliPortIndex=process.argv.indexOf('--port');
const port = Number(process.env.PORT || (cliPortIndex>=0?process.argv[cliPortIndex+1]:null) || 3000);
server.listen(port, '0.0.0.0', () => console.log(`Monopoli listening on ${server.address().port}`));
function shutdown() {
  clearInterval(heartbeat);clearInterval(simulation);
  for (const ws of wss.clients) ws.close(1001, 'Server restarting');
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(0), 5000).unref();
}
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
