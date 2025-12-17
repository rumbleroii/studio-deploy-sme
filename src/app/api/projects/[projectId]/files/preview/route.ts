import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import mammoth from "mammoth";
import JSZip from "jszip";
import * as XLSX from "xlsx";

export const runtime = "nodejs";

const MAX_PREVIEW_BYTES = 8 * 1024 * 1024; // 8MB
const MAX_TABLE_ROWS = 200;
const MAX_TABLE_COLS = 50;
const MAX_TEXT_CHARS = 400_000;

function getExt(path: string): string {
	const name = path.split("/").pop() || path;
	const idx = name.lastIndexOf(".");
	if (idx === -1) return "";
	return name.slice(idx + 1).toLowerCase();
}

function toDataUrl(mime: string, bytes: Uint8Array): string {
	const b64 = Buffer.from(bytes).toString("base64");
	return `data:${mime};base64,${b64}`;
}

function truncateText(text: string): { text: string; truncated: boolean } {
	if (text.length <= MAX_TEXT_CHARS) return { text, truncated: false };
	return { text: text.slice(0, MAX_TEXT_CHARS), truncated: true };
}

export async function GET(
	request: NextRequest,
	props: { params: Promise<{ projectId: string }> }
) {
	const params = await props.params;
	try {
		const user = await requireAuth();
		const { projectId } = params;

		const project = await prisma.project.findUnique({
			where: { id: projectId },
			select: { createdById: true },
		});

		if (!project || project.createdById !== user.id) {
			return new NextResponse("Not Found", { status: 404 });
		}

		const workerUrl = process.env.AGENT_WORKER_URL;
		const sharedSecret = process.env.AGENT_WORKER_SHARED_SECRET;

		if (!workerUrl || !sharedSecret) {
			console.error("Missing worker config");
			return new NextResponse("Internal Server Error", { status: 500 });
		}

		const url = new URL(request.url);
		const filePath = url.searchParams.get("path");
		const requestedSheet = url.searchParams.get("sheet");

		if (!filePath) {
			return new NextResponse("Path parameter required", { status: 400 });
		}

		const response = await fetch(
			`${workerUrl}/v1/projects/${projectId}/files/download?path=${encodeURIComponent(
				filePath
			)}`,
			{
				method: "GET",
				headers: {
					"X-Shared-Secret": sharedSecret,
				},
			}
		);

		if (!response.ok) {
			const errorText = await response.text();
			console.error(
				"Worker files download failed:",
				response.status,
				errorText
			);
			return new NextResponse("Worker Error", { status: 502 });
		}

		const arrayBuffer = await response.arrayBuffer();
		if (arrayBuffer.byteLength > MAX_PREVIEW_BYTES) {
			return NextResponse.json({
				kind: "too_large",
				path: filePath,
				sizeBytes: arrayBuffer.byteLength,
				maxBytes: MAX_PREVIEW_BYTES,
			});
		}

		const ext = getExt(filePath);
		const contentType =
			response.headers.get("Content-Type") || "application/octet-stream";
		const buf = Buffer.from(arrayBuffer);

		// Text-based previews
		if (
			ext === "txt" ||
			ext === "md" ||
			ext === "markdown" ||
			ext === "html" ||
			ext === "htm"
		) {
			const raw = buf.toString("utf8");
			const { text, truncated } = truncateText(raw);
			return NextResponse.json({
				kind:
					ext === "md" || ext === "markdown"
						? "markdown"
						: ext === "html" || ext === "htm"
						? "html"
						: "text",
				path: filePath,
				contentType,
				text,
				truncated,
			});
		}

		// DOCX (Word)
		if (ext === "docx") {
			const [htmlResult, textResult] = await Promise.allSettled([
				mammoth.convertToHtml({ buffer: buf }),
				mammoth.extractRawText({ buffer: buf }),
			]);

			const html =
				htmlResult.status === "fulfilled" ? htmlResult.value.value : "";
			const rawText =
				textResult.status === "fulfilled" ? textResult.value.value : "";

			const { text, truncated } = truncateText(rawText || "");

			return NextResponse.json({
				kind: "docx",
				path: filePath,
				contentType,
				html,
				text,
				truncated,
			});
		}

		// XLS/XLSX (Excel)
		if (ext === "xls" || ext === "xlsx") {
			const workbook = XLSX.read(buf, { type: "buffer" });
			const sheetNames = workbook.SheetNames || [];
			const activeSheetName =
				(requestedSheet && sheetNames.includes(requestedSheet)
					? requestedSheet
					: sheetNames[0]) || null;

			if (!activeSheetName) {
				return NextResponse.json({
					kind: "spreadsheet",
					path: filePath,
					contentType,
					sheetNames: [],
					activeSheetName: null,
					rows: [],
					truncated: false,
					totalRows: 0,
					totalCols: 0,
				});
			}

			const worksheet = workbook.Sheets[activeSheetName];
			const data = XLSX.utils.sheet_to_json(worksheet, {
				header: 1,
				blankrows: false,
				defval: "",
			}) as unknown as unknown[][];

			const totalRows = data.length;
			const totalCols = data.reduce(
				(max, row) => Math.max(max, Array.isArray(row) ? row.length : 0),
				0
			);
			const truncated =
				totalRows > MAX_TABLE_ROWS || totalCols > MAX_TABLE_COLS;

			const rows = data.slice(0, MAX_TABLE_ROWS).map((row) => {
				const r = Array.isArray(row) ? row : [];
				return r.slice(0, MAX_TABLE_COLS).map((cell) => {
					if (cell === null || cell === undefined) return "";
					return typeof cell === "string" ? cell : String(cell);
				});
			});

			return NextResponse.json({
				kind: "spreadsheet",
				path: filePath,
				contentType,
				sheetNames,
				activeSheetName,
				rows,
				truncated,
				totalRows,
				totalCols,
			});
		}

		// PPTX (PowerPoint) - show thumbnail + slide count when possible
		if (ext === "pptx") {
			const zip = await JSZip.loadAsync(buf);
			const entries = Object.keys(zip.files);

			const slideCount = entries.filter((p) =>
				/^ppt\/slides\/slide\d+\.xml$/i.test(p)
			).length;

			const thumbPath =
				entries.find((p) => p.toLowerCase() === "docprops/thumbnail.jpeg") ||
				entries.find((p) => p.toLowerCase() === "docprops/thumbnail.jpg") ||
				entries.find((p) => p.toLowerCase() === "docprops/thumbnail.png") ||
				null;

			let thumbnailDataUrl: string | null = null;
			if (thumbPath) {
				const bytes = await zip.file(thumbPath)!.async("uint8array");
				const mime = thumbPath.toLowerCase().endsWith(".png")
					? "image/png"
					: "image/jpeg";
				thumbnailDataUrl = toDataUrl(mime, bytes);
			}

			return NextResponse.json({
				kind: "pptx",
				path: filePath,
				contentType,
				slideCount,
				thumbnailDataUrl,
			});
		}

		// Legacy Office formats (.doc/.ppt) are not reliably previewable without a converter
		if (ext === "doc" || ext === "ppt") {
			return NextResponse.json({
				kind: "unsupported",
				path: filePath,
				contentType,
				reason: "legacy_office_format",
			});
		}

		return NextResponse.json({
			kind: "unsupported",
			path: filePath,
			contentType,
			reason: "unsupported_file_type",
		});
	} catch (error) {
		console.error("Files preview error:", error);
		return new NextResponse("Internal Server Error", { status: 500 });
	}
}
