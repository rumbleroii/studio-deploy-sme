"use client";

import { memo, useCallback, useState } from "react";
import { Button } from "@/components/ui/button";
import {
	Upload,
	FolderUp,
	FolderPlus,
	RefreshCw,
	Loader2,
	Folder,
	File,
	Download,
	Trash2,
	ChevronRight,
	MoreVertical,
	FileText,
	FileImage,
	FileCode,
	FileSpreadsheet,
	FileArchive,
	Move,
} from "lucide-react";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { MoveFileDialog } from "./MoveFileDialog";
import type { TreeNode } from "../types";
import type { SandboxStatus } from "../hooks/useSandboxConnection";

interface FilesPanelProps {
	currentItems: TreeNode[];
	fileTree: TreeNode[];
	breadcrumbs: { name: string; path: string }[];
	filesLoading: boolean;
	uploadingFiles: boolean;
	isDraggingOver: boolean;
	sandboxStatus: SandboxStatus;
	fileInputRef: React.RefObject<HTMLInputElement | null>;
	folderInputRef: React.RefObject<HTMLInputElement | null>;
	onUploadFiles: (files: FileList | File[]) => Promise<void>;
	onCreateFolder: () => Promise<void>;
	onFetchFiles: () => Promise<void>;
	onNavigateToFolder: (path: string) => void;
	onDownloadFile: (path: string) => void;
	onDeleteFile: (path: string, type: "file" | "directory") => Promise<void>;
	onMoveFile: (sourcePath: string, destinationPath: string) => Promise<void>;
	onDragOver: (e: React.DragEvent) => void;
	onDragLeave: (e: React.DragEvent) => void;
	onDrop: (e: React.DragEvent) => Promise<void>;
}

// Get icon based on file extension
function getFileIcon(name: string) {
	const ext = name.split(".").pop()?.toLowerCase() || "";
	const imageExts = ["jpg", "jpeg", "png", "gif", "webp", "svg", "ico", "bmp"];
	const codeExts = [
		"js",
		"ts",
		"jsx",
		"tsx",
		"py",
		"rb",
		"go",
		"rs",
		"java",
		"c",
		"cpp",
		"h",
		"css",
		"scss",
		"html",
		"json",
		"xml",
		"yaml",
		"yml",
		"md",
		"sh",
		"bash",
	];
	const spreadsheetExts = ["csv", "xls", "xlsx", "ods"];
	const archiveExts = ["zip", "tar", "gz", "rar", "7z"];
	const docExts = ["pdf", "doc", "docx", "txt", "rtf", "odt"];

	if (imageExts.includes(ext)) return FileImage;
	if (codeExts.includes(ext)) return FileCode;
	if (spreadsheetExts.includes(ext)) return FileSpreadsheet;
	if (archiveExts.includes(ext)) return FileArchive;
	if (docExts.includes(ext)) return FileText;
	return File;
}

// Format file size
function formatSize(bytes?: number): string {
	if (bytes === undefined || bytes === 0) return "";
	const units = ["B", "KB", "MB", "GB"];
	let size = bytes;
	let unitIndex = 0;
	while (size >= 1024 && unitIndex < units.length - 1) {
		size /= 1024;
		unitIndex++;
	}
	return `${size.toFixed(unitIndex > 0 ? 1 : 0)} ${units[unitIndex]}`;
}

interface FileCardProps {
	node: TreeNode;
	onNavigate: (path: string) => void;
	onDownload: (path: string) => void;
	onDelete: (path: string, type: "file" | "directory") => void;
	onMoveClick: (path: string, name: string) => void;
}

