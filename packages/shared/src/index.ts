import { z } from 'zod';

z.config(z.locales.es());

export const protocolVariants = ['generic-visca-ip'] as const;

const hostnamePattern =
  /^(?=.{1,253}$)([a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)*[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?$/;

const hostSchema = z
  .string()
  .trim()
  .min(1, 'El host es obligatorio')
  .max(253)
  .refine((value) => {
    if (/^[0-9.]+$/.test(value)) {
      return z.ipv4().safeParse(value).success;
    }

    return z.ipv6().safeParse(value).success || hostnamePattern.test(value);
  }, 'El host debe ser una IP o nombre de host válido');

export const cameraSchema = z.object({
  id: z.string().uuid(),
  name: z.string().trim().min(1, 'El nombre es obligatorio').max(100, 'El nombre no puede superar 100 caracteres'),
  host: hostSchema,
  port: z
    .number()
    .int()
    .min(1, 'El puerto debe estar entre 1 y 65535')
    .max(65535, 'El puerto debe estar entre 1 y 65535'),
  protocolVariant: z.enum(protocolVariants),
  enabled: z.boolean(),
  sortOrder: z.number().int('El orden debe ser un número entero').min(0, 'El orden no puede ser negativo'),
  panMax: z.number().int().positive(),
  tiltMax: z.number().int().positive(),
  zoomMax: z.number().int().positive(),
});

export const createCameraSchema = cameraSchema.omit({ id: true }).strict();
export const updateCameraSchema = createCameraSchema;

export type Camera = z.infer<typeof cameraSchema>;
export type CreateCameraDto = z.infer<typeof createCameraSchema>;
export type UpdateCameraDto = z.infer<typeof updateCameraSchema>;

export const joystickProfileSchema = z
  .object({
    id: z.string().uuid(),
    name: z.string().trim().min(1).max(100),
    gamepadId: z.string().trim().min(1).max(255),
    axisPan: z.number().int().min(0),
    axisTilt: z.number().int().min(0),
    axisZoom: z.number().int().min(0),
    buttonPrev: z.number().int().min(0),
    buttonNext: z.number().int().min(0),
    invertPan: z.boolean(),
    invertTilt: z.boolean(),
    invertZoom: z.boolean(),
    deadzones: z.object({ panTilt: z.number().min(0).max(1), zoom: z.number().min(0).max(1) }).strict(),
    curves: z
      .object({
        panTilt: z.enum(['linear', 'power', 's-curve']),
        zoom: z.enum(['linear', 'power', 's-curve']),
      })
      .strict(),
    exponent: z.number().min(1),
    sensitivity: z.number().positive(),
    rampUpMs: z.number().int().min(0),
    rampDownMs: z.number().int().min(0),
  })
  .strict();

export type JoystickProfile = z.infer<typeof joystickProfileSchema>;

export type ClientEvent =
  | { type: 'acquire' | 'release' | 'select'; cameraId: string; timestamp: number }
  | { type: 'motion'; cameraId: string; pan: number; tilt: number; zoom: number; seq: number; timestamp: number }
  | { type: 'heartbeat'; timestamp: number };

export type ServerEvent =
  | { type: 'cameraList'; cameras: Camera[]; timestamp: number }
  | { type: 'controlGranted'; cameraId: string; timestamp: number }
  | { type: 'controlDenied'; cameraId: string; reason: string; timestamp: number }
  | { type: 'activeCamera'; cameraId: string | null; timestamp: number }
  | { type: 'joystickStatus'; connected: boolean; timestamp: number }
  | { type: 'error'; message: string; timestamp: number }
  | { type: 'stopped'; cameraId: string; timestamp: number };
