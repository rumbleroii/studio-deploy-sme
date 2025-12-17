"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
	Download,
	ExternalLink,
	FileCode2,
	FileSpreadsheet,
	FileText,
	FileType,
	Loader2,
	Presentation,
	X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { MarkdownMessage } from "./MarkdownMessage";

type FilePreviewResponse =
	| {
			kind: "text" | "markdown" | "html";
			path: string;
			contentType: string;
			text: string;
			truncated: boolean;
	  }
	| {
			kind: "docx";
			path: string;
			contentType: string;
			html: string;
			text: string;
			truncated: boolean;
	  }
	| {
			kind: "spreadsheet";
			path: string;
			contentType: string;
			sheetNames: string[];
			activeSheetName: string | null;
			rows: string[][];
			truncated: boolean;
			totalRows: number;
			totalCols: number;
	  }
	| {
			kind: "pptx";
			path: string;
			contentType: string;
			slideCount: number;
			thumbnailDataUrl: string | null;
	  }
	| {
			kind: "too_large";
			path: string;
			sizeBytes: number;
			maxBytes: number;
	  }
	| {
			kind: "unsupported";
			path: string;
			contentType: string;
			reason: string;
	  };

interface FilePreviewProps {
	projectId: string;
	path: string;
	onClose: () => void;
	onDownload: (path: string) => void;
}

function getExt(path: string): string {
	const name = path.split("/").pop() || path;
	const idx = name.lastIndexOf(".");
	if (idx === -1) return "";
	return name.slice(idx + 1).toLowerCase();
}

function formatSize(bytes: number): string {
	if (!Number.isFinite(bytes) || bytes <= 0) return "0 B";
	const units = ["B", "KB", "MB", "GB"];
	let size = bytes;
	let unitIndex = 0;
	while (size >= 1024 && unitIndex < units.length - 1) {
		size /= 1024;
		unitIndex++;
	}
	return `${size.toFixed(unitIndex > 0 ? 1 : 0)} ${units[unitIndex]}`;
}

function buildHtmlDoc(bodyHtml: string, title: string) {
	const safeTitle = title.replaceAll("<", "&lt;").replaceAll(">", "&gt;");
	return `<!doctype html>
<html>
	<head>
		<meta charset="utf-8" />
		<meta name="viewport" content="width=device-width, initial-scale=1" />
		<title>${safeTitle}</title>
		<style>
			:root { color-scheme: light; }
			body { margin: 0; padding: 24px; font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, "Apple Color Emoji", "Segoe UI Emoji"; color: #111827; }
			h1,h2,h3 { margin: 1.2em 0 0.6em; }
			p { margin: 0.75em 0; line-height: 1.65; }
			code, pre { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace; }
			pre { padding: 12px; background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; overflow: auto; }
			table { border-collapse: collapse; width: 100%; }
			td, th { border: 1px solid #e5e7eb; padding: 6px 8px; vertical-align: top; }
			th { background: #f9fafb; text-align: left; }
			img { max-width: 100%; height: auto; }
			a { color: #7f1d1d; }
			blockquote { margin: 1em 0; padding-left: 12px; border-left: 2px solid #e5e7eb; color: #374151; }
		</style>
	</head>
	<body>${bodyHtml}</body>
</html>`;
}

