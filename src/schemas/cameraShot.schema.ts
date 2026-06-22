import { z } from 'zod';

import {
  CameraShotIdSchema,
  DisplayNameSchema,
  EntityIdSchema,
  QuatSchema,
  SchemaVersionSchema,
  StableIdSchema,
  Vec3Schema,
} from './common.schema';

export const SphericalCameraPointSchema = z
  .object({
    mode: z.literal('spherical-region'),
    region: StableIdSchema,
    localPosition: Vec3Schema,
    localYaw: z.number().finite().optional(),
  })
  .strict();

export const CameraPointSchema = z.union([Vec3Schema, SphericalCameraPointSchema]);
export const CameraLookAtSchema = z.union([CameraPointSchema, EntityIdSchema]);

export const CameraPoseSchema = z
  .object({
    position: CameraPointSchema,
    rotation: QuatSchema.optional(),
    lookAt: CameraLookAtSchema.optional(),
    fov: z.number().positive(),
    near: z.number().positive().optional(),
    far: z.number().positive().optional(),
  })
  .strict();

export const CameraShotKeySchema = CameraPoseSchema.extend({
  time: z.number().nonnegative(),
  ease: z.string().min(1).optional(),
}).strict();

export const StaticCameraShotSchema = z
  .object({
    schemaVersion: SchemaVersionSchema,
    id: CameraShotIdSchema,
    name: DisplayNameSchema.optional(),
    type: z.literal('static'),
    pose: CameraPoseSchema,
  })
  .strict();

export const KeyframedCameraShotSchema = z
  .object({
    schemaVersion: SchemaVersionSchema,
    id: CameraShotIdSchema,
    name: DisplayNameSchema.optional(),
    type: z.literal('keyframed'),
    duration: z.number().positive(),
    keys: z.array(CameraShotKeySchema).min(1),
  })
  .strict();

export const FollowCameraShotSchema = z
  .object({
    schemaVersion: SchemaVersionSchema,
    id: CameraShotIdSchema,
    name: DisplayNameSchema.optional(),
    type: z.literal('follow'),
    target: EntityIdSchema,
    offset: Vec3Schema,
    fov: z.number().positive(),
  })
  .strict();

export const LookAtCameraShotSchema = z
  .object({
    schemaVersion: SchemaVersionSchema,
    id: CameraShotIdSchema,
    name: DisplayNameSchema.optional(),
    type: z.literal('lookAt'),
    position: CameraPointSchema,
    target: CameraLookAtSchema,
    fov: z.number().positive(),
  })
  .strict();

export const CameraShotSchema = z.discriminatedUnion('type', [
  StaticCameraShotSchema,
  KeyframedCameraShotSchema,
  FollowCameraShotSchema,
  LookAtCameraShotSchema,
]);

export type CameraLookAtData = z.infer<typeof CameraLookAtSchema>;
export type CameraPointData = z.infer<typeof CameraPointSchema>;
export type CameraPoseData = z.infer<typeof CameraPoseSchema>;
export type CameraShotKeyData = z.infer<typeof CameraShotKeySchema>;
export type CameraShotData = z.infer<typeof CameraShotSchema>;
export type SphericalCameraPointData = z.infer<typeof SphericalCameraPointSchema>;
