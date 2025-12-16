"use client";

import { memo } from "react";
import { Button } from "@/components/ui/button";
import { Upload, FolderUp, FolderPlus, RefreshCw, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { FileTree } from "./FileTree";
import type { TreeNode } from "../types";
import type { SandboxStatus } from "../hooks/useSandboxConnection";

interface FilesPanelProps {
	fileTree: TreeNode[];
	filesLoading: boolean;
	uploadingFiles: boolean;
	isDraggingOver: boolean;
	expandedFolders: Set<string>;
	sandboxStatus: SandboxStatus;
	fileInputRef: React.RefObject<HTMLInputElement | null>;
	folderInputRef: React.RefObject<HTMLInputElement | null>;
	onUploadFiles: (files: FileList | File[]) => Promise<void>;
	onCreateFolder: () => Promise<void>;
	onFetchFiles: () => Promise<void>;
	onToggleFolder: (path: string) => void;
	onDownloadFile: (path: string) => void;
	onDeleteFile: (path: string, type: "file" | "directory") => Promise<void>;
	onDragOver: (e: React.DragEvent) => void;
	onDragLeave: (e: React.DragEvent) => void;
	onDrop: (e: React.DragEvent) => Promise<void>;
}

export const FilesPanel = memo(function FilesPanel({
	fileTree,
	filesLoading,
	uploadingFiles,
	isDraggingOver,
	expandedFolders,
	sandboxStatus,
	fileInputRef,
	folderInputRef,
	onUploadFiles,
	onCreateFolder,
	onFetchFiles,
	onToggleFolder,
	onDownloadFile,
	onDeleteFile,
	onDragOver,
	onDragLeave,
	onDrop,
}: FilesPanelProps) {
	return (
		<div className="space-y-3">
			{/* Toolbar */}
			<div className="flex items-center gap-2">
				<input
					type="file"
					ref={fileInputRef}
					className="hidden"
					multiple
					onChange={(e) => {
						if (e.target.files) {
							onUploadFiles(e.target.files);
							e.target.value = "";
						}
					}}
				/>
				<input
					type="file"
					ref={folderInputRef}
					className="hidden"
					// @ts-expect-error webkitdirectory is not in the types
					webkitdirectory=""
					directory=""
					multiple
					onChange={(e) => {
						if (e.target.files) {
							onUploadFiles(e.target.files);
							e.target.value = "";
						}
					}}
				/>
				<Button
					variant="outline"
					size="sm"
					className="h-7 text-xs"
					onClick={() => fileInputRef.current?.click()}
					disabled={uploadingFiles || sandboxStatus !== "connected"}
				>
					<Upload className="h-3.5 w-3.5 mr-1" />
					Files
				</Button>
				<Button
					variant="outline"
					size="sm"
					className="h-7 text-xs"
					onClick={() => folderInputRef.current?.click()}
					disabled={uploadingFiles || sandboxStatus !== "connected"}
				>
					<FolderUp className="h-3.5 w-3.5 mr-1" />
					Folder
				</Button>
				<Button
					variant="outline"
					size="sm"
					className="h-7 text-xs"
					onClick={onCreateFolder}
					disabled={uploadingFiles || sandboxStatus !== "connected"}
				>
					<FolderPlus className="h-3.5 w-3.5 mr-1" />
					New
				</Button>
				<div className="flex-1" />
				<Button
					variant="ghost"
					size="smallIcon"
					icon={
						filesLoading ? (
							<Loader2 className="h-3.5 w-3.5 animate-spin" />
						) : (
							<RefreshCw className="h-3.5 w-3.5" />
						)
					}
					className="h-7 w-7 text-gray-400 hover:text-gray-700"
					onClick={onFetchFiles}
					disabled={filesLoading || sandboxStatus !== "connected"}
					aria-label="Refresh files"
				/>
			</div>

			{/* Drop zone / file tree */}
			<div
				className={cn(
					"min-h-[200px] rounded-lg border-2 border-dashed transition-colors",
					isDraggingOver
						? "border-burgundy-400 bg-burgundy-50"
						: "border-gray-200 bg-gray-50/50",
					uploadingFiles && "opacity-50 pointer-events-none"
				)}
				onDragOver={onDragOver}
				onDragLeave={onDragLeave}
				onDrop={onDrop}
			>
				{filesLoading && fileTree.length === 0 ? (
					<div className="flex items-center justify-center h-[200px]">
						<Loader2 className="h-5 w-5 animate-spin text-gray-400" />
					</div>
				) : fileTree.length === 0 ? (
					<div className="flex flex-col items-center justify-center h-[200px] text-center px-4">
						<Upload className="h-8 w-8 text-gray-300 mb-2" />
						<p className="text-sm text-gray-500 mb-1">
							Drop files here or use the buttons above
						</p>
						<p className="text-xs text-gray-400">
							Files sync with your project workspace
						</p>
					</div>
				) : (
					<FileTree
						nodes={fileTree}
						expandedFolders={expandedFolders}
						onToggle={onToggleFolder}
						onDownload={onDownloadFile}
						onDelete={onDeleteFile}
					/>
				)}

				{uploadingFiles && (
					<div className="flex items-center justify-center py-4">
						<Loader2 className="h-4 w-4 animate-spin text-burgundy-500 mr-2" />
						<span className="text-sm text-gray-600">Uploading…</span>
					</div>
				)}
			</div>
		</div>
	);
});
