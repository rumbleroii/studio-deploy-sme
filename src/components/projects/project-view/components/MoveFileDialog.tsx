"use client";

import { useState, useMemo } from "react";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Folder, ChevronRight, Home } from "lucide-react";
import { cn } from "@/lib/utils";
import type { TreeNode } from "../types";

interface MoveFileDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	sourcePath: string;
	sourceName: string;
	fileTree: TreeNode[];
	onMove: (sourcePath: string, destinationPath: string) => Promise<void>;
}

export function MoveFileDialog({
	open,
	onOpenChange,
	sourcePath,
	sourceName,
	fileTree,
	onMove,
}: MoveFileDialogProps) {
	const [selectedFolder, setSelectedFolder] = useState<string>("");
	const [expandedFolders, setExpandedFolders] = useState<Set<string>>(
		new Set()
	);
	const [customName, setCustomName] = useState(sourceName);

	// Get all folder paths from the tree (excluding the source and its children)
	const availableFolders = useMemo(() => {
		const folders: { path: string; name: string; depth: number }[] = [
			{ path: "", name: "Root", depth: 0 },
		];

		const traverse = (nodes: TreeNode[], depth: number = 0) => {
			for (const node of nodes) {
				if (node.type === "directory" && node.path !== sourcePath) {
					// Don't allow moving into itself or its children
					if (!node.path.startsWith(sourcePath + "/")) {
						folders.push({ path: node.path, name: node.name, depth });
						if (node.children.length > 0) {
							traverse(node.children, depth + 1);
						}
					}
				}
			}
		};

		traverse(fileTree);
		return folders;
	}, [fileTree, sourcePath]);

	const handleMove = async () => {
		const fileName = customName || sourceName;
		const destinationPath = selectedFolder
			? `${selectedFolder}/${fileName}`
			: fileName;

		await onMove(sourcePath, destinationPath);
		onOpenChange(false);
		setSelectedFolder("");
		setCustomName(sourceName);
	};

	const toggleFolder = (path: string) => {
		setExpandedFolders((prev) => {
			const next = new Set(prev);
			if (next.has(path)) {
				next.delete(path);
			} else {
				next.add(path);
			}
			return next;
		});
	};

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-[500px]">
				<DialogHeader>
					<DialogTitle>Move {sourceName}</DialogTitle>
					<DialogDescription>
						Select a destination folder and optionally rename the file.
					</DialogDescription>
				</DialogHeader>

				<div className="space-y-4 py-4">
					{/* File name input */}
					<div className="space-y-2">
						<label className="text-sm font-medium">Name</label>
						<Input
							value={customName}
							onChange={(e) => setCustomName(e.target.value)}
							placeholder="File name"
						/>
					</div>

					{/* Folder selection */}
					<div className="space-y-2">
						<label className="text-sm font-medium">Destination folder</label>
						<ScrollArea className="h-[250px] rounded-md border">
							<div className="p-2 space-y-1">
								{/* Root folder */}
								<button
									onClick={() => setSelectedFolder("")}
									className={cn(
										"w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors hover:bg-gray-100",
										selectedFolder === "" && "bg-burgundy-50 text-burgundy-700"
									)}
								>
									<Home className="h-4 w-4 shrink-0" />
									<span>Root</span>
								</button>

								{/* Folder tree */}
								{fileTree.map((node) =>
									node.type === "directory" && node.path !== sourcePath ? (
										<FolderTreeItem
											key={node.path}
											node={node}
											selectedFolder={selectedFolder}
											expandedFolders={expandedFolders}
											sourcePath={sourcePath}
											depth={0}
											onSelect={setSelectedFolder}
											onToggle={toggleFolder}
										/>
									) : null
								)}
							</div>
						</ScrollArea>
					</div>

					{/* Destination preview */}
					<div className="text-sm text-gray-500">
						<span className="font-medium">Moving to: </span>
						{selectedFolder ? `${selectedFolder}/${customName}` : customName}
					</div>
				</div>

				<DialogFooter>
					<Button variant="outline" onClick={() => onOpenChange(false)}>
						Cancel
					</Button>
					<Button
						onClick={handleMove}
						disabled={!customName || customName === ""}
					>
						Move
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}

interface FolderTreeItemProps {
	node: TreeNode;
	selectedFolder: string;
	expandedFolders: Set<string>;
	sourcePath: string;
	depth: number;
	onSelect: (path: string) => void;
	onToggle: (path: string) => void;
}

function FolderTreeItem({
	node,
	selectedFolder,
	expandedFolders,
	sourcePath,
	depth,
	onSelect,
	onToggle,
}: FolderTreeItemProps) {
	const isExpanded = expandedFolders.has(node.path);
	const hasChildren = node.children.some((c) => c.type === "directory");
	const paddingLeft = depth * 16 + 12;

	// Don't allow moving into itself or its children
	if (node.path.startsWith(sourcePath + "/")) {
		return null;
	}

	return (
		<div>
			<button
				onClick={() => onSelect(node.path)}
				className={cn(
					"w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors hover:bg-gray-100",
					selectedFolder === node.path && "bg-burgundy-50 text-burgundy-700"
				)}
				style={{ paddingLeft: `${paddingLeft}px` }}
			>
				{hasChildren && (
					<button
						onClick={(e) => {
							e.stopPropagation();
							onToggle(node.path);
						}}
						className="shrink-0 hover:bg-gray-200 rounded p-0.5"
					>
						<ChevronRight
							className={cn(
								"h-3.5 w-3.5 transition-transform",
								isExpanded && "rotate-90"
							)}
						/>
					</button>
				)}
				{!hasChildren && <span className="w-4" />}
				<Folder className="h-4 w-4 text-amber-500 shrink-0" />
				<span className="truncate">{node.name}</span>
			</button>

			{isExpanded &&
				node.children.map((child) =>
					child.type === "directory" ? (
						<FolderTreeItem
							key={child.path}
							node={child}
							selectedFolder={selectedFolder}
							expandedFolders={expandedFolders}
							sourcePath={sourcePath}
							depth={depth + 1}
							onSelect={onSelect}
							onToggle={onToggle}
						/>
					) : null
				)}
		</div>
	);
}
