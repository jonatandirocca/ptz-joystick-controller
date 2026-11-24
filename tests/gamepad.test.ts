import { afterEach, describe, expect, it, vi } from 'vitest';
import { learnControl, readGamepads } from '../apps/web/src/useGamepad.js';

const gamepad = (axes: number[], pressedButton = -1) =>
  ({
    id: 'Joystick de prueba',
    index: 0,
    mapping: 'standard',
    axes,
    buttons: [0, 1, 2, 3, 4, 5].map((_, index) => ({
      pressed: index === pressedButton,
      value: index === pressedButton ? 1 : 0,
    })),
  }) as unknown as Gamepad;

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('Gamepad API', () => {
  it('lee el gamepad detectado desde navigator.getGamepads', () => {
    vi.stubGlobal('navigator', { getGamepads: () => [gamepad([0.25, -0.5])] });

    expect(readGamepads()).toEqual([
      {
        id: 'Joystick de prueba',
        index: 0,
        mapping: 'standard',
        axes: [0.25, -0.5],
        buttons: expect.arrayContaining([{ index: 0, pressed: false, value: 0 }]),
      },
    ]);
  });

  it('devuelve estado vacío sin gamepads y no falla', () => {
    vi.stubGlobal('navigator', { getGamepads: () => [] });

    expect(readGamepads()).toEqual([]);
  });

  it('aprende el eje que más cambió, incluso si no es el primero', () => {
    const previous = {
      id: 'Joystick de prueba',
      index: 0,
      mapping: 'standard',
      axes: [0, 0, 0, 0],
      buttons: [],
    };
    const current = { ...previous, axes: [0.03, 0, 0, -0.82] };

    expect(learnControl(previous, current)).toEqual({ kind: 'axis', index: 3 });
  });

  it('aprende un botón presionado', () => {
    const current = {
      id: 'Joystick de prueba',
      index: 0,
      mapping: 'standard',
      axes: [0, 0],
      buttons: [{ index: 5, pressed: true, value: 1 }],
    };

    expect(learnControl(undefined, current)).toEqual({ kind: 'button', index: 5 });
  });
});
