import express from 'express';
import fs from 'node:fs';
import path from 'node:path';
import { createHash, randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';

const app = express();
const directory = path.join(process.env.DATA_DIR || '/data', 'diagrams');
fs.mkdirSync(directory, { recursive: true });
const revision = text => createHash('sha256').update(text).digest('hex');
app.disable('x-powered-by');
app.use((req, res, next) => {
  res.set('X-Content-Type-Options', 'nosniff');
  res.set('X-Frame-Options', 'DENY');
  res.set('Referrer-Policy', 'same-origin');
  if (req.path.startsWith('/api/')) res.set('Cache-Control', 'no-store');
  if (req.method === 'PUT' && req.get('origin') && req.get('origin') !== `${req.protocol}://${req.get('host')}`) {
    return res.status(403).json({error: 'Cross-origin writes are not allowed.'});
  }
  next();
});
app.use(express.json({ limit: '1mb' }));
app.get('/health', (req, res) => res.json({ok: true}));
app.get('/api/diagrams', (req, res) => {
  res.json(fs.readdirSync(directory).filter(name => /^[a-zA-Z0-9][a-zA-Z0-9 _-]{0,79}\.mmd$/.test(name)).sort());
});
app.param('name', (req, res, next, name) => {
  if (!/^[a-zA-Z0-9][a-zA-Z0-9 _-]{0,79}\.mmd$/.test(name)) return res.status(400).json({error: 'Use a name of 1–80 letters, numbers, spaces, hyphens or underscores, followed by .mmd.'});
  req.diagramPath = path.join(directory, name);
  next();
});
app.get('/api/diagrams/:name', (req, res) => {
  try {
    const code = fs.readFileSync(req.diagramPath, 'utf8');
    res.json({code, revision: revision(code)});
  } catch (e) { if (e.code === 'ENOENT') return res.status(404).json({error:'Diagram not found.'}); throw e; }
});
app.put('/api/diagrams/:name', (req, res) => {
  if (typeof req.body?.code !== 'string') return res.status(400).json({error:'Diagram source is required.'});
  let previous = null;
  try { previous = revision(fs.readFileSync(req.diagramPath, 'utf8')); }
  catch (e) { if (e.code !== 'ENOENT') throw e; }
  if ((req.body.revision ?? null) !== previous) return res.status(409).json({error:'This filename already exists or was changed elsewhere. Reopen it, or save using another name. Export first to keep your edits.'});
  const temp = path.join(directory, `.${randomUUID()}.tmp`);
  try {
    fs.writeFileSync(temp, req.body.code, {mode:0o600});
    fs.renameSync(temp, req.diagramPath);
  } finally { if (fs.existsSync(temp)) fs.unlinkSync(temp); }
  res.json({revision:revision(req.body.code)});
});
const root = path.dirname(fileURLToPath(import.meta.url));
app.use(express.static(path.join(root, 'dist')));
app.use((err, req, res, next) => {
  console.error(err.message);
  res.status(err.status || 500).json({error:err.status === 413 ? 'Diagram is too large (maximum 1 MB).' : 'Request failed. Check the server logs.'});
});
app.listen(Number(process.env.PORT || 8080), '0.0.0.0', () => console.log('Diagram library ready'));
