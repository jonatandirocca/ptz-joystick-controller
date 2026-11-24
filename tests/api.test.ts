import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import { createApp } from '../apps/server/src/app.js';
import { Store } from '../apps/server/src/database.js';
import { MockViscaAdapter } from '../apps/server/src/visca/index.js';

const payload = {
  name: 'Plano general',
  host: '192.168.10.20',
  port: 52381,
  protocolVariant: 'generic-visca-ip',
  enabled: true,
  sortOrder: 1,
  panMax: 24,
  tiltMax: 20,
  zoomMax: 7,
};

const profile = {
  id: '11111111-1111-4111-8111-111111111111',
  name: 'Perfil principal',
  gamepadId: 'gamepad-1',
  axisPan: 0,
  axisTilt: 1,
  axisZoom: 2,
  buttonPrev: 3,
  buttonNext: 4,
  invertPan: false,
  invertTilt: false,
  invertZoom: false,
  deadzones: { panTilt: 0.1, zoom: 0.2 },
  curves: { panTilt: 'linear', zoom: 'power' },
  exponent: 1,
  sensitivity: 1,
  rampUpMs: 0,
  rampDownMs: 0,
};

describe('API REST', () => {
  const stores: Store[] = [];
  const directories: string[] = [];

  const api = () => {
    const store = new Store(':memory:');
    stores.push(store);
    return createApp(store);
  };

  afterEach(() => {
    stores.splice(0).forEach((store) => store.close());
    directories.splice(0).forEach((directory) => rmSync(directory, { recursive: true, force: true }));
  });

  it('rechaza DTO inválido e IPv4 inválida con mensajes en español', async () => {
    const response = await request(api())
      .post('/api/cameras')
      .send({ ...payload, host: '999.999.999.999', port: 0 });

    expect(response.status).toBe(400);
    expect(response.body.error).toContain('host');
    expect(response.body.error).toContain('puerto');
  });

  it('crea, lista, actualiza y elimina una cámara de punta a punta', async () => {
    const app = api();
    const created = await request(app).post('/api/cameras').send(payload).expect(201);

    expect(created.body.id).toMatch(/^[0-9a-f-]{36}$/);
    await request(app).get('/api/cameras').expect(200, [created.body]);

    const updated = await request(app)
      .put(`/api/cameras/${created.body.id}`)
      .send({ ...payload, name: 'Plano cerrado', sortOrder: 2, enabled: false })
      .expect(200);

    expect(updated.body).toMatchObject({ name: 'Plano cerrado', enabled: false });
    await request(app).delete(`/api/cameras/${created.body.id}`).expect(204);
    await request(app).get('/api/cameras').expect(200, []);
  });

  it('devuelve 404 para PUT y DELETE sobre una cámara inexistente', async () => {
    const app = api();
    const unknownId = '11111111-1111-4111-8111-111111111111';

    await request(app).put(`/api/cameras/${unknownId}`).send(payload).expect(404, { error: 'Cámara no encontrada' });
    await request(app).delete(`/api/cameras/${unknownId}`).expect(404, { error: 'Cámara no encontrada' });
  });

  it('rechaza campos extra en PUT y sortOrder negativo', async () => {
    const app = api();
    const created = await request(app).post('/api/cameras').send(payload).expect(201);

    const extra = await request(app)
      .put(`/api/cameras/${created.body.id}`)
      .send({ ...payload, extra: true })
      .expect(400);
    expect(extra.body.error).toContain('desconocida');

    const negativeSortOrder = await request(app)
      .post('/api/cameras')
      .send({ ...payload, sortOrder: -1 })
      .expect(400);
    expect(negativeSortOrder.body.error).toContain('orden');
  });

  it('guarda y lista perfiles', async () => {
    const app = api();
    await request(app).put('/api/profiles').send(profile).expect(200, profile);
    await request(app).get('/api/profiles').expect(200, [profile]);
  });

  it('informa la salud de la base SQLite, incluso cerrada', async () => {
    const healthyStore = new Store(':memory:');
    stores.push(healthyStore);
    await request(createApp(healthyStore)).get('/api/health').expect(200, { status: 'ok', database: 'connected' });

    const closedStore = new Store(':memory:');
    closedStore.close();
    await request(createApp(closedStore))
      .get('/api/health')
      .expect(503, { status: 'degraded', database: 'unavailable' });
  });

  it('migra dos aperturas consecutivas del mismo archivo', () => {
    const directory = mkdtempSync(join(tmpdir(), 'ptz-store-'));
    directories.push(directory);
    const databasePath = join(directory, 'nested', 'ptz.sqlite');
    const first = new Store(databasePath);
    first.close();
    const second = new Store(databasePath);
    second.close();
  });

  it('registra las tres operaciones del adaptador VISCA simulado', async () => {
    const adapter = new MockViscaAdapter();
    await adapter.panTilt('camera-1', 1, -1);
    await adapter.zoom('camera-1', 2);
    await adapter.stop('camera-1');

    expect(adapter.commands).toEqual([
      { method: 'panTilt', cameraId: 'camera-1', pan: 1, tilt: -1 },
      { method: 'zoom', cameraId: 'camera-1', zoom: 2 },
      { method: 'stop', cameraId: 'camera-1' },
    ]);
  });

  it('responde JSON para una ruta API inexistente y JSON malformado', async () => {
    const app = api();
    await request(app).get('/api/nope').expect(404, { error: 'Ruta API no encontrada' });

    const malformed = await request(app)
      .post('/api/cameras')
      .set('Content-Type', 'application/json')
      .send('{roto')
      .expect(400);
    expect(malformed.body).toEqual({ error: 'El cuerpo JSON es inválido' });
  });
});
