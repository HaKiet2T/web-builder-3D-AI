import { NextResponse } from 'next/server';
import { ChatRequestSchema } from '@/lib/chat/schema';
import { classifyIntent, getQuickReplies } from '@/lib/chat/rule-guard';
import { hydrateChatContext } from '@/lib/chat/context-hydrator';
import { generateChatReply } from '@/lib/chat/gemini-client';
import { getOrCreateChatSession, saveChatMessage, listChatMessages } from '@/lib/chat/dal';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'JSON không hợp lệ' }, { status: 400 });
  }

  const parsed = ChatRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        ok: false,
        error: 'Dữ liệu không hợp lệ',
        issues: parsed.error.issues.map((i) => ({ field: i.path.join('.'), message: i.message })),
      },
      { status: 400 },
    );
  }

  const { message, sessionId: clientSessionId } = parsed.data;

  // 1. Identify User Session (auth.uid() if logged in)
  let authUserId: string | null = null;
  try {
    const supabase = await createServerSupabaseClient();
    if (supabase) {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        authUserId = user.id;
      }
    }
  } catch (authErr) {
    console.warn('[Chat API] Could not resolve auth session:', authErr);
  }

  // 2. Ensure Session ID
  const sessionId = await getOrCreateChatSession(authUserId, clientSessionId);

  // 3. Layer 1: Rule Guard Classification
  const guard = classifyIntent(message);

  if (!guard.allowed) {
    const refusal = guard.refusalMessage || 'Tôi chỉ hỗ trợ các câu hỏi liên quan đến sản phẩm, đơn hàng và thanh toán.';

    // Persist interaction asynchronously
    await saveChatMessage(sessionId, 'user', message, guard.intent);
    await saveChatMessage(sessionId, 'assistant', refusal, guard.intent);

    return NextResponse.json({
      ok: true,
      reply: refusal,
      intent: guard.intent,
      sessionId,
      quickReplies: getQuickReplies(guard.detectedLanguage),
    });
  }

  // 4. Layer 3: Context Hydration
  const contextData = await hydrateChatContext({
    userId: authUserId,
    message,
  });

  // 5. Layer 2: Model Inference with Gemini Flash 2.0 (or Resilient Fallback)
  const reply = await generateChatReply({
    message,
    intent: guard.intent,
    contextData,
    language: guard.detectedLanguage,
  });

  // 6. Persist to Supabase
  await saveChatMessage(sessionId, 'user', message, guard.intent);
  await saveChatMessage(sessionId, 'assistant', reply, guard.intent);

  return NextResponse.json({
    ok: true,
    reply,
    intent: guard.intent,
    sessionId,
    quickReplies: getQuickReplies(guard.detectedLanguage),
  });
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const sessionId = searchParams.get('sessionId');

  if (!sessionId) {
    return NextResponse.json({ ok: false, error: 'Thiếu sessionId' }, { status: 400 });
  }

  const messages = await listChatMessages(sessionId);
  return NextResponse.json({
    ok: true,
    messages: messages.map((m) => ({
      id: m.id,
      sender: m.sender,
      content: m.content,
      intent: m.intent,
      createdAt: m.created_at,
    })),
  });
}
