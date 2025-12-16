"use client";

import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { useToast } from "@/hooks/use-toast";
import type { FileInfo, TreeNode } from "../types";
import type { SandboxStatus } from "./useSandboxConnection";

interface UseProjectFilesResult {
	files: FileInfo[];
	filesLoading: boolean;
	fileTree: TreeNode[];
	expandedFolders: Set<string>;
	isDraggingOver: boolean;
	uploadingFiles: boolean;
	fileInputRef: React.RefObject<HTMLInputElement | null>;
	folderInputRef: React.RefObject<HTMLInputElement | null>;
	fetchFiles: () => Promise<void>;
	uploadFiles: (fileList: FileList | File[]) => Promise<void>;
	deleteFile: (path: string, kind: "file" | "directory") => Promise<void>;
	downloadFile: (path: string) => void;
	createFolder: () => Promise<void>;
	toggleFolder: (path: string) => void;
	handleDragOver: (e: React.DragEvent) => void;
	handleDragLeave: (e: React.DragEvent) => void;
	handleDrop: (e: React.DragEvent) => Promise<void>;
}

export function useProjectFiles(
	projectId: string,
	sandboxStatus: SandboxStatus,
	activeTab: "context" | "files"
): UseProjectFilesResult {
	const [files, setFiles] = useState<FileInfo[]>([]);
	const [filesLoading, setFilesLoading] = useState(false);
	const [expandedFolders, setExpandedFolders] = useState<Set<string>>(
		new Set()
	);
	const [isDraggingOver, setIsDraggingOver] = useState(false);
	const [uploadingFiles, setUploadingFiles] = useState(false);

	const fileInputRef = useRef<HTMLInputElement | null>(null);
	const folderInputRef = useRef<HTMLInputElement | null>(null);
	const filesRefetchTimeoutRef = useRef<number | null>(null);
	const eventSourceRef = useRef<EventSource | null>(null);

	const { toast } = useToast();

	const fetchFiles = useCallback(async () => {
		try {
			setFilesLoading(true);
			const res = await fetch(`/api/projects/${projectId}/files`);
			if (res.ok) {
				const data = await res.json();
				setFiles(data.files || []);
			}
		} catch (error) {
			console.error("Failed to fetch files:", error);
		} finally {
			setFilesLoading(false);
		}
	}, [projectId]);

	const uploadFiles = useCallback(
		async (fileList: FileList | File[]) => {
			const filesToUpload = Array.from(fileList);
			if (filesToUpload.length === 0) return;

			setUploadingFiles(true);
			try {
				const filePayloads = await Promise.all(
					filesToUpload.map(async (file) => {
						// Use webkitRelativePath for folder uploads, or just the name
						const relativePath =
							(file as File & { webkitRelativePath?: string })
								.webkitRelativePath || file.name;
						const arrayBuffer = await file.arrayBuffer();
						const bytes = new Uint8Array(arrayBuffer);
						let binary = "";
						for (let i = 0; i < bytes.byteLength; i++) {
							binary += String.fromCharCode(bytes[i]);
						}
						const base64 = btoa(binary);
						return {
							path: relativePath,
							content: base64,
							encoding: "base64" as const,
						};
					})
				);

				const res = await fetch(`/api/projects/${projectId}/files/write`, {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({ files: filePayloads }),
				});

				if (res.ok) {
					toast({
						title: "Files uploaded",
						description: `${filesToUpload.length} file(s) uploaded successfully.`,
					});
					await fetchFiles();
				} else {
					throw new Error("Upload failed");
				}
			} catch (error) {
				console.error("Upload error:", error);
				toast({
					variant: "destructive",
					title: "Upload failed",
					description: "Could not upload files. Please try again.",
				});
			} finally {
				setUploadingFiles(false);
			}
		},
		[projectId, fetchFiles, toast]
	);

	const deleteFile = useCallback(
		async (path: string, kind: "file" | "directory") => {
			try {
				const res = await fetch(`/api/projects/${projectId}/files/delete`, {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({ path, kind }),
				});

				if (res.ok) {
					toast({
						title: kind === "directory" ? "Folder deleted" : "File deleted",
						description: `${path} has been deleted.`,
					});
					await fetchFiles();
				} else {
					throw new Error("Delete failed");
				}
			} catch (error) {
				console.error("Delete error:", error);
				toast({
					variant: "destructive",
					title: "Delete failed",
					description: "Could not delete. Please try again.",
				});
			}
		},
		[projectId, fetchFiles, toast]
	);

	const downloadFile = useCallback(
		(path: string) => {
			const url = `/api/projects/${projectId}/files/download?path=${encodeURIComponent(
				path
			)}`;
			const a = document.createElement("a");
			a.href = url;
			a.download = path.split("/").pop() || "download";
			document.body.appendChild(a);
			a.click();
			document.body.removeChild(a);
		},
		[projectId]
	);

	const createFolder = useCallback(async () => {
		const folderName = window.prompt("Enter folder name:");
		if (!folderName) return;

		try {
			const res = await fetch(`/api/projects/${projectId}/files/mkdir`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ path: folderName }),
			});

			if (res.ok) {
				toast({
					title: "Folder created",
					description: `${folderName} has been created.`,
				});
				await fetchFiles();
			} else {
				throw new Error("Create folder failed");
			}
		} catch (error) {
			console.error("Create folder error:", error);
			toast({
				variant: "destructive",
				title: "Failed to create folder",
				description: "Please try again.",
			});
		}
	}, [projectId, fetchFiles, toast]);

	// Build tree from flat file list
	const fileTree = useMemo(() => {
		const root: TreeNode = {
			name: "",
			path: "",
			type: "directory",
			children: [],
		};

		for (const file of files) {
			const parts = file.relativePath.split("/");
			let current = root;

			for (let i = 0; i < parts.length; i++) {
				const part = parts[i];
				const isLast = i === parts.length - 1;
				const pathSoFar = parts.slice(0, i + 1).join("/");

				let existing = current.children.find((c) => c.name === part);
				if (!existing) {
					existing = {
						name: part,
						path: pathSoFar,
						type: isLast
							? file.type === "directory"
								? "directory"
								: "file"
							: "directory",
						size: isLast ? file.size : undefined,
						children: [],
					};
					current.children.push(existing);
				}
				current = existing;
			}
		}

		// Sort: directories first, then alphabetically
		const sortChildren = (node: TreeNode) => {
			node.children.sort((a, b) => {
				if (a.type === "directory" && b.type !== "directory") return -1;
				if (a.type !== "directory" && b.type === "directory") return 1;
				return a.name.localeCompare(b.name);
			});
			node.children.forEach(sortChildren);
		};
		sortChildren(root);

		return root.children;
	}, [files]);

	const toggleFolder = useCallback((path: string) => {
		setExpandedFolders((prev) => {
			const next = new Set(prev);
			if (next.has(path)) {
				next.delete(path);
			} else {
				next.add(path);
			}
			return next;
		});
	}, []);

	// Drag and drop handlers
	const handleDragOver = useCallback((e: React.DragEvent) => {
		e.preventDefault();
		e.stopPropagation();
		setIsDraggingOver(true);
	}, []);

	const handleDragLeave = useCallback((e: React.DragEvent) => {
		e.preventDefault();
		e.stopPropagation();
		setIsDraggingOver(false);
	}, []);

	const handleDrop = useCallback(
		async (e: React.DragEvent) => {
			e.preventDefault();
			e.stopPropagation();
			setIsDraggingOver(false);

			const items = e.dataTransfer.items;
			const fileList: File[] = [];

			// Handle both files and folder drops
			const processEntry = async (
				entry: FileSystemEntry,
				path: string = ""
			): Promise<void> => {
				if (entry.isFile) {
					const fileEntry = entry as FileSystemFileEntry;
					const file = await new Promise<File>((resolve) =>
						fileEntry.file(resolve)
					);
					// Add path prefix for nested files
					Object.defineProperty(file, "webkitRelativePath", {
						value: path ? `${path}/${file.name}` : file.name,
						writable: false,
					});
					fileList.push(file);
				} else if (entry.isDirectory) {
					const dirEntry = entry as FileSystemDirectoryEntry;
					const reader = dirEntry.createReader();
					const entries = await new Promise<FileSystemEntry[]>((resolve) =>
						reader.readEntries(resolve)
					);
					const newPath = path ? `${path}/${entry.name}` : entry.name;
					for (const subEntry of entries) {
						await processEntry(subEntry, newPath);
					}
				}
			};

			if (items) {
				const entries: FileSystemEntry[] = [];
				for (let i = 0; i < items.length; i++) {
					const entry = items[i].webkitGetAsEntry();
					if (entry) entries.push(entry);
				}
				for (const entry of entries) {
					await processEntry(entry);
				}
			}

			if (fileList.length > 0) {
				await uploadFiles(fileList);
			}
		},
		[uploadFiles]
	);

	// Fetch files when sandbox is connected and tab is active
	useEffect(() => {
		if (sandboxStatus === "connected" && activeTab === "files") {
			fetchFiles();
		}
	}, [sandboxStatus, activeTab, fetchFiles]);

	// Set up EventSource for realtime file updates
	useEffect(() => {
		if (sandboxStatus !== "connected" || activeTab !== "files") {
			// Close existing connection
			if (eventSourceRef.current) {
				eventSourceRef.current.close();
				eventSourceRef.current = null;
			}
			return;
		}

		const eventSource = new EventSource(
			`/api/projects/${projectId}/files/events`
		);
		eventSourceRef.current = eventSource;

		eventSource.onmessage = (event) => {
			try {
				const data = JSON.parse(event.data);
				if (data.type === "fs_event") {
					// Debounce refetch to avoid hammering the API
					if (filesRefetchTimeoutRef.current) {
						window.clearTimeout(filesRefetchTimeoutRef.current);
					}
					filesRefetchTimeoutRef.current = window.setTimeout(() => {
						fetchFiles();
					}, 300);
				}
			} catch {
				// Ignore parse errors
			}
		};

		eventSource.onerror = () => {
			// EventSource will auto-reconnect
		};

		return () => {
			eventSource.close();
			eventSourceRef.current = null;
			if (filesRefetchTimeoutRef.current) {
				window.clearTimeout(filesRefetchTimeoutRef.current);
			}
		};
	}, [sandboxStatus, activeTab, projectId, fetchFiles]);

	return {
		files,
		filesLoading,
		fileTree,
		expandedFolders,
		isDraggingOver,
		uploadingFiles,
		fileInputRef,
		folderInputRef,
		fetchFiles,
		uploadFiles,
		deleteFile,
		downloadFile,
		createFolder,
		toggleFolder,
		handleDragOver,
		handleDragLeave,
		handleDrop,
	};
}
