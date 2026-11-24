import Database from 'better-sqlite3';
import type { Camera, CreateCameraDto, JoystickProfile, UpdateCameraDto } from '@ptz/shared';

export class Store {
  readonly db: Database.Database;
  constructor(path: string) {
    this.db = new Database(path);
    this.db.pragma('journal_mode = WAL');
    this.migrate();
  }
  private migrate(): void {
    this.db.exec(`CREATE TABLE IF NOT EXISTS cameras (id TEXT PRIMARY KEY, name TEXT NOT NULL, host TEXT NOT NULL, port INTEGER NOT NULL, protocol_variant TEXT NOT NULL, enabled INTEGER NOT NULL, sort_order INTEGER NOT NULL, pan_max INTEGER NOT NULL, tilt_max INTEGER NOT NULL, zoom_max INTEGER NOT NULL);
      CREATE TABLE IF NOT EXISTS joystick_profiles (id TEXT PRIMARY KEY, payload TEXT NOT NULL);`);
  }
  private camera(row: Record<string, unknown>): Camera { return { id: row.id as string, name: row.name as string, host: row.host as string, port: row.port as number, protocolVariant: row.protocol_variant as Camera['protocolVariant'], enabled: Boolean(row.enabled), sortOrder: row.sort_order as number, panMax: row.pan_max as number, tiltMax: row.tilt_max as number, zoomMax: row.zoom_max as number }; }
  listCameras(): Camera[] { return (this.db.prepare('SELECT * FROM cameras ORDER BY sort_order, name').all() as Record<string, unknown>[]).map((row) => this.camera(row)); }
  getCamera(id: string): Camera | undefined { const row = this.db.prepare('SELECT * FROM cameras WHERE id = ?').get(id) as Record<string, unknown> | undefined; return row && this.camera(row); }
  createCamera(id: string, data: CreateCameraDto): Camera { this.db.prepare('INSERT INTO cameras VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)').run(id, data.name, data.host, data.port, data.protocolVariant, Number(data.enabled), data.sortOrder, data.panMax, data.tiltMax, data.zoomMax); return this.getCamera(id)!; }
  updateCamera(id: string, data: UpdateCameraDto): Camera | undefined { const changed = this.db.prepare('UPDATE cameras SET name=?,host=?,port=?,protocol_variant=?,enabled=?,sort_order=?,pan_max=?,tilt_max=?,zoom_max=? WHERE id=?').run(data.name, data.host, data.port, data.protocolVariant, Number(data.enabled), data.sortOrder, data.panMax, data.tiltMax, data.zoomMax, id); return changed.changes ? this.getCamera(id) : undefined; }
  deleteCamera(id: string): boolean { return this.db.prepare('DELETE FROM cameras WHERE id = ?').run(id).changes > 0; }
  listProfiles(): JoystickProfile[] { return (this.db.prepare('SELECT payload FROM joystick_profiles').all() as { payload: string }[]).map((row) => JSON.parse(row.payload) as JoystickProfile); }
  saveProfile(profile: JoystickProfile): JoystickProfile { this.db.prepare('INSERT INTO joystick_profiles (id,payload) VALUES (?,?) ON CONFLICT(id) DO UPDATE SET payload=excluded.payload').run(profile.id, JSON.stringify(profile)); return profile; }
  healthy(): boolean { try { return this.db.prepare('SELECT 1').get() !== undefined; } catch { return false; } }
  close(): void { this.db.close(); }
}
