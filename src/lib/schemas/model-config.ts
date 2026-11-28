import { z } from 'zod';

/**
 * Vector3 tuple [x, y, z] representation in 3D coordinate space.
 */
export const Vector3Schema = z.tuple([z.number(), z.number(), z.number()]);
export type Vector3Tuple = z.infer<typeof Vector3Schema>;

/**
 * Supported 3D lighting / HDR environment presets.
 */
export const EnvironmentPresetSchema = z.enum([
  'studio',
  'night',
  'city',
  'sunset',
  'dawn',
  'warehouse',
  'forest',
  'apartment',
]);
export type EnvironmentPreset = z.infer<typeof EnvironmentPresetSchema>;

/**
 * ModelConfigSchema: Single Source of Truth cho cấu hình hiển thị 3D của sản phẩm.
 *
 * Nguyên tắc:
 * - Mọi trường đều là optional.
 * - Khi không cấu hình, viewer tự động dùng <Bounds> / <Center> để chuẩn hóa scale và tâm xoay.
 * - Khi người dùng chỉnh tay (scale, position, rotation, cameraPosition, target), các giá trị
 *   này sẽ được ưu tiên áp dụng đè lên auto-fit để không làm mất tinh chỉnh của admin.
 */
export const ModelConfigSchema = z
  .object({
    // Transform overrides
    scale: z.number().positive('Scale phải lớn hơn 0').optional(),
    position: Vector3Schema.optional(),
    rotation: Vector3Schema.optional(),

    // Camera configuration
    cameraDistance: z.number().positive('Khoảng cách camera phải lớn hơn 0').optional(),
    cameraPosition: Vector3Schema.optional(),
    target: Vector3Schema.optional(),

    // Lighting & Environment
    environment: EnvironmentPresetSchema.optional().default('studio'),
    exposure: z.number().positive().optional().default(1.15),

    // Animation & Rotation
    autoRotate: z.boolean().optional().default(false),
    autoRotateSpeed: z.number().optional().default(1.5),

    // Custom metadata (vật liệu, màu mặc định nếu có)
    defaultVariant: z.string().optional(),
    notes: z.string().max(300).optional(),
  })
  .strict();

export type ModelConfig = z.infer<typeof ModelConfigSchema>;

/**
 * Input type khi validate form tạo/sửa model_config
 */
export type ModelConfigInput = z.input<typeof ModelConfigSchema>;

/**
 * Helper: Kiểm tra model_config có chứa tinh chỉnh vị trí/camera chỉnh tay hay không.
 * Giúp viewer quyết định có áp dụng Bounds auto-fit hay dùng cameraPosition chỉnh tay.
 */
export function hasCustomCameraConfig(config?: ModelConfig | null): boolean {
  if (!config) return false;
  return Boolean(config.cameraPosition || config.cameraDistance || config.target);
}

/**
 * Helper: Kiểm tra model_config có chứa tinh chỉnh scale chỉnh tay hay không.
 */
export function hasCustomScaleConfig(config?: ModelConfig | null): boolean {
  if (!config) return false;
  return typeof config.scale === 'number' && config.scale > 0;
}
