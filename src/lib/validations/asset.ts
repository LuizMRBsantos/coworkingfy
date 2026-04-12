import { z } from "zod";
import { AssetStatus, AssetType } from "@prisma/client";

export const CreateAssetSchema = z.object({
  unitId:            z.string().min(1, "Unidade é obrigatória"),
  spaceId:           z.string().optional(),
  code:              z.string().min(1, "Etiqueta é obrigatória").max(20),
  name:              z.string().min(1, "Nome é obrigatório").max(100),
  description:       z.string().optional(),
  type:              z.nativeEnum(AssetType),
  brand:             z.string().optional(),
  assetModel:        z.string().optional(),
  serialNumber:      z.string().optional(),
  purchasedAt:       z.iso.datetime().optional(),
  warrantyExpiresAt: z.iso.datetime().optional(),
  notes:             z.string().optional(),
});

export const UpdateAssetSchema = z.object({
  spaceId:           z.string().optional(),
  name:              z.string().min(1).max(100).optional(),
  description:       z.string().optional(),
  brand:             z.string().optional(),
  assetModel:        z.string().optional(),
  serialNumber:      z.string().optional(),
  purchasedAt:       z.iso.datetime().optional(),
  warrantyExpiresAt: z.iso.datetime().optional(),
  notes:             z.string().optional(),
  status:            z.nativeEnum(AssetStatus).optional(),
});

export type CreateAssetInput = z.infer<typeof CreateAssetSchema>;
export type UpdateAssetInput = z.infer<typeof UpdateAssetSchema>;