const FileCard = memo(function FileCard({
	node,
	onNavigate,
	onDownload,
	onDelete,
	onMoveClick,
}: FileCardProps) {
	const isDir = node.type === "directory";
	const FileIcon = isDir ? Folder : getFileIcon(node.name);

	const handleClick = useCallback(() => {
		if (isDir) {
			onNavigate(node.path);
		}
	}, [isDir, node.path, onNavigate]);

	const handleDownload = useCallback(
		(e: React.MouseEvent) => {
			e.stopPropagation();
			onDownload(node.path);
		},
		[node.path, onDownload]
	);

	const handleMove = useCallback(
		(e: React.MouseEvent) => {
			e.stopPropagation();
			onMoveClick(node.path, node.name);
		},
		[node.path, node.name, onMoveClick]
	);

	const handleDelete = useCallback(
		(e: React.MouseEvent) => {
			e.stopPropagation();
			if (
				window.confirm(`Delete ${isDir ? "folder" : "file"} "${node.name}"?`)
			) {
				onDelete(node.path, node.type);
			}
		},
		[isDir, node.name, node.path, node.type, onDelete]
	);

	return (
		<div
			className={cn(
				"group relative flex flex-col items-center p-3 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 hover:border-gray-300 transition-colors",
				isDir && "cursor-pointer"
			)}
			onClick={handleClick}
		>
			{/* Menu button */}
			<DropdownMenu>
				<DropdownMenuTrigger asChild>
					<Button
						variant="ghost"
						size="smallIcon"
						icon={<MoreVertical className="h-3.5 w-3.5" />}
						className="absolute top-1 right-1 h-6 w-6 opacity-0 group-hover:opacity-100 text-gray-400 hover:text-gray-700"
						onClick={(e) => e.stopPropagation()}
						aria-label="File options"
					/>
				</DropdownMenuTrigger>
				<DropdownMenuContent align="end" className="w-36">
					{!isDir && (
						<DropdownMenuItem onClick={handleDownload}>
							<Download className="h-4 w-4 mr-2" />
							Download
						</DropdownMenuItem>
					)}
					<DropdownMenuItem onClick={handleMove}>
						<Move className="h-4 w-4 mr-2" />
						Move
					</DropdownMenuItem>
					<DropdownMenuItem
						onClick={handleDelete}
						className="text-red-600 focus:text-red-600"
					>
						<Trash2 className="h-4 w-4 mr-2" />
						Delete
					</DropdownMenuItem>
				</DropdownMenuContent>
			</DropdownMenu>

			{/* Icon */}
			<div
				className={cn(
					"w-12 h-12 flex items-center justify-center rounded-lg mb-2",
					isDir ? "bg-amber-50" : "bg-gray-50"
				)}
			>
				<FileIcon
					className={cn("h-6 w-6", isDir ? "text-amber-500" : "text-gray-400")}
				/>
			</div>

			{/* Name */}
			<span className="text-xs text-gray-700 text-center truncate w-full px-1">
				{node.name}
			</span>

			{/* Size (for files) */}
			{!isDir && node.size !== undefined && (
				<span className="text-[10px] text-gray-400 mt-0.5">
					{formatSize(node.size)}
				</span>
			)}
		</div>
	);
});