export function FilePreview({
	projectId,
	path,
	onClose,
	onDownload,
}: FilePreviewProps) {
	const [data, setData] = useState<FilePreviewResponse | null>(null);
	const [error, setError] = useState<string | null>(null);
	const [loading, setLoading] = useState(false);
	const [selectedSheet, setSelectedSheet] = useState<string | null>(null);
	const abortRef = useRef<AbortController | null>(null);

	const fileName = useMemo(() => path.split("/").pop() || path, [path]);
	const ext = useMemo(() => getExt(path), [path]);
	const openUrl = useMemo(
		() =>
			`/api/projects/${projectId}/files/download?path=${encodeURIComponent(
				path
			)}`,
		[projectId, path]
	);

	useEffect(() => {
		abortRef.current?.abort();
		const controller = new AbortController();
		abortRef.current = controller;

		setLoading(true);
		setError(null);

		const sheetParam =
			selectedSheet && (ext === "xls" || ext === "xlsx")
				? `&sheet=${encodeURIComponent(selectedSheet)}`
				: "";

		void (async () => {
			try {
				const res = await fetch(
					`/api/projects/${projectId}/files/preview?path=${encodeURIComponent(
						path
					)}${sheetParam}`,
					{ signal: controller.signal }
				);
				if (!res.ok) throw new Error(`Preview failed: ${res.status}`);

				const json = (await res.json()) as FilePreviewResponse;
				if (controller.signal.aborted) return;

				setData(json);
				setError(null);

				if (json.kind === "spreadsheet") {
					setSelectedSheet((prev) => prev ?? json.activeSheetName);
				}
			} catch (e) {
				if (controller.signal.aborted) return;
				setData(null);
				setError(e instanceof Error ? e.message : "Failed to load preview");
			} finally {
				if (!controller.signal.aborted) setLoading(false);
			}
		})();

		return () => controller.abort();
	}, [projectId, path, selectedSheet, ext]);

	return (
		<div className="flex flex-col h-full bg-white border border-gray-200 rounded-lg overflow-hidden">
			<div className="h-10 px-3 border-b border-gray-200 flex items-center gap-2 bg-gray-50">
				<div className="min-w-0 flex-1 flex items-center gap-2">
					<div className="h-6 w-6 rounded bg-white border border-gray-200 flex items-center justify-center shrink-0">
						{ext === "xls" || ext === "xlsx" ? (
							<FileSpreadsheet className="h-4 w-4 text-gray-500" />
						) : ext === "md" || ext === "markdown" ? (
							<FileType className="h-4 w-4 text-gray-500" />
						) : ext === "html" || ext === "htm" ? (
							<FileCode2 className="h-4 w-4 text-gray-500" />
						) : ext === "pptx" || ext === "ppt" ? (
							<Presentation className="h-4 w-4 text-gray-500" />
						) : (
							<FileText className="h-4 w-4 text-gray-500" />
						)}
					</div>
					<div className="min-w-0">
						<div className="text-xs font-medium text-gray-900 truncate">
							{fileName}
						</div>
						<div className="text-[10px] text-gray-500 truncate">{path}</div>
					</div>
				</div>

				<div className="flex items-center gap-1 shrink-0">
					<a
						href={openUrl}
						target="_blank"
						rel="noopener noreferrer"
						className="hidden sm:inline-flex"
					>
						<Button
							variant="ghost"
							size="smallIcon"
							icon={<ExternalLink className="h-3.5 w-3.5" />}
							className="h-7 w-7 text-gray-500 hover:text-gray-800"
							aria-label="Open original file"
						/>
					</a>
					<Button
						variant="ghost"
						size="smallIcon"
						icon={<Download className="h-3.5 w-3.5" />}
						className="h-7 w-7 text-gray-500 hover:text-gray-800"
						aria-label="Download file"
						onClick={() => onDownload(path)}
					/>
					<Button
						variant="ghost"
						size="smallIcon"
						icon={<X className="h-3.5 w-3.5" />}
						className="h-7 w-7 text-gray-500 hover:text-gray-800"
						aria-label="Back to folder"
						onClick={onClose}
					/>
				</div>
			</div>

			<div className="flex-1 bg-gray-50 relative">
				{loading ? (
					<div className="absolute inset-0 flex items-center justify-center">
						<div className="text-center">
							<Loader2 className="h-8 w-8 animate-spin text-gray-400 mx-auto mb-3" />
							<p className="text-sm text-gray-500">Loading preview…</p>
						</div>
					</div>
				) : error ? (
					<div className="absolute inset-0 flex items-center justify-center">
						<div className="text-center max-w-sm px-4">
							<div className="w-12 h-12 mx-auto mb-4 rounded-full bg-gray-100 flex items-center justify-center">
								<FileText className="h-6 w-6 text-gray-400" />
							</div>
							<h3 className="text-sm font-medium text-gray-900 mb-1">
								Preview failed
							</h3>
							<p className="text-sm text-gray-500 mb-3">{error}</p>
							<Button
								variant="outline"
								size="sm"
								className="h-8 text-xs"
								onClick={() => onDownload(path)}
							>
								Download
							</Button>
						</div>
					</div>
				) : !data ? (
					<div className="absolute inset-0 flex items-center justify-center">
						<div className="text-center max-w-xs">
							<div className="w-12 h-12 mx-auto mb-4 rounded-full bg-gray-100 flex items-center justify-center">
								<FileText className="h-6 w-6 text-gray-400" />
							</div>
							<h3 className="text-sm font-medium text-gray-900 mb-1">
								No preview available
							</h3>
							<p className="text-sm text-gray-500">
								This file type can’t be previewed yet.
							</p>
						</div>
					</div>
				) : data.kind === "too_large" ? (
					<div className="absolute inset-0 flex items-center justify-center">
						<div className="text-center max-w-sm px-4">
							<div className="w-12 h-12 mx-auto mb-4 rounded-full bg-gray-100 flex items-center justify-center">
								<FileText className="h-6 w-6 text-gray-400" />
							</div>
							<h3 className="text-sm font-medium text-gray-900 mb-1">
								File too large to preview
							</h3>
							<p className="text-sm text-gray-500 mb-3">
								{formatSize(data.sizeBytes)} (max preview{" "}
								{formatSize(data.maxBytes)})
							</p>
							<Button
								variant="outline"
								size="sm"
								className="h-8 text-xs"
								onClick={() => onDownload(path)}
							>
								Download
							</Button>
						</div>
					</div>
				) : data.kind === "unsupported" ? (
					<div className="absolute inset-0 flex items-center justify-center">
						<div className="text-center max-w-sm px-4">
							<div className="w-12 h-12 mx-auto mb-4 rounded-full bg-gray-100 flex items-center justify-center">
								<FileText className="h-6 w-6 text-gray-400" />
							</div>
							<h3 className="text-sm font-medium text-gray-900 mb-1">
								No preview available
							</h3>
							<p className="text-sm text-gray-500 mb-3">
								{data.reason === "legacy_office_format"
									? "Legacy Office formats (.doc/.ppt) aren’t supported for preview."
									: "This file type isn’t supported for preview."}
							</p>
							<Button
								variant="outline"
								size="sm"
								className="h-8 text-xs"
								onClick={() => onDownload(path)}
							>
								Download
							</Button>
						</div>
					</div>
				) : data.kind === "markdown" ? (
					<ScrollArea className="h-full">
						<div className="p-4 bg-white">
							<MarkdownMessage content={data.text} />
							{data.truncated && (
								<p className="mt-4 text-xs text-gray-500">Preview truncated.</p>
							)}
						</div>
					</ScrollArea>
				) : data.kind === "text" ? (
					<ScrollArea className="h-full">
						<div className="p-4 bg-white">
							<pre className="whitespace-pre-wrap break-words text-xs leading-5 font-mono text-gray-900">
								{data.text}
							</pre>
							{data.truncated && (
								<p className="mt-4 text-xs text-gray-500">Preview truncated.</p>
							)}
						</div>
					</ScrollArea>
				) : data.kind === "html" ? (
					<iframe
						srcDoc={buildHtmlDoc(data.text, fileName)}
						className="w-full h-full border-0 bg-white"
						title="HTML Preview"
						sandbox=""
						referrerPolicy="no-referrer"
					/>
				) : data.kind === "docx" ? (
					<iframe
						srcDoc={buildHtmlDoc(
							data.html || `<pre>${data.text}</pre>`,
							fileName
						)}
						className="w-full h-full border-0 bg-white"
						title="DOCX Preview"
						sandbox=""
						referrerPolicy="no-referrer"
					/>
				) : data.kind === "pptx" ? (
					<div className="h-full w-full bg-white flex flex-col items-center justify-center p-6 text-center">
						{data.thumbnailDataUrl ? (
							<img
								src={data.thumbnailDataUrl}
								alt="PowerPoint thumbnail"
								className="max-h-[60%] max-w-full rounded-lg border border-gray-200 shadow-sm mb-4"
							/>
						) : (
							<div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-4">
								<Presentation className="h-8 w-8 text-gray-400" />
							</div>
						)}
						<div className="text-sm font-medium text-gray-900">
							PowerPoint deck
						</div>
						<div className="text-sm text-gray-500">
							{data.slideCount} slide{data.slideCount === 1 ? "" : "s"}
						</div>
					</div>
				) : data.kind === "spreadsheet" ? (
					<div className="h-full w-full bg-white flex flex-col">
						<div className="h-10 px-3 border-b border-gray-200 flex items-center gap-2 bg-white">
							<div className="text-xs text-gray-600">Sheet</div>
							<Select
								value={
									data.activeSheetName && data.sheetNames.length > 0
										? selectedSheet ?? data.activeSheetName
										: undefined
								}
								onValueChange={(v) => setSelectedSheet(v)}
								disabled={data.sheetNames.length <= 1}
							>
								<SelectTrigger className="h-8 w-[240px] text-xs">
									<SelectValue placeholder="Select sheet" />
								</SelectTrigger>
								<SelectContent>
									{data.sheetNames.map((name) => (
										<SelectItem key={name} value={name}>
											{name}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
							<div className="ml-auto text-[10px] text-gray-500">
								Showing {Math.min(200, data.totalRows)}×
								{Math.min(50, data.totalCols)}
								{data.truncated ? " (truncated)" : ""}
							</div>
						</div>
						<div className="flex-1 overflow-auto">
							<table className="min-w-full border-collapse text-xs">
								<tbody>
									{data.rows.length === 0 ? (
										<tr>
											<td className="p-4 text-sm text-gray-500">No data</td>
										</tr>
									) : (
										data.rows.map((row, rIdx) => (
											<tr key={rIdx}>
												{row.map((cell, cIdx) => (
													<td
														key={cIdx}
														className="border border-gray-200 px-2 py-1 align-top whitespace-pre-wrap break-words max-w-[280px]"
													>
														{cell}
													</td>
												))}
											</tr>
										))
									)}
								</tbody>
							</table>
						</div>
					</div>
				) : null}
			</div>
		</div>
	);
}
