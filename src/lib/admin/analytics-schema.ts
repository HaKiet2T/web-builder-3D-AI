import { z } from 'zod';

export const SalesPeriodSchema = z.enum([
  'today',
  '7d',
  '14d',
  '30d',
  'this_month',
  'last_month',
  'all',
]);
export type SalesPeriod = z.infer<typeof SalesPeriodSchema>;

export const SalesOverviewSchema = z.object({
  totalRevenue: z.number().nonnegative(),
  previousPeriodRevenue: z.number().nonnegative(),
  revenueGrowthRate: z.number(),
  totalOrders: z.number().int().nonnegative(),
  paidOrdersCount: z.number().int().nonnegative(),
  averageOrderValue: z.number().nonnegative(),
  cancellationRate: z.number().min(0).max(100),
  pendingFulfillmentCount: z.number().int().nonnegative(),
  splitShipmentCount: z.number().int().nonnegative(),
  inStockOrdersCount: z.number().int().nonnegative(),
  preorderOrdersCount: z.number().int().nonnegative(),
});
export type SalesOverview = z.infer<typeof SalesOverviewSchema>;

export const DailyRevenuePointSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be formatted as YYYY-MM-DD'),
  revenue: z.number().nonnegative(),
  orderCount: z.number().int().nonnegative(),
  paidCount: z.number().int().nonnegative(),
});
export type DailyRevenuePoint = z.infer<typeof DailyRevenuePointSchema>;

export const CategoryRevenueShareSchema = z.object({
  categoryId: z.string(),
  categoryName: z.string(),
  revenue: z.number().nonnegative(),
  percentage: z.number().min(0).max(100),
  itemsSold: z.number().int().nonnegative(),
});
export type CategoryRevenueShare = z.infer<typeof CategoryRevenueShareSchema>;

export const PaymentMethodDistributionSchema = z.object({
  method: z.string(),
  label: z.string(),
  orderCount: z.number().int().nonnegative(),
  totalAmount: z.number().nonnegative(),
  percentage: z.number().min(0).max(100),
});
export type PaymentMethodDistribution = z.infer<typeof PaymentMethodDistributionSchema>;

export const InventoryAlertLevelSchema = z.enum(['critical', 'warning', 'preorder']);
export type InventoryAlertLevel = z.infer<typeof InventoryAlertLevelSchema>;

export const InventoryAlertSchema = z.object({
  productId: z.string(),
  productName: z.string(),
  variantId: z.string(),
  variantName: z.string(),
  sku: z.string(),
  categoryName: z.string(),
  stockQuantity: z.number().int(),
  stockStatus: z.string(),
  alertLevel: InventoryAlertLevelSchema,
});
export type InventoryAlert = z.infer<typeof InventoryAlertSchema>;

export const FulfillmentBottleneckSchema = z.object({
  orderId: z.string(),
  orderNumber: z.string(),
  customerName: z.string(),
  orderStatus: z.string(),
  paymentStatus: z.string(),
  createdAt: z.string(),
  hoursWaiting: z.number().nonnegative(),
  isSplitShipment: z.boolean(),
  packageCount: z.number().int().positive(),
  totalAmount: z.number().nonnegative(),
});
export type FulfillmentBottleneck = z.infer<typeof FulfillmentBottleneckSchema>;

export const TopProductItemSchema = z.object({
  productId: z.string(),
  productName: z.string(),
  categoryName: z.string().optional(),
  revenue: z.number().nonnegative(),
  unitsSold: z.number().int().nonnegative(),
  ordersCount: z.number().int().nonnegative(),
});
export type TopProductItem = z.infer<typeof TopProductItemSchema>;

export const FullSalesAnalyticsSchema = z.object({
  period: SalesPeriodSchema,
  generatedAt: z.string(),
  overview: SalesOverviewSchema,
  trend: z.array(DailyRevenuePointSchema),
  categoryShare: z.array(CategoryRevenueShareSchema),
  paymentDistribution: z.array(PaymentMethodDistributionSchema),
  inventoryAlerts: z.array(InventoryAlertSchema),
  bottlenecks: z.array(FulfillmentBottleneckSchema),
  topProducts: z.array(TopProductItemSchema).optional(),
});
export type FullSalesAnalytics = z.infer<typeof FullSalesAnalyticsSchema>;

export const CopilotMessageRoleSchema = z.enum(['user', 'assistant', 'system']);
export type CopilotMessageRole = z.infer<typeof CopilotMessageRoleSchema>;

export const CopilotHistoryMessageSchema = z.object({
  role: CopilotMessageRoleSchema,
  content: z.string().min(1, 'Nội dung tin nhắn không được để trống'),
});
export type CopilotHistoryMessage = z.infer<typeof CopilotHistoryMessageSchema>;

export const CopilotChatRequestSchema = z.object({
  message: z.string().trim().min(1, 'Tin nhắn không được để trống'),
  history: z.array(CopilotHistoryMessageSchema).optional().default([]),
  referenceDate: z.string().optional(),
});
export type CopilotChatRequest = z.infer<typeof CopilotChatRequestSchema>;