export const FilesPanel = memo(function FilesPanel({
	currentItems,
	fileTree,
	breadcrumbs,
	filesLoading,
	uploadingFiles,
	isDraggingOver,
	sandboxStatus,
	fileInputRef,
	folderInputRef,
	onUploadFiles,
	onCreateFolder,
	onFetchFiles,
	onNavigateToFolder,
	onDownloadFile,
	onDeleteFile,
	onMoveFile,
	onDragOver,
	onDragLeave,
	onDrop,
}: FilesPanelProps) {
	const [moveDialogOpen, setMoveDialogOpen] = useState(false);
	const [moveSource, setMoveSource] = useState<{
		path: string;
		name: string;
	} | null>(null);

	const handleMoveClick = useCallback((path: string, name: string) => {
		setMoveSource({ path, name });
		setMoveDialogOpen(true);
	}, []);

	return (
		<div className="flex flex-col h-full">
			{/* Toolbar with breadcrumbs */}
			<div className="flex items-center gap-2 mb-3">
				{/* Breadcrumbs - left aligned */}
				<div className="flex items-center gap-1 text-sm text-gray-500 min-w-0 flex-1">
					{breadcrumbs.map((crumb, index) => (
						<span key={crumb.path} className="flex items-center gap-1 shrink-0">
							{index > 0 && (
								<ChevronRight className="h-3.5 w-3.5 text-gray-300" />
							)}
							<button
								onClick={() => onNavigateToFolder(crumb.path)}
								className={cn(
									"hover:text-gray-900 transition-colors truncate",
									index === breadcrumbs.length - 1
										? "text-gray-900 font-medium"
										: "text-gray-500"
								)}
							>
								{crumb.name}
							</button>
						</span>
					))}
				</div>

				{/* Buttons - right aligned */}
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
					className="h-7 text-xs shrink-0"
					onClick={() => fileInputRef.current?.click()}
					disabled={uploadingFiles || sandboxStatus !== "connected"}
				>
					<Upload className="h-3.5 w-3.5 mr-1" />
					Upload
				</Button>
				<Button
					variant="outline"
					size="sm"
					className="h-7 text-xs shrink-0"
					onClick={() => folderInputRef.current?.click()}
					disabled={uploadingFiles || sandboxStatus !== "connected"}
				>
					<FolderUp className="h-3.5 w-3.5 mr-1" />
					Folder
				</Button>
				<Button
					variant="outline"
					size="sm"
					className="h-7 text-xs shrink-0"
					onClick={onCreateFolder}
					disabled={uploadingFiles || sandboxStatus !== "connected"}
				>
					<FolderPlus className="h-3.5 w-3.5 mr-1" />
					New
				</Button>
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
					className="h-7 w-7 text-gray-400 hover:text-gray-700 shrink-0"
					onClick={onFetchFiles}
					disabled={filesLoading || sandboxStatus !== "connected"}
					aria-label="Refresh files"
				/>
			</div>

			{/* Drop zone / file grid - extends to bottom */}
			<div
				className={cn(
					"flex-1 rounded-lg border-2 border-dashed transition-colors overflow-auto",
					isDraggingOver
						? "border-burgundy-400 bg-burgundy-50"
						: "border-gray-200 bg-gray-50/50",
					uploadingFiles && "opacity-50 pointer-events-none"
				)}
				onDragOver={onDragOver}
				onDragLeave={onDragLeave}
				onDrop={onDrop}
			>
				{filesLoading && currentItems.length === 0 ? (
					<div className="flex items-center justify-center h-full">
						<Loader2 className="h-5 w-5 animate-spin text-gray-400" />
					</div>
				) : currentItems.length === 0 ? (
					<div className="flex flex-col items-center justify-center h-full text-center px-4">
						<Upload className="h-8 w-8 text-gray-300 mb-2" />
						<p className="text-sm text-gray-500 mb-1">
							{breadcrumbs.length > 1
								? "This folder is empty"
								: "Drop files here or use the buttons above"}
						</p>
						<p className="text-xs text-gray-400">
							Files sync with your project workspace
						</p>
					</div>
				) : (
					<div className="p-3 grid grid-cols-3 sm:grid-cols-4 gap-2 content-start">
						{currentItems.map((node) => (
							<FileCard
								key={node.path}
								node={node}
								onNavigate={onNavigateToFolder}
								onDownload={onDownloadFile}
								onDelete={onDeleteFile}
								onMoveClick={handleMoveClick}
							/>
						))}
					</div>
				)}

				{uploadingFiles && (
					<div className="flex items-center justify-center py-4">
						<Loader2 className="h-4 w-4 animate-spin text-burgundy-500 mr-2" />
						<span className="text-sm text-gray-600">Uploading…</span>
					</div>
				)}
			</div>

			{/* Move file dialog */}
			{moveSource && (
				<MoveFileDialog
					open={moveDialogOpen}
					onOpenChange={setMoveDialogOpen}
					sourcePath={moveSource.path}
					sourceName={moveSource.name}
					fileTree={fileTree}
					onMove={onMoveFile}
				/>
			)}
		</div>
	);
});
