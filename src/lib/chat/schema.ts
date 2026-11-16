import { z } from 'zod';

export const ChatIntentEnum = z.enum([
  'product',
  'order',
  'payment',
  'greeting',
  'rejected',
  'general',
]);

export type ChatIntent = z.infer<typeof ChatIntentEnum>;

export const ChatSenderEnum = z.enum(['user', 'assistant', 'system']);
export type ChatSender = z.infer<typeof ChatSenderEnum>;

export const ChatRequestSchema = z.object({
  message: z
    .string()
    .trim()
    .min(1, 'Tin nhắn không được để trống')
    .max(1000, 'Tin nhắn tối đa 1000 ký tự'),
  sessionId: z.string().uuid().optional(),
  language: z.enum(['vi', 'en', 'auto']).default('auto'),
});

export type ChatRequest = z.infer<typeof ChatRequestSchema>;

export const QuickReplySchema = z.object({
  label: z.string(),
  prompt: z.string(),
});

export type QuickReply = z.infer<typeof QuickReplySchema>;

export const ChatResponseSchema = z.object({
  reply: z.string(),
  intent: ChatIntentEnum,
  sessionId: z.string().uuid(),
  quickReplies: z.array(QuickReplySchema),
});

export type ChatResponse = z.infer<typeof ChatResponseSchema>;
