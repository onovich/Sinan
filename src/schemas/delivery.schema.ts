import { z } from 'zod';

import { DisplayNameSchema, StableIdSchema, Vec3Schema } from './common.schema';

export const DeliveryEndpointIdSchema = StableIdSchema;
export const DeliveryJobIdSchema = StableIdSchema;

export const DeliveryJobStatusSchema = z.enum([
  'available',
  'accepted',
  'inProgress',
  'readyToDeliver',
  'completed',
  'blocked',
  'failed',
]);

export const DeliveryPackageSchema = z
  .object({
    kind: z.enum(['message', 'parcel']).default('parcel'),
    label: DisplayNameSchema,
    itemId: StableIdSchema.optional(),
  })
  .strict();

export const DeliveryEndpointRouteHintSchema = z
  .object({
    type: z.literal('endpoint'),
    endpointId: DeliveryEndpointIdSchema,
    label: DisplayNameSchema.optional(),
  })
  .strict();

export const DeliverySphericalRouteHintSchema = z
  .object({
    type: z.literal('spherical-region'),
    region: StableIdSchema,
    localPosition: Vec3Schema.optional(),
    label: DisplayNameSchema.optional(),
  })
  .strict();

export const DeliveryRouteHintSchema = z.discriminatedUnion('type', [
  DeliveryEndpointRouteHintSchema,
  DeliverySphericalRouteHintSchema,
]);

export const DeliveryCompletionRuleSchema = z
  .object({
    type: z.literal('deliverToEndpoint'),
    endpointId: DeliveryEndpointIdSchema,
  })
  .strict();

export const DeliveryFeedbackSchema = z
  .object({
    accepted: z.string().min(1).max(220),
    inProgress: z.string().min(1).max(220),
    readyToDeliver: z.string().min(1).max(220),
    completed: z.string().min(1).max(220),
    blocked: z.string().min(1).max(220).optional(),
    failed: z.string().min(1).max(220).optional(),
  })
  .strict();

export const DeliveryJobSchema = z
  .object({
    id: DeliveryJobIdSchema,
    title: DisplayNameSchema,
    description: z.string().min(1).max(400),
    acceptEndpointId: DeliveryEndpointIdSchema,
    targetEndpointId: DeliveryEndpointIdSchema,
    defaultStatus: DeliveryJobStatusSchema.default('available'),
    package: DeliveryPackageSchema.optional(),
    routeHints: z.array(DeliveryRouteHintSchema).default([]),
    completion: DeliveryCompletionRuleSchema,
    feedback: DeliveryFeedbackSchema,
  })
  .strict();

export type DeliveryEndpointIdData = z.infer<typeof DeliveryEndpointIdSchema>;
export type DeliveryJobIdData = z.infer<typeof DeliveryJobIdSchema>;
export type DeliveryJobStatusData = z.infer<typeof DeliveryJobStatusSchema>;
export type DeliveryPackageData = z.infer<typeof DeliveryPackageSchema>;
export type DeliveryRouteHintData = z.infer<typeof DeliveryRouteHintSchema>;
export type DeliveryCompletionRuleData = z.infer<typeof DeliveryCompletionRuleSchema>;
export type DeliveryFeedbackData = z.infer<typeof DeliveryFeedbackSchema>;
export type DeliveryJobData = z.infer<typeof DeliveryJobSchema>;
