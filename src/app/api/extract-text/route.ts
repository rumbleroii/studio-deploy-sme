import { NextResponse } from "next/server";
import mammoth from "mammoth";
import TurndownService from "turndown";

export const runtime = "nodejs";

// Configure turndown for clean markdown output
const turndown = new TurndownService({
  headingStyle: "atx",
  bulletListMarker: "-",
  codeBlockStyle: "fenced",
});

// Keep tables as HTML (turndown doesn't handle them well by default)
turndown.keep(["table", "thead", "tbody", "tr", "th", "td"]);

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    let text = "";

    if (file.type === "application/pdf") {
      // PDF: Extract raw text (PDFs don't have semantic structure)
      const pdfParse = (await import("pdf-parse")).default;
      const pdfData = await pdfParse(buffer);
      text = pdfData.text;
      
      // Clean up PDF text
      text = text
        .replace(/\r\n/g, "\n")
        .replace(/\n{3,}/g, "\n\n")
        .trim();
    } else if (
      file.type ===
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    ) {
      // DOCX: Convert to HTML first (preserves structure), then to Markdown
      const result = await mammoth.convertToHtml({ buffer });
      
      if (result.messages.length > 0) {
        console.log("Mammoth conversion messages:", result.messages);
      }
      
      // Convert HTML to Markdown (preserves headings, lists, bold, italic, etc.)
      text = turndown.turndown(result.value);
      
      // Clean up markdown
      text = text
        .replace(/\n{3,}/g, "\n\n")
        .trim();
    } else {
      return NextResponse.json(
        { error: "Unsupported file type. Please upload PDF or DOCX." },
        { status: 400 }
      );
    }

    return NextResponse.json({ text });
  } catch (error) {
    console.error("Text extraction failed:", error);
    return NextResponse.json(
      { error: "Failed to extract text from file" },
      { status: 500 }
    );
  }
}

