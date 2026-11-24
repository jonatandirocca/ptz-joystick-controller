import { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import type { Camera, CreateCameraDto } from '@ptz/shared';
import './styles.css';

const empty: CreateCameraDto = {
  name: '',
  host: '',
  port: 52381,
  protocolVariant: 'generic-visca-ip',
  enabled: true,
  sortOrder: 0,
  panMax: 24,
  tiltMax: 20,
  zoomMax: 7,
};

function App() {
  const [cameras, setCameras] = useState<Camera[]>([]);
  const [form, setForm] = useState<CreateCameraDto>(empty);
  const [editing, setEditing] = useState<string | null>(null);
  const [error, setError] = useState('');

  const load = () =>
    fetch('/api/cameras')
      .then((response) => response.json())
      .then(setCameras)
      .catch(() => setError('No se pudo conectar con la API.'));

  useEffect(() => {
    void load();
  }, []);

  const change = (key: keyof CreateCameraDto, value: string | boolean) => {
    const numericFields = ['port', 'sortOrder', 'panMax', 'tiltMax', 'zoomMax'];
    setForm((current) => ({ ...current, [key]: numericFields.includes(key) ? Number(value) : value }));
  };

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    const response = await fetch(editing ? `/api/cameras/${editing}` : '/api/cameras', {
      method: editing ? 'PUT' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });

    if (!response.ok) {
      const body = await response.json();
      setError(body.error || 'No se pudo guardar la cámara.');
      return;
    }

    setForm(empty);
    setEditing(null);
    void load();
  };

  const edit = (camera: Camera) => {
    const { id, ...data } = camera;
    setEditing(id);
    setForm(data);
    setError('');
  };

  const remove = async (id: string) => {
    if (!confirm('¿Eliminar esta cámara?')) {
      return;
    }

    await fetch(`/api/cameras/${id}`, { method: 'DELETE' });
    void load();
  };

  return (
    <main>
      <h1>PTZ Controller</h1>
      <p>Administración de cámaras</p>
      <section>
        <h2>{editing ? 'Editar cámara' : 'Nueva cámara'}</h2>
        <form onSubmit={save}>
          <label>
            Nombre
            <input
              required
              maxLength={100}
              value={form.name}
              onChange={(event) => change('name', event.target.value)}
            />
          </label>
          <label>
            Host o IP
            <input required value={form.host} onChange={(event) => change('host', event.target.value)} />
          </label>
          <label>
            Puerto
            <input
              required
              type="number"
              min="1"
              max="65535"
              value={form.port}
              onChange={(event) => change('port', event.target.value)}
            />
          </label>
          <label>
            Orden
            <input
              required
              type="number"
              min="0"
              value={form.sortOrder}
              onChange={(event) => change('sortOrder', event.target.value)}
            />
          </label>
          <label>
            Pan máximo
            <input
              required
              type="number"
              min="1"
              value={form.panMax}
              onChange={(event) => change('panMax', event.target.value)}
            />
          </label>
          <label>
            Tilt máximo
            <input
              required
              type="number"
              min="1"
              value={form.tiltMax}
              onChange={(event) => change('tiltMax', event.target.value)}
            />
          </label>
          <label>
            Zoom máximo
            <input
              required
              type="number"
              min="1"
              value={form.zoomMax}
              onChange={(event) => change('zoomMax', event.target.value)}
            />
          </label>
          <label className="check">
            <input
              type="checkbox"
              checked={form.enabled}
              onChange={(event) => change('enabled', event.target.checked)}
            />
            Habilitada
          </label>
          <div>
            <button type="submit">{editing ? 'Guardar cambios' : 'Crear cámara'}</button>
            {editing && (
              <button
                type="button"
                onClick={() => {
                  setEditing(null);
                  setForm(empty);
                }}
              >
                Cancelar
              </button>
            )}
          </div>
        </form>
        {error && <p role="alert">{error}</p>}
      </section>
      <section>
        <h2>Cámaras</h2>
        {cameras.length === 0 ? (
          <p>No hay cámaras configuradas.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Host</th>
                <th>Estado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {cameras.map((camera) => (
                <tr key={camera.id}>
                  <td>{camera.name}</td>
                  <td>
                    {camera.host}:{camera.port}
                  </td>
                  <td>{camera.enabled ? 'Habilitada' : 'Deshabilitada'}</td>
                  <td>
                    <button onClick={() => edit(camera)}>Editar</button>
                    <button onClick={() => remove(camera.id)}>Eliminar</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </main>
  );
}

createRoot(document.getElementById('root')!).render(<App />);
