"use client";

import { memo, useState, useMemo, useEffect } from "react";
import { FileText, Loader2, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";

interface PreviewPanelProps {
	previewUrl: string | null;
	isLoadingPreview: boolean;
	className?: string;
}

export const PreviewPanel = memo(function PreviewPanel({
	previewUrl,
	isLoadingPreview,
	className,
}: PreviewPanelProps) {
	const [previewEndpoint, setPreviewEndpoint] = useState<"/" | "/s/preview">("/");
	const [iframeKey, setIframeKey] = useState(0);

	// Reset to default endpoint when previewUrl changes
	useEffect(() => {
		setPreviewEndpoint("/");
		setIframeKey(0);
	}, [previewUrl]);

	// Force iframe reload when endpoint changes
	useEffect(() => {
		setIframeKey((prev) => prev + 1);
	}, [previewEndpoint]);

	const handleRefresh = () => {
		setIframeKey((prev) => prev + 1);
	};

	const iframeUrl = useMemo(() => {
		if (!previewUrl) return null;
		const baseUrl = previewUrl.replace(/\/$/, ""); // Remove trailing slash if present
		if (previewEndpoint === "/") {
			return baseUrl;
		}
		return `${baseUrl}${previewEndpoint}`;
	}, [previewUrl, previewEndpoint]);

	return (
		<div className={cn("flex-1 flex flex-col", className)}>
			{iframeUrl && (
				<div className="h-10 px-4 border-b border-gray-200 flex items-center justify-end bg-gray-50">
					{/* <div className="flex bg-gray-200 rounded-lg p-0.5 gap-0.5">
						{[
							{ label: "Questionnaire", value: "/" as const },
							{ label: "Survey", value: "/s/preview" as const },
						].map((tab) => (
							<button
								key={tab.value}
								type="button"
								onClick={() => setPreviewEndpoint(tab.value)}
								className={cn(
									"px-3 py-1 text-xs font-medium rounded-md transition-all",
									previewEndpoint === tab.value
										? "bg-white text-gray-900 shadow-sm"
										: "text-gray-500 hover:text-gray-700"
								)}
							>
								{tab.label}
							</button>
						))}
					</div> */}
					<div className="flex items-center justify-end gap-3">
						<button
							type="button"
							onClick={handleRefresh}
							className="text-xs text-gray-500 hover:text-gray-700 flex items-center gap-1.5 transition-colors"
							title="Refresh preview"
						>
							<RefreshCw className="h-3.5 w-3.5" />
							Refresh
						</button>
						{/* <a
							href={iframeUrl || previewUrl}
							target="_blank"
							rel="noopener noreferrer"
							className="text-xs text-gray-500 hover:text-gray-700"
						>
							Open in new tab ↗
						</a> */}
					</div>
				</div>
			)}
			<div className="flex-1 bg-gray-50 relative">
				{isLoadingPreview ? (
					<div className="absolute inset-0 flex items-center justify-center">
						<div className="text-center">
							<Loader2 className="h-8 w-8 animate-spin text-gray-400 mx-auto mb-3" />
							<p className="text-sm text-gray-500">
								Starting preview server...
							</p>
						</div>
					</div>
				) : iframeUrl ? (
					<iframe
						key={iframeKey}
						src={iframeUrl}
						className="w-full h-full border-0"
						title="Preview"
						sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-modals"
					/>
				) : (
					<div className="absolute inset-0 flex items-center justify-center">
						<div className="text-center max-w-xs">
							<div className="w-12 h-12 mx-auto mb-4 rounded-full bg-gray-100 flex items-center justify-center">
								<FileText className="h-6 w-6 text-gray-400" />
							</div>
							<h3 className="text-sm font-medium text-gray-900 mb-1">
								No preview available
							</h3>
							<p className="text-sm text-gray-500">
								The preview server is not running yet.
							</p>
						</div>
					</div>
				)}
			</div>
			{iframeUrl && (
				<div className="h-10 px-3 border-t border-gray-200 flex items-center gap-2 bg-gray-50">
					<div className="flex-1 px-3 py-1.5 bg-white border border-gray-200 rounded text-xs text-gray-600 truncate">
						{iframeUrl}
					</div>
					<a
						href={iframeUrl}
						target="_blank"
						rel="noopener noreferrer"
						className="text-xs text-gray-600 hover:text-gray-900 font-medium whitespace-nowrap"
					>
						Open in new tab ↗
					</a>
				</div>
			)}
		</div>
	);
});
