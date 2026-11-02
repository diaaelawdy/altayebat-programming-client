/** Form schemas. Keep in sync with server/src/shared/schemas.ts. */
import { z } from 'zod';
import {
  DIFFICULTIES,
  FIELDS,
  LEVELS,
  SPECIALIZATIONS,
  STAGES,
  TOPICS,
  USERNAME_RE,
  specializationsFit,
} from './constants';

export const usernameSchema = z.string().trim().toLowerCase().regex(USERNAME_RE, 'username_format');
export const passwordSchema = z.string().min(6, 'password_min').max(128);
export const registerSchema = z.object({ username: usernameSchema, password: passwordSchema });
export const loginSchema = z.object({
  username: z.string().trim().min(1),
  password: z.string().min(1),
});

export const questionFormSchema = z
  .object({
    title: z.string().trim().min(4).max(120),
    field: z.enum(FIELDS),
    specializations: z.array(z.enum(SPECIALIZATIONS)).max(3),
    levels: z.array(z.enum(LEVELS)).min(1).max(3),
    stage: z.enum(STAGES),
    difficulty: z.enum(DIFFICULTIES),
    topics: z.array(z.enum(TOPICS)).min(1).max(3),
    problem: z.string().trim().min(20).max(10_000),
    examples: z
      .array(
        z.object({
          input: z.string().trim().min(1),
          output: z.string().trim().min(1),
          explanation: z.string().trim().optional(),
        }),
      )
      .max(5),
    constraints: z.array(z.string().trim().min(1).max(300)).max(15),
    lookFor: z.string().trim().max(5000).optional(),
    followUps: z.array(z.string().trim().min(1).max(500)).max(10),
    askedMonth: z
      .string()
      .regex(/^\d{4}-(0[1-9]|1[0-2])$/)
      .optional(),
  })
  .refine((q) => specializationsFit(q.field, q.specializations), {
    path: ['specializations'],
  });

/** Bulk upload limits. Keep in sync with BULK_MAX_QUESTIONS on the server (body limit 1 MB). */
export const BULK_MAX_QUESTIONS = 50;
export const BULK_MAX_KB = 900;
export const LINKEDIN_RE = /^https?:\/\/([a-z]{2,3}\.)?linkedin\.com\//i;
