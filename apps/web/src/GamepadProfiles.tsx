import { useEffect, useRef, useState } from 'react';
import type { JoystickProfile } from '@ptz/shared';
import { isGamepadContextAvailable, learnControl, type GamepadState } from './useGamepad.js';

type MappingField = 'axisPan' | 'axisTilt' | 'axisZoom' | 'buttonPrev' | 'buttonNext';

const mappingLabels: Record<MappingField, string> = {
  axisPan: 'Pan',
  axisTilt: 'Tilt',
  axisZoom: 'Zoom',
  buttonPrev: 'Cámara anterior',
  buttonNext: 'Cámara siguiente',
};

const createProfile = (gamepad: GamepadState): JoystickProfile => ({
  id: crypto.randomUUID(),
  name: `Perfil ${gamepad.id}`,
  gamepadId: gamepad.id,
  axisPan: 0,
  axisTilt: 1,
  axisZoom: 3,
  buttonPrev: 4,
  buttonNext: 5,
  invertPan: false,
  invertTilt: false,
  invertZoom: false,
  deadzones: { panTilt: 0, zoom: 0 },
  curves: { panTilt: 'linear', zoom: 'linear' },
  exponent: 1,
  sensitivity: 1,
  rampUpMs: 0,
  rampDownMs: 0,
});

export function GamepadStatus({ gamepads }: { gamepads: GamepadState[] }) {
  if (!isGamepadContextAvailable()) {
    return <p role="alert">Gamepad API requiere HTTPS o localhost. Abrí la aplicación en un contexto seguro.</p>;
  }

  if (gamepads.length === 0) {
    return <p>No hay joystick detectado. Conectalo y presioná un botón si el navegador lo requiere.</p>;
  }

  return (
    <div className="gamepad-list">
      {gamepads.map((gamepad) => (
        <article className="gamepad" key={gamepad.index}>
          <h3>Joystick {gamepad.index}</h3>
          <p>
            <strong>ID:</strong> {gamepad.id}
            <br />
            <strong>Mapping:</strong> {gamepad.mapping || 'vacío'}
          </p>
          <h4>Ejes</h4>
          {gamepad.axes.map((value, index) => (
            <div className="axis" key={index}>
              <span>
                Eje {index}: {value.toFixed(3)}
              </span>
              <meter min="-1" max="1" value={value} aria-label={`Eje ${index}`} />
            </div>
          ))}
          <h4>Botones</h4>
          <div className="buttons">
            {gamepad.buttons.map((button) => (
              <span className={button.pressed ? 'pressed' : ''} key={button.index}>
                {button.index}: {button.pressed ? 'presionado' : 'libre'} ({button.value.toFixed(2)})
              </span>
            ))}
          </div>
        </article>
      ))}
    </div>
  );
}

