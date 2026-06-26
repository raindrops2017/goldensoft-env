import { z } from 'zod';

// Legacy schema kept for backward compatibility during migration
export const PinLoginSchema = z.object({
  pin: z.string().min(4, 'PIN must be at least 4 characters long'),
});
export type PinLogin = z.infer<typeof PinLoginSchema>;

// New 2-step login: user selects themselves first, then enters PIN
export const UserPinLoginSchema = z.object({
  userId: z.string().min(1, 'User ID is required'),
  pin: z.string().min(4, 'PIN must be at least 4 characters long'),
});
export type UserPinLogin = z.infer<typeof UserPinLoginSchema>;

export const JwtPayloadSchema = z.object({
  userId: z.string(),
  roleId: z.string().nullable().optional(),
  permissions: z.array(z.string()),
  isWaiter: z.boolean().optional(),
});
export type JwtPayload = z.infer<typeof JwtPayloadSchema>;

export const AuthUserSchema = z.object({
  id: z.string(),
  username: z.string(),
  role: z.string(),
  roleId: z.string().nullable().optional(),
  permissions: z.array(z.string()),
  isWaiter: z.boolean().optional(),
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

// Active user entry returned by GET /auth/users
export const ActiveUserSchema = z.object({
  id: z.string(),
  username: z.string(),
});
export type ActiveUser = z.infer<typeof ActiveUserSchema>;

export const ActiveUsersResponseSchema = z.object({
  success: z.boolean(),
  data: z.array(ActiveUserSchema),
});
export type ActiveUsersResponse = z.infer<typeof ActiveUsersResponseSchema>;
