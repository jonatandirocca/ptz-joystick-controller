import path from 'node:path'; import { fileURLToPath } from 'node:url'; import express from 'express';
import { createApp } from './app.js'; import { Store } from './database.js';
const port = Number(process.env.PORT ?? 3000); const databasePath = process.env.DATABASE_PATH ?? './data/ptz.sqlite'; const store = new Store(databasePath); const app = createApp(store);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../web/dist');
app.use(express.static(root)); app.get('/{*splat}', (_req, res) => res.sendFile(path.join(root, 'index.html')));
const server = app.listen(port, () => console.log(`PTZ Controller listening on ${port}`));
const shutdown = () => server.close(() => { store.close(); process.exit(0); }); process.on('SIGTERM', shutdown); process.on('SIGINT', shutdown);
