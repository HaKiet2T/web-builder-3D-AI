import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';
import { CHATBOT_SYSTEM_PROMPT, buildSystemPrompt } from '../src/lib/chat/system-prompt.ts';
import { ChatRequestSchema, ChatResponseSchema } from '../src/lib/chat/schema.ts';

const migrationSql = readFileSync('supabase/migrations/20261116120000_chat_support_schema.sql', 'utf8');
const typesContent = readFileSync('src/lib/supabase/database.types.ts', 'utf8');
const layoutContent = readFileSync('src/app/layout.tsx', 'utf8');

describe('Chatbot System Prompt, Schema and Architecture', () => {
  it('enforces strict boundary and never contains em dash', () => {
    assert.doesNotMatch(CHATBOT_SYSTEM_PROMPT, /\u2014/, 'System prompt must not contain em dash (U+2014)');
    assert.match(CHATBOT_SYSTEM_PROMPT, /Sản phẩm/);
    assert.match(CHATBOT_SYSTEM_PROMPT, /Đơn hàng/);
    assert.match(CHATBOT_SYSTEM_PROMPT, /Thanh toán/);
    assert.match(CHATBOT_SYSTEM_PROMPT, /TỪ CHỐI TUYỆT ĐỐI MỌI YÊU CẦU NGOÀI PHẠM VI/);

    const withContext = buildSystemPrompt('CONTEXT DATA SAMPLE');
    assert.match(withContext, /CONTEXT DATA SAMPLE/);
    assert.doesNotMatch(withContext, /\u2014/);
  });

  it('validates ChatRequest and ChatResponse schemas correctly', () => {
    // Valid request
    const valid = { message: 'Tư vấn cho mình màn hình' };
    const parsed = ChatRequestSchema.safeParse(valid);
    assert.equal(parsed.success, true);

    // Empty message must fail
    const empty = { message: '   ' };
    assert.equal(ChatRequestSchema.safeParse(empty).success, false);

    // Too long message (>1000 chars) must fail
    const tooLong = { message: 'a'.repeat(1001) };
    assert.equal(ChatRequestSchema.safeParse(tooLong).success, false);

    // Valid response
    const validResponse = {
      reply: 'Dạ shop có màn hình ROG Strix',
      intent: 'product',
      sessionId: '123e4567-e89b-12d3-a456-426614174000',
      quickReplies: [{ label: 'Xem 3D', prompt: 'Mở xem 3D' }],
    };
    assert.equal(ChatResponseSchema.safeParse(validResponse).success, true);
  });

  it('declares migration with chat_sessions, chat_messages and idempotent policy guards', () => {
    assert.match(migrationSql, /create table if not exists public\.chat_sessions/i);
    assert.match(migrationSql, /create table if not exists public\.chat_messages/i);
    assert.match(migrationSql, /user_id uuid references auth\.users\(id\)/i);
    assert.match(migrationSql, /alter table public\.chat_sessions enable row level security/i);
    assert.match(migrationSql, /alter table public\.chat_messages enable row level security/i);
    assert.match(migrationSql, /drop policy if exists "Users read own chat sessions"/i);
    assert.match(migrationSql, /drop policy if exists "Users read own chat messages"/i);
  });

  it('defines strict Supabase types for chat_sessions and chat_messages', () => {
    assert.match(typesContent, /chat_sessions:\s*\{/);
    assert.match(typesContent, /chat_messages:\s*\{/);
    assert.match(typesContent, /ChatSessionRow/);
    assert.match(typesContent, /ChatMessageRow/);
  });

  it('integrates ChatWidget globally into RootLayout', () => {
    assert.match(layoutContent, /import\s*\{\s*ChatWidget\s*\}\s*from\s*["']@\/components\/chat\/ChatWidget["']/);
    assert.match(layoutContent, /<ChatWidget\s*\/>/);
  });
});
