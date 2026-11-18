import { NextResponse } from 'next/server';
import { getCurrentAdmin } from '@/lib/admin/auth';
import { CopilotChatRequestSchema } from '@/lib/admin/analytics-schema';
import { generateCopilotChatReply } from '@/lib/admin/copilot-client';
import { COPILOT_TOOL_DECLARATIONS } from '@/lib/admin/copilot-tools';

export async function POST(request: Request) {
  // 1. Strict Layer: Administrator Session Verification
  try {
    const admin = await getCurrentAdmin();
    if (!admin) {
      return NextResponse.json(
        { ok: false, error: 'Truy cập bị từ chối: Yêu cầu quyền quản trị viên' },
        { status: 403 },
      );
    }
  } catch (authError) {
    console.error('[Admin Chat API] Auth check failed:', authError);
    return NextResponse.json(
      { ok: false, error: 'Truy cập bị từ chối: Yêu cầu quyền quản trị viên' },
      { status: 403 },
    );
  }

  // 2. Parse and Validate Request Payload
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'JSON không hợp lệ' }, { status: 400 });
  }

  const parsed = CopilotChatRequestSchema.safeParse(body);
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

  // 3. Multi-turn Tool Calling Execution with Gemini 2.0 Flash (or resilient fallback)
  try {
    const result = await generateCopilotChatReply({
      message: parsed.data.message,
      history: parsed.data.history,
      referenceDate: parsed.data.referenceDate,
    });

    return NextResponse.json({
      ok: true,
      reply: result.reply,
      toolsUsed: result.toolsUsed,
      turns: result.turns,
    });
  } catch (error) {
    console.error('[Admin Chat API] Execution failed:', error);
    return NextResponse.json(
      { ok: false, error: 'Đã xảy ra lỗi khi xử lý câu hỏi phân tích' },
      { status: 500 },
    );
  }
}

export async function GET() {
  try {
    const admin = await getCurrentAdmin();
    if (!admin) {
      return NextResponse.json(
        { ok: false, error: 'Truy cập bị từ chối: Yêu cầu quyền quản trị viên' },
        { status: 403 },
      );
    }
  } catch {
    return NextResponse.json(
      { ok: false, error: 'Truy cập bị từ chối: Yêu cầu quyền quản trị viên' },
      { status: 403 },
    );
  }

  return NextResponse.json({
    ok: true,
    status: 'active',
    availableTools: COPILOT_TOOL_DECLARATIONS.map((t) => ({
      name: t.name,
      description: t.description,
    })),
  });
}
