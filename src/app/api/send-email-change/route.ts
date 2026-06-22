import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  const { current_email, new_email, token } = await request.json();
  if (!current_email || !new_email || !token) {
    return NextResponse.json({ error: "Campos obrigatórios faltando" }, { status: 400 });
  }

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.warn("RESEND_API_KEY não configurada — email não enviado.");
    return NextResponse.json({ success: true, message: "Modo dev: email não enviado" });
  }

  const origin = request.headers.get("origin") || "http://localhost:3000";
  const confirmLink = `${origin}/confirm-email-change?token=${token}`;

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "Secretaria Monetária <noreply@secretariamonetaria.com>",
        to: current_email,
        subject: "Confirme a alteração do seu email",
        html: `
          <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
            <h2>Alteração de email solicitada</h2>
            <p>Olá,</p>
            <p>Alguém solicitou a alteração do seu email para <strong>${new_email}</strong>.</p>
            <p>Se foi você, clique no link abaixo para confirmar:</p>
            <a href="${confirmLink}" style="display: inline-block; padding: 12px 24px; background: #6366f1; color: #fff; text-decoration: none; border-radius: 6px; margin: 16px 0;">
              Confirmar alteração
            </a>
            <p style="color: #666; font-size: 13px;">Se não foi você, ignore este email. Este link expira em 1 hora.</p>
            <hr style="margin: 24px 0; border: none; border-top: 1px solid #eee;" />
            <p style="color: #999; font-size: 12px;">Secretaria Monetária</p>
          </div>
        `,
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      console.error("Resend error:", err);
      return NextResponse.json({ error: "Falha ao enviar email" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Send email error:", err);
    return NextResponse.json({ error: "Erro ao enviar email" }, { status: 500 });
  }
}
