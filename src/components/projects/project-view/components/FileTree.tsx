"use client";

import { memo, useCallback } from "react";
import { Button } from "@/components/ui/button";
import {
	Folder,
	File,
	Download,
	Trash2,
	ChevronRight,
	ChevronDown,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { TreeNode } from "../types";

interface TreeItemProps {
	node: TreeNode;
	depth: number;
	isExpanded: boolean;
	onToggle: (path: string) => void;
	onDownload: (path: string) => void;
	onDelete: (path: string, type: "file" | "directory") => void;
}

const TreeItem = memo(function TreeItem({
	node,
	depth,
	isExpanded,
	onToggle,
	onDownload,
	onDelete,
}: TreeItemProps) {
	const isDir = node.type === "directory";
	const paddingLeft = depth * 12;

	const handleClick = useCallback(() => {
		if (isDir) {
			onToggle(node.path);
		}
	}, [isDir, node.path, onToggle]);

	const handleDownload = useCallback(
		(e: React.MouseEvent) => {
			e.stopPropagation();
			onDownload(node.path);
		},
		[node.path, onDownload]
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
		<div>
			<div
				className={cn(
					"group flex items-center gap-1.5 py-1 px-2 rounded-md hover:bg-gray-100 cursor-pointer text-sm",
					"transition-colors"
				)}
				style={{ paddingLeft: `${paddingLeft + 8}px` }}
				onClick={handleClick}
			>
				{isDir ? (
					<>
						{isExpanded ? (
							<ChevronDown className="h-3.5 w-3.5 text-gray-400 shrink-0" />
						) : (
							<ChevronRight className="h-3.5 w-3.5 text-gray-400 shrink-0" />
						)}
						<Folder className="h-4 w-4 text-amber-500 shrink-0" />
					</>
				) : (
					<>
						<span className="w-3.5" />
						<File className="h-4 w-4 text-gray-400 shrink-0" />
					</>
				)}
				<span className="flex-1 truncate text-gray-700">{node.name}</span>

				{/* Action buttons */}
				<div className="opacity-0 group-hover:opacity-100 flex items-center gap-0.5">
					{!isDir && (
						<Button
							variant="ghost"
							size="smallIcon"
							icon={<Download className="h-3.5 w-3.5" />}
							className="h-6 w-6 text-gray-400 hover:text-gray-700"
							onClick={handleDownload}
							aria-label={`Download ${node.name}`}
						/>
					)}
					<Button
						variant="ghost"
						size="smallIcon"
						icon={<Trash2 className="h-3.5 w-3.5" />}
						className="h-6 w-6 text-gray-400 hover:text-red-500"
						onClick={handleDelete}
						aria-label={`Delete ${node.name}`}
					/>
				</div>
			</div>
			{isDir && isExpanded && node.children.length > 0 && (
				<div>
					{node.children.map((child) => (
						<TreeItem
							key={child.path}
							node={child}
							depth={depth + 1}
							isExpanded={false}
							onToggle={onToggle}
							onDownload={onDownload}
							onDelete={onDelete}
						/>
					))}
				</div>
			)}
		</div>
	);
});

interface FileTreeProps {
	nodes: TreeNode[];
	expandedFolders: Set<string>;
	onToggle: (path: string) => void;
	onDownload: (path: string) => void;
	onDelete: (path: string, type: "file" | "directory") => void;
}

export const FileTree = memo(function FileTree({
	nodes,
	expandedFolders,
	onToggle,
	onDownload,
	onDelete,
}: FileTreeProps) {
	const renderNode = (node: TreeNode, depth: number = 0): React.ReactNode => {
		const isExpanded = expandedFolders.has(node.path);
		const isDir = node.type === "directory";

		return (
			<div key={node.path}>
				<TreeItem
					node={node}
					depth={depth}
					isExpanded={isExpanded}
					onToggle={onToggle}
					onDownload={onDownload}
					onDelete={onDelete}
				/>
				{isDir && isExpanded && node.children.length > 0 && (
					<div>
						{node.children.map((child) => renderNode(child, depth + 1))}
					</div>
				)}
			</div>
		);
	};

	return <div className="p-2">{nodes.map((node) => renderNode(node, 0))}</div>;
});
