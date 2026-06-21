import { z } from 'zod';

export const PinLoginSchema = z.object({
  pin: z.string().min(4, "PIN must be at least 4 characters long"),
});
export type PinLogin = z.infer<typeof PinLoginSchema>;

export const JwtPayloadSchema = z.object({
  userId: z.string(),
  roleId: z.string().nullable().optional(),
  permissions: z.array(z.string()),
});
export type JwtPayload = z.infer<typeof JwtPayloadSchema>;

export const AuthUserSchema = z.object({
  id: z.string(),
  username: z.string(),
  role: z.string(),
  roleId: z.string().nullable().optional(),
  permissions: z.array(z.string()),
});
export type AuthUser = z.infer<typeof AuthUserSchema>;

export const LoginResponseSchema = z.object({
  success: z.boolean(),
  data: z.object({
    accessToken: z.string(),
    user: AuthUserSchema.optional(),
  }),
  error: z.string().optional(),
});
export type LoginResponse = z.infer<typeof LoginResponseSchema>;
