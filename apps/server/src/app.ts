import express from 'express';
import { randomUUID } from 'node:crypto';
import { createCameraSchema, joystickProfileSchema, updateCameraSchema } from '@ptz/shared';
import { Store } from './database.js';

const validationMessage = (error: { issues: { message: string; path: PropertyKey[] }[] }) => error.issues.map((item) => `${item.path.join('.') || 'entrada'}: ${item.message}`).join('; ');
export function createApp(store: Store) {
  const app = express(); app.use(express.json({ limit: '32kb' }));
  app.get('/api/cameras', (_req, res) => res.json(store.listCameras()));
  app.post('/api/cameras', (req, res) => { const parsed = createCameraSchema.safeParse(req.body); if (!parsed.success) return res.status(400).json({ error: validationMessage(parsed.error) }); const camera = store.createCamera(randomUUID(), parsed.data); return res.status(201).json(camera); });
  app.put('/api/cameras/:id', (req, res) => { const parsed = updateCameraSchema.safeParse(req.body); if (!parsed.success) return res.status(400).json({ error: validationMessage(parsed.error) }); const camera = store.updateCamera(req.params.id, parsed.data); return camera ? res.json(camera) : res.status(404).json({ error: 'Cámara no encontrada' }); });
  app.delete('/api/cameras/:id', (req, res) => store.deleteCamera(req.params.id) ? res.status(204).end() : res.status(404).json({ error: 'Cámara no encontrada' }));
  app.get('/api/profiles', (_req, res) => res.json(store.listProfiles()));
  app.put('/api/profiles', (req, res) => { const parsed = joystickProfileSchema.safeParse(req.body); if (!parsed.success) return res.status(400).json({ error: validationMessage(parsed.error) }); return res.json(store.saveProfile(parsed.data)); });
  app.get('/api/health', (_req, res) => { const database = store.healthy() ? 'connected' : 'unavailable'; return res.status(database === 'connected' ? 200 : 503).json({ status: database === 'connected' ? 'ok' : 'degraded', database }); });
  return app;
}
