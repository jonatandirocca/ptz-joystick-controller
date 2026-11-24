import { useEffect, useState } from 'react';

export type GamepadButtonState = {
  index: number;
  pressed: boolean;
  value: number;
};

export type GamepadState = {
  axes: number[];
  buttons: GamepadButtonState[];
  id: string;
  index: number;
  mapping: string;
};

export type LearnedControl = { kind: 'axis' | 'button'; index: number };

const supported = () => typeof navigator !== 'undefined' && typeof navigator.getGamepads === 'function';

export const isGamepadContextAvailable = () => {
  if (typeof window === 'undefined') {
    return false;
  }

  return window.isSecureContext || window.location.hostname === 'localhost';
};

export const readGamepads = (): GamepadState[] => {
  if (!supported()) {
    return [];
  }

  return Array.from(navigator.getGamepads())
    .filter((gamepad): gamepad is Gamepad => gamepad !== null)
    .map((gamepad) => ({
      id: gamepad.id,
      index: gamepad.index,
      mapping: gamepad.mapping,
      axes: Array.from(gamepad.axes),
      buttons: Array.from(gamepad.buttons, (button, index) => ({
        index,
        pressed: button.pressed,
        value: button.value,
      })),
    }));
};

export const learnControl = (
  previous: GamepadState | undefined,
  current: GamepadState | undefined,
): LearnedControl | undefined => {
  if (!current) {
    return undefined;
  }

  const pressedButton = current.buttons.find((button) => button.pressed);
  if (pressedButton) {
    return { kind: 'button', index: pressedButton.index };
  }

  if (!previous) {
    return undefined;
  }

  let largestChange = 0;
  let axisIndex = -1;
  current.axes.forEach((value, index) => {
    const change = Math.abs(value - (previous.axes[index] ?? 0));
    if (change > largestChange) {
      largestChange = change;
      axisIndex = index;
    }
  });

  return largestChange >= 0.15 && axisIndex >= 0 ? { kind: 'axis', index: axisIndex } : undefined;
};

export function useGamepad(): GamepadState[] {
  const [gamepads, setGamepads] = useState<GamepadState[]>(readGamepads);

  useEffect(() => {
    if (!supported()) {
      return undefined;
    }

    let frame = 0;
    const update = () => setGamepads(readGamepads());
    const poll = () => {
      update();
      frame = requestAnimationFrame(poll);
    };

    window.addEventListener('gamepadconnected', update);
    window.addEventListener('gamepaddisconnected', update);
    frame = requestAnimationFrame(poll);
    update();

    return () => {
      window.removeEventListener('gamepadconnected', update);
      window.removeEventListener('gamepaddisconnected', update);
      cancelAnimationFrame(frame);
    };
  }, []);

  return gamepads;
}