export function GamepadProfiles({ gamepads }: { gamepads: GamepadState[] }) {
  const [profiles, setProfiles] = useState<JoystickProfile[]>([]);
  const [profile, setProfile] = useState<JoystickProfile | null>(null);
  const [learning, setLearning] = useState<MappingField | null>(null);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const previous = useRef<GamepadState | undefined>(undefined);
  const currentGamepad = gamepads[0];

  const load = async () => {
    try {
      const response = await fetch('/api/profiles');
      if (!response.ok) {
        throw new Error();
      }
      setProfiles((await response.json()) as JoystickProfile[]);
    } catch {
      setError('No se pudieron cargar los perfiles.');
    }
  };

  useEffect(() => {
    void load();
  }, []);

  useEffect(() => {
    if (!learning) {
      previous.current = currentGamepad;
      return;
    }

    const learned = learnControl(previous.current, currentGamepad);
    previous.current = currentGamepad;
    if (!learned || !profile) {
      return;
    }

    const expectsAxis = learning.startsWith('axis');
    if ((expectsAxis && learned.kind !== 'axis') || (!expectsAxis && learned.kind !== 'button')) {
      return;
    }

    setProfile({ ...profile, [learning]: learned.index });
    setNotice(`${mappingLabels[learning]} asignado a ${learned.kind} ${learned.index}.`);
    setLearning(null);
  }, [currentGamepad, learning, profile]);

  const beginLearning = (field: MappingField) => {
    previous.current = currentGamepad;
    setNotice(`Mové el eje o presioná el botón para ${mappingLabels[field]}.`);
    setLearning(field);
  };

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!profile) {
      return;
    }

    setError('');
    try {
      const response = await fetch('/api/profiles', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(profile),
      });
      if (!response.ok) {
        const body = (await response.json()) as { error?: string };
        setError(body.error || 'No se pudo guardar el perfil.');
        return;
      }
      const saved = (await response.json()) as JoystickProfile;
      setProfile(saved);
      setNotice('Perfil guardado.');
      await load();
    } catch {
      setError('No se pudo conectar con la API para guardar el perfil.');
    }
  };

  const updateNumber = (field: MappingField, value: string) => {
    if (profile) {
      setProfile({ ...profile, [field]: Math.max(0, Number(value)) });
    }
  };

  return (
    <section>
      <h2>Perfiles de joystick</h2>
      <p>Los ajustes de calibración se guardan para uso futuro; esta fase no controla movimiento de cámaras.</p>
      <div>
        <button disabled={!currentGamepad} onClick={() => currentGamepad && setProfile(createProfile(currentGamepad))}>
          Crear perfil desde joystick conectado
        </button>
        {!currentGamepad && <span> Conectá un joystick para crear un perfil.</span>}
      </div>
      <ul className="profile-list">
        {profiles.map((item) => (
          <li key={item.id}>
            {item.name} ({item.gamepadId}) <button onClick={() => setProfile(item)}>Editar</button>
          </li>
        ))}
      </ul>
      {profile && (
        <form onSubmit={save} className="profile-form">
          <label>
            Nombre
            <input
              required
              maxLength={100}
              value={profile.name}
              onChange={(event) => setProfile({ ...profile, name: event.target.value })}
            />
          </label>
          <label>
            ID del gamepad
            <input readOnly value={profile.gamepadId} />
          </label>
          {(Object.keys(mappingLabels) as MappingField[]).map((field) => (
            <label key={field}>
              {mappingLabels[field]}
              <span className="mapping-input">
                <input
                  min="0"
                  type="number"
                  value={profile[field]}
                  onChange={(event) => updateNumber(field, event.target.value)}
                />
                <button type="button" onClick={() => beginLearning(field)}>
                  {learning === field ? 'Esperando entrada…' : 'Aprender'}
                </button>
              </span>
            </label>
          ))}
          <fieldset>
            <legend>Calibración guardada (no aplicada en esta fase)</legend>
            <label className="check">
              <input
                type="checkbox"
                checked={profile.invertPan}
                onChange={(event) => setProfile({ ...profile, invertPan: event.target.checked })}
              />
              Invertir pan
            </label>
            <label className="check">
              <input
                type="checkbox"
                checked={profile.invertTilt}
                onChange={(event) => setProfile({ ...profile, invertTilt: event.target.checked })}
              />
              Invertir tilt
            </label>
            <label className="check">
              <input
                type="checkbox"
                checked={profile.invertZoom}
                onChange={(event) => setProfile({ ...profile, invertZoom: event.target.checked })}
              />
              Invertir zoom
            </label>
            <label>
              Curva pan/tilt
              <select
                value={profile.curves.panTilt}
                onChange={(event) =>
                  setProfile({
                    ...profile,
                    curves: { ...profile.curves, panTilt: event.target.value as JoystickProfile['curves']['panTilt'] },
                  })
                }
              >
                <option value="linear">Lineal</option>
                <option value="power">Potencia</option>
                <option value="s-curve">Curva S</option>
              </select>
            </label>
            <label>
              Curva zoom
              <select
                value={profile.curves.zoom}
                onChange={(event) =>
                  setProfile({
                    ...profile,
                    curves: { ...profile.curves, zoom: event.target.value as JoystickProfile['curves']['zoom'] },
                  })
                }
              >
                <option value="linear">Lineal</option>
                <option value="power">Potencia</option>
                <option value="s-curve">Curva S</option>
              </select>
            </label>
            <label>
              Zona muerta pan/tilt{' '}
              <input
                min="0"
                max="1"
                step="0.01"
                type="number"
                value={profile.deadzones.panTilt}
                onChange={(event) =>
                  setProfile({ ...profile, deadzones: { ...profile.deadzones, panTilt: Number(event.target.value) } })
                }
              />
            </label>
            <label>
              Zona muerta zoom{' '}
              <input
                min="0"
                max="1"
                step="0.01"
                type="number"
                value={profile.deadzones.zoom}
                onChange={(event) =>
                  setProfile({ ...profile, deadzones: { ...profile.deadzones, zoom: Number(event.target.value) } })
                }
              />
            </label>
            <label>
              Exponente{' '}
              <input
                min="1"
                step="0.1"
                type="number"
                value={profile.exponent}
                onChange={(event) => setProfile({ ...profile, exponent: Number(event.target.value) })}
              />
            </label>
            <label>
              Sensibilidad{' '}
              <input
                min="0.01"
                step="0.01"
                type="number"
                value={profile.sensitivity}
                onChange={(event) => setProfile({ ...profile, sensitivity: Number(event.target.value) })}
              />
            </label>
            <label>
              Rampa subida (ms){' '}
              <input
                min="0"
                type="number"
                value={profile.rampUpMs}
                onChange={(event) => setProfile({ ...profile, rampUpMs: Number(event.target.value) })}
              />
            </label>
            <label>
              Rampa bajada (ms){' '}
              <input
                min="0"
                type="number"
                value={profile.rampDownMs}
                onChange={(event) => setProfile({ ...profile, rampDownMs: Number(event.target.value) })}
              />
            </label>
          </fieldset>
          <button type="submit">Guardar perfil</button>
        </form>
      )}
      {notice && <p role="status">{notice}</p>}
      {error && <p role="alert">{error}</p>}
    </section>
  );
}
