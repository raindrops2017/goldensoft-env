import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const envSchema = z.object({
  PORT: z.string().default('4000').transform(Number),
  LOCAL_DB_PATH: z.string().default('local_branch.db'),
  JWT_SECRET: z.string().min(1, 'JWT_SECRET is required'),
  JWT_EXPIRES_IN: z.string().min(1, 'JWT_EXPIRES_IN is required').default('15m'),
  REFRESH_TOKEN_EXPIRES_IN: z.string().min(1, 'REFRESH_TOKEN_EXPIRES_IN is required').default('7d'),
  CLOUD_API_URL: z.string().default('http://localhost:3000/api'),
  TENANT_SUBDOMAIN: z.string().default('demo'),
});

const parsedEnv = envSchema.safeParse(process.env);

if (!parsedEnv.success) {
  console.error('❌ Invalid environment variables:', parsedEnv.error.format());
  process.exit(1);
}

export const env = parsedEnv.data;
