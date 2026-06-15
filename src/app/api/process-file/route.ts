import { NextRequest, NextResponse } from "next/server";
import pdfParse from "pdf-parse";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "Nenhum arquivo enviado" }, { status: 400 });
    }

    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      return NextResponse.json({ error: "Arquivo muito grande (máx. 10MB)" }, { status: 400 });
    }

    const mime = file.type;
    const name = file.name.toLowerCase();

    if (mime.startsWith("image/")) {
      const buffer = Buffer.from(await file.arrayBuffer());
      const base64 = buffer.toString("base64");
      return NextResponse.json({
        success: true,
        data: {
          type: "image",
          mimeType: mime,
          base64,
          fileName: file.name,
        },
      });
    }

    if (mime === "application/pdf" || name.endsWith(".pdf")) {
      const buffer = Buffer.from(await file.arrayBuffer());
      const pdfData = await pdfParse(buffer);
      return NextResponse.json({
        success: true,
        data: {
          type: "text",
          content: pdfData.text,
          fileName: file.name,
          pages: pdfData.numpages,
        },
      });
    }

    if (
      mime === "text/csv" ||
      mime === "text/plain" ||
      name.endsWith(".csv") ||
      name.endsWith(".txt")
    ) {
      const text = await file.text();
      return NextResponse.json({
        success: true,
        data: {
          type: "text",
          content: text,
          fileName: file.name,
        },
      });
    }

    return NextResponse.json(
      { error: `Tipo de arquivo não suportado: ${mime || name}` },
      { status: 400 }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro desconhecido";
    return NextResponse.json(
      { error: `Erro ao processar arquivo: ${message}` },
      { status: 500 }
    );
  }
}
