"use client";

import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { useToast } from "@/hooks/use-toast";
import type { FileInfo, TreeNode } from "../types";
import type { SandboxStatus } from "./useSandboxConnection";

interface UseProjectFilesResult {
	files: FileInfo[];
	filesLoading: boolean;
	fileTree: TreeNode[];
	currentPath: string;
	currentItems: TreeNode[];
	breadcrumbs: { name: string; path: string }[];
	isDraggingOver: boolean;
	uploadingFiles: boolean;
	fileInputRef: React.RefObject<HTMLInputElement | null>;
	folderInputRef: React.RefObject<HTMLInputElement | null>;
	fetchFiles: () => Promise<void>;
	uploadFiles: (fileList: FileList | File[]) => Promise<void>;
	deleteFile: (path: string, kind: "file" | "directory") => Promise<void>;
	downloadFile: (path: string) => void;
	createFolder: () => Promise<void>;
	moveFile: (sourcePath: string, destinationPath: string) => Promise<void>;
	navigateToFolder: (path: string) => void;
	handleDragOver: (e: React.DragEvent) => void;
	handleDragLeave: (e: React.DragEvent) => void;
	handleDrop: (e: React.DragEvent) => Promise<void>;
}

export function useProjectFiles(
	projectId: string,
	sandboxStatus: SandboxStatus
): UseProjectFilesResult {
	const [files, setFiles] = useState<FileInfo[]>([]);
	const [filesLoading, setFilesLoading] = useState(false);
	const [currentPath, setCurrentPath] = useState("");
	const [isDraggingOver, setIsDraggingOver] = useState(false);
	const [uploadingFiles, setUploadingFiles] = useState(false);

	const fileInputRef = useRef<HTMLInputElement | null>(null);
	const folderInputRef = useRef<HTMLInputElement | null>(null);
	const filesRefetchTimeoutRef = useRef<number | null>(null);
	const eventSourceRef = useRef<EventSource | null>(null);
	const hasFetchedOnMountRef = useRef<boolean>(false);

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
						let relativePath =
							(file as File & { webkitRelativePath?: string })
								.webkitRelativePath || file.name;
						// Prepend current path if we're in a folder
						if (currentPath) {
							relativePath = `${currentPath}/${relativePath}`;
						}
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
		[projectId, currentPath, fetchFiles, toast]
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

		// Prepend current path if we're in a folder
		const fullPath = currentPath ? `${currentPath}/${folderName}` : folderName;

		try {
			const res = await fetch(`/api/projects/${projectId}/files/mkdir`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ path: fullPath }),
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
	}, [projectId, currentPath, fetchFiles, toast]);

	const moveFile = useCallback(
		async (sourcePath: string, destinationPath: string) => {
			try {
				const res = await fetch(`/api/projects/${projectId}/files/move`, {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({ sourcePath, destinationPath }),
				});

				if (res.ok) {
					toast({
						title: "File moved",
						description: `Moved to ${destinationPath}`,
					});
					await fetchFiles();
				} else {
					throw new Error("Move failed");
				}
			} catch (error) {
				console.error("Move error:", error);
				toast({
					variant: "destructive",
					title: "Move failed",
					description: "Could not move file. Please try again.",
				});
			}
		},
		[projectId, fetchFiles, toast]
	);

	// Navigate to a folder
	const navigateToFolder = useCallback((path: string) => {
		setCurrentPath(path);
	}, []);

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

	// Get items in the current folder
	const currentItems = useMemo(() => {
		if (!currentPath) {
			return fileTree;
		}
		// Navigate to the current path in the tree
		const parts = currentPath.split("/");
		let current: TreeNode[] = fileTree;
		for (const part of parts) {
			const found = current.find(
				(n) => n.name === part && n.type === "directory"
			);
			if (found) {
				current = found.children;
			} else {
				return [];
			}
		}
		return current;
	}, [fileTree, currentPath]);

	// Build breadcrumbs from current path
	const breadcrumbs = useMemo(() => {
		const crumbs: { name: string; path: string }[] = [
			{ name: "Files", path: "" },
		];
		if (currentPath) {
			const parts = currentPath.split("/");
			let pathSoFar = "";
			for (const part of parts) {
				pathSoFar = pathSoFar ? `${pathSoFar}/${part}` : part;
				crumbs.push({ name: part, path: pathSoFar });
			}
		}
		return crumbs;
	}, [currentPath]);

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

	// Fetch files when sandbox connects (including on page refresh)
	useEffect(() => {
		if (sandboxStatus === "connected") {
			// Always fetch on mount or when sandbox becomes connected
			// This ensures files load properly on page refresh
			fetchFiles();
			hasFetchedOnMountRef.current = true;
		} else {
			// Reset flag when disconnected so we fetch again on reconnect
			hasFetchedOnMountRef.current = false;
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [sandboxStatus, projectId]);

	// Set up EventSource for realtime file updates (always listening when connected)
	useEffect(() => {
		if (sandboxStatus !== "connected") {
			// Close existing connection when disconnected
			if (eventSourceRef.current) {
				console.log(`[Files] Closing EventSource - sandbox disconnected`);
				eventSourceRef.current.close();
				eventSourceRef.current = null;
			}
			return;
		}

		// Don't create duplicate EventSource connections
		if (eventSourceRef.current) {
			console.log(`[Files] EventSource already exists, skipping`);
			return;
		}

		console.log(`[Files] Creating EventSource for project ${projectId}`);
		const eventSource = new EventSource(
			`/api/projects/${projectId}/files/events`
		);
		eventSourceRef.current = eventSource;

		let eventSourceConnected = false;

		eventSource.onopen = () => {
			console.log(`[Files] EventSource connected`);
			eventSourceConnected = true;
		};

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
					}, 500); // Increased debounce to 500ms
				}
			} catch (error) {
				// Ignore parse errors
				console.warn("[Files] EventSource parse error:", error);
			}
		};

		eventSource.onerror = (error) => {
			console.warn("[Files] EventSource error:", error);
			// EventSource will auto-reconnect, but close if sandbox disconnects
			if (sandboxStatus !== "connected") {
				eventSource.close();
				eventSourceRef.current = null;
			}
		};

		return () => {
			console.log(`[Files] Cleaning up EventSource`);
			if (eventSourceRef.current) {
				eventSourceRef.current.close();
				eventSourceRef.current = null;
			}
			if (filesRefetchTimeoutRef.current) {
				window.clearTimeout(filesRefetchTimeoutRef.current);
				filesRefetchTimeoutRef.current = null;
			}
		};
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [sandboxStatus, projectId]);

	return {
		files,
		filesLoading,
		fileTree,
		currentPath,
		currentItems,
		breadcrumbs,
		isDraggingOver,
		uploadingFiles,
		fileInputRef,
		folderInputRef,
		fetchFiles,
		uploadFiles,
		deleteFile,
		downloadFile,
		createFolder,
		moveFile,
		navigateToFolder,
		handleDragOver,
		handleDragLeave,
		handleDrop,
	};
}
