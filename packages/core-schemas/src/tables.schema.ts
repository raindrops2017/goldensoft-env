import { z } from 'zod';

export const TableShapeSchema = z.enum(['rect', 'circle']);
export type TableShape = z.infer<typeof TableShapeSchema>;

export const TableSectionSchema = z.object({
  id: z.string(),
  name: z.string(),
  cloudSyncId: z.string().nullable().optional(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
});
export type TableSection = z.infer<typeof TableSectionSchema>;

export const TableSchema = z.object({
  id: z.string(),
  number: z.number(),
  name: z.string().default(''),
  posX: z.number().default(10),
  posY: z.number().default(10),
  tableWidth: z.number().default(100),
  tableHeight: z.number().default(100),
  angle: z.number().default(0),
  shape: TableShapeSchema.default('rect'),
  tableSectionId: z.string(),
  belongsToCurrentUser: z.boolean().optional(),
  cloudSyncId: z.string().nullable().optional(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
});
export type Table = z.infer<typeof TableSchema>;

export const CreateTableSectionSchema = z.object({
  name: z.string().min(1, 'Section name is required'),
});
export type CreateTableSectionInput = z.infer<typeof CreateTableSectionSchema>;

export const CreateTableSchema = z.object({
  number: z.number().min(1, 'Table number must be at least 1'),
  name: z.string().optional().default(''),
  tableSectionId: z.string(),
  posX: z.number().optional().default(10),
  posY: z.number().optional().default(10),
  tableWidth: z.number().optional().default(100),
  tableHeight: z.number().optional().default(100),
  shape: TableShapeSchema.optional().default('rect'),
});
export type CreateTableInput = z.infer<typeof CreateTableSchema>;

export const UpdateTableSchema = z.object({
  name: z.string().optional(),
  number: z.number().optional(),
  posX: z.number().optional(),
  posY: z.number().optional(),
  tableWidth: z.number().optional(),
  tableHeight: z.number().optional(),
  shape: TableShapeSchema.optional(),
  angle: z.number().optional(),
});
export type UpdateTableInput = z.infer<typeof UpdateTableSchema>;
