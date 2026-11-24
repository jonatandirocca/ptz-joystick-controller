export interface ViscaAdapter {
  readonly variant: string;
  panTilt(cameraId: string, pan: number, tilt: number): Promise<void>;
  zoom(cameraId: string, zoom: number): Promise<void>;
  stop(cameraId: string): Promise<void>;
}
export type MockViscaCommand =
  | { method: 'panTilt'; cameraId: string; pan: number; tilt: number }
  | { method: 'zoom'; cameraId: string; zoom: number }
  | { method: 'stop'; cameraId: string };
export class MockViscaAdapter implements ViscaAdapter {
  readonly variant = 'mock';
  readonly commands: MockViscaCommand[] = [];
  async panTilt(cameraId: string, pan: number, tilt: number): Promise<void> {
    this.commands.push({ method: 'panTilt', cameraId, pan, tilt });
  }
  async zoom(cameraId: string, zoom: number): Promise<void> {
    this.commands.push({ method: 'zoom', cameraId, zoom });
  }
  async stop(cameraId: string): Promise<void> {
    this.commands.push({ method: 'stop', cameraId });
  }
  clear(): void {
    this.commands.length = 0;
  }
}
