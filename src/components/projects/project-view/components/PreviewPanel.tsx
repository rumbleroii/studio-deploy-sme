"use client";

import { memo } from "react";
import { FileText, Loader2 } from "lucide-react";
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
	return (
		<div className={cn("flex-1 flex flex-col", className)}>
			{previewUrl && (
				<div className="h-10 px-4 border-b border-gray-200 flex items-center justify-end bg-gray-50">
					<a
						href={previewUrl}
						target="_blank"
						rel="noopener noreferrer"
						className="text-xs text-gray-500 hover:text-gray-700"
					>
						Open in new tab ↗
					</a>
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
				) : previewUrl ? (
					<iframe
						src={previewUrl}
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
			{previewUrl && (
				<div className="h-10 px-3 border-t border-gray-200 flex items-center bg-gray-50">
					<div className="flex-1 px-3 py-1.5 bg-white border border-gray-200 rounded text-xs text-gray-600 truncate">
						{previewUrl}
					</div>
				</div>
			)}
		</div>
	);
});
