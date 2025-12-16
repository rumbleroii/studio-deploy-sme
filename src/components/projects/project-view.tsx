"use client";

import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import {
	ArrowLeft,
	Send,
	Loader2,
	FileText,
	PanelRightClose,
	PanelRight,
	Upload,
	FolderUp,
	Folder,
	File,
	Download,
	Trash2,
	FolderPlus,
	ChevronRight,
	ChevronDown,
	RefreshCw,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Message {
	id: string;
	role: "user" | "assistant";
	content: string;
	createdAt: string;
}

interface FileInfo {
	name: string;
	absolutePath: string;
	relativePath: string;
	type: "file" | "directory" | "symlink" | "other";
	size: number;
	modifiedAt: string;
}

interface TreeNode {
	name: string;
	path: string;
	type: "file" | "directory";
	size?: number;
	children: TreeNode[];
}

interface ProjectViewProps {
	project: {
		id: string;
		name: string;
		researchObjectiveText: string;
	};
	initialMessages: Message[];
}

function MarkdownMessage({
	content,
	className,
}: {
	content: string;
	className?: string;
}) {
	return (
		<div className={cn("text-sm leading-7 text-gray-900", className)}>
			<ReactMarkdown
				remarkPlugins={[remarkGfm]}
				components={{
					p: ({ children }: any) => (
						<p className="my-2 first:mt-0 last:mb-0 whitespace-pre-wrap">
							{children}
						</p>
					),
					a: ({ children, href }: any) => (
						<a
							href={href}
							target="_blank"
							rel="noreferrer"
							className="text-burgundy-500 underline underline-offset-2 hover:text-burgundy-400"
						>
							{children}
						</a>
					),
					strong: ({ children }: any) => (
						<strong className="font-semibold">{children}</strong>
					),
					em: ({ children }: any) => <em className="italic">{children}</em>,
					h1: ({ children }: any) => (
						<h1 className="mt-4 mb-2 text-base font-semibold leading-6">
							{children}
						</h1>
					),
					h2: ({ children }: any) => (
						<h2 className="mt-4 mb-2 text-sm font-semibold tracking-tight">
							{children}
						</h2>
					),
					h3: ({ children }: any) => (
						<h3 className="mt-3 mb-1 text-sm font-semibold">{children}</h3>
					),
					ul: ({ children }: any) => (
						<ul className="my-2 pl-5 list-disc space-y-1">{children}</ul>
					),
					ol: ({ children }: any) => (
						<ol className="my-2 pl-5 list-decimal space-y-1">{children}</ol>
					),
					li: ({ children }: any) => (
						<li className="leading-7 whitespace-pre-wrap">{children}</li>
					),
					hr: () => <hr className="my-4 border-gray-200" />,
					blockquote: ({ children }: any) => (
						<blockquote className="my-3 border-l-2 border-gray-200 pl-4 text-gray-700">
							{children}
						</blockquote>
					),
					code: ({ children, className }: any) => {
						const isBlock =
							typeof className === "string" && /language-/.test(className);
						if (isBlock) {
							// react-markdown wraps block code in <pre><code>, so style is handled by <pre>
							return (
								<code className={cn("font-mono text-xs", className)}>
									{children}
								</code>
							);
						}
						return (
							<code className="rounded bg-gray-100 px-1 py-0.5 font-mono text-xs text-gray-900">
								{children}
							</code>
						);
					},
					pre: ({ children }: any) => (
						<pre className="my-3 overflow-x-auto rounded-lg border border-gray-200 bg-gray-50 p-3 text-xs leading-5">
							{children}
						</pre>
					),
					table: ({ children }: any) => (
						<div className="my-3 overflow-x-auto">
							<table className="w-full border-collapse text-sm">
								{children}
							</table>
						</div>
					),
					th: ({ children }: any) => (
						<th className="border border-gray-200 bg-gray-50 px-2 py-1 text-left font-medium">
							{children}
						</th>
					),
					td: ({ children }: any) => (
						<td className="border border-gray-200 px-2 py-1 align-top">
							{children}
						</td>
					),
				}}
			>
				{content}
			</ReactMarkdown>
		</div>
	);
}

export function ProjectView({ project, initialMessages }: ProjectViewProps) {
	const [messages, setMessages] = useState<Message[]>(initialMessages);
	const [input, setInput] = useState("");
	const [isStreaming, setIsStreaming] = useState(false);
	const [streamingContent, setStreamingContent] = useState("");
	const [showContext, setShowContext] = useState(true);
	const [sandboxStatus, setSandboxStatus] = useState<
		"connecting" | "connected"
	>("connecting");
	const [hasConnectedOnce, setHasConnectedOnce] = useState(false);
	const inputRef = useRef<HTMLTextAreaElement>(null);
	const formRef = useRef<HTMLFormElement>(null);
	const composerRef = useRef<HTMLDivElement>(null);
	const messagesEndRef = useRef<HTMLDivElement>(null);
	const [composerHeight, setComposerHeight] = useState(120);
	const ensureTimeoutRef = useRef<number | null>(null);
	const ensureAbortRef = useRef<AbortController | null>(null);
	const ensureActiveRef = useRef(false);
	const ensureBackoffMsRef = useRef(500);
	const { toast } = useToast();

	// Files state
	const [activeTab, setActiveTab] = useState<"context" | "files">("context");
	const [files, setFiles] = useState<FileInfo[]>([]);
	const [filesLoading, setFilesLoading] = useState(false);
	const [expandedFolders, setExpandedFolders] = useState<Set<string>>(
		new Set()
	);
	const [isDraggingOver, setIsDraggingOver] = useState(false);
	const [uploadingFiles, setUploadingFiles] = useState(false);
	const fileInputRef = useRef<HTMLInputElement>(null);
	const folderInputRef = useRef<HTMLInputElement>(null);
	const filesRefetchTimeoutRef = useRef<number | null>(null);
	const eventSourceRef = useRef<EventSource | null>(null);

	const startEnsureLoop = useCallback(() => {
		if (ensureActiveRef.current) return;
		ensureActiveRef.current = true;

		ensureBackoffMsRef.current = 500;
		setSandboxStatus("connecting");

		if (ensureTimeoutRef.current) {
			window.clearTimeout(ensureTimeoutRef.current);
			ensureTimeoutRef.current = null;
		}

		ensureAbortRef.current?.abort();
		ensureAbortRef.current = new AbortController();

		const attemptEnsure = async () => {
			if (ensureAbortRef.current?.signal.aborted) return;

			try {
				const res = await fetch(`/api/projects/${project.id}/sandbox/ensure`, {
					method: "POST",
					signal: ensureAbortRef.current?.signal,
				});

				if (!res.ok) {
					throw new Error(`Ensure failed: ${res.status}`);
				}

				ensureActiveRef.current = false;
				ensureBackoffMsRef.current = 500;
				setSandboxStatus("connected");
				setHasConnectedOnce(true);
			} catch {
				if (ensureAbortRef.current?.signal.aborted) return;

				setSandboxStatus("connecting");
				const delay = ensureBackoffMsRef.current;
				ensureBackoffMsRef.current = Math.min(
					Math.round(ensureBackoffMsRef.current * 1.7),
					5000
				);

				ensureTimeoutRef.current = window.setTimeout(() => {
					void attemptEnsure();
				}, delay);
			}
		};

		void attemptEnsure();
	}, [project.id]);

	// File management functions
	const fetchFiles = useCallback(async () => {
		try {
			setFilesLoading(true);
			const res = await fetch(`/api/projects/${project.id}/files`);
			if (res.ok) {
				const data = await res.json();
				setFiles(data.files || []);
			}
		} catch (error) {
			console.error("Failed to fetch files:", error);
		} finally {
			setFilesLoading(false);
		}
	}, [project.id]);

	const uploadFiles = useCallback(
		async (fileList: FileList | File[]) => {
			const filesToUpload = Array.from(fileList);
			if (filesToUpload.length === 0) return;

			setUploadingFiles(true);
			try {
				const filePayloads = await Promise.all(
					filesToUpload.map(async (file) => {
						// Use webkitRelativePath for folder uploads, or just the name
						const relativePath = (file as any).webkitRelativePath || file.name;
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

				const res = await fetch(`/api/projects/${project.id}/files/write`, {
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
		[project.id, fetchFiles, toast]
	);

	const deleteFile = useCallback(
		async (path: string, kind: "file" | "directory") => {
			try {
				const res = await fetch(`/api/projects/${project.id}/files/delete`, {
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
		[project.id, fetchFiles, toast]
	);

	const downloadFile = useCallback(
		(path: string) => {
			const url = `/api/projects/${
				project.id
			}/files/download?path=${encodeURIComponent(path)}`;
			const a = document.createElement("a");
			a.href = url;
			a.download = path.split("/").pop() || "download";
			document.body.appendChild(a);
			a.click();
			document.body.removeChild(a);
		},
		[project.id]
	);

	const createFolder = useCallback(async () => {
		const folderName = window.prompt("Enter folder name:");
		if (!folderName) return;

		try {
			const res = await fetch(`/api/projects/${project.id}/files/mkdir`, {
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
	}, [project.id, fetchFiles, toast]);

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
			`/api/projects/${project.id}/files/events`
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
	}, [sandboxStatus, activeTab, project.id, fetchFiles]);

	const resizeComposer = useCallback(() => {
		const el = inputRef.current;
		if (!el) return;

		// Auto-resize to content, capped so it never takes over the screen.
		el.style.height = "0px";
		const next = Math.min(el.scrollHeight, 160);
		el.style.height = `${Math.max(next, 44)}px`;
	}, []);

	// Auto-scroll to bottom when messages change
	useEffect(() => {
		messagesEndRef.current?.scrollIntoView({ block: "end" });
	}, [messages, streamingContent]);

	useEffect(() => {
		resizeComposer();
	}, [input, resizeComposer]);

	useEffect(() => {
		const el = composerRef.current;
		if (!el) return;
		if (typeof ResizeObserver === "undefined") return;

		const ro = new ResizeObserver(() => {
			setComposerHeight(el.getBoundingClientRect().height);
		});

		ro.observe(el);
		setComposerHeight(el.getBoundingClientRect().height);
		return () => ro.disconnect();
	}, []);

	// Ensure sandbox is ready (and keep retrying until it is)
	useEffect(() => {
		ensureActiveRef.current = false;
		startEnsureLoop();

		return () => {
			if (ensureTimeoutRef.current) {
				window.clearTimeout(ensureTimeoutRef.current);
				ensureTimeoutRef.current = null;
			}
			ensureAbortRef.current?.abort();
			ensureAbortRef.current = null;
			ensureActiveRef.current = false;
		};
	}, [startEnsureLoop]);

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!input.trim() || isStreaming || sandboxStatus !== "connected") return;

		const userMessage = input.trim();
		setInput("");

		// Add user message optimistically
		const tempUserMsg: Message = {
			id: `temp-${Date.now()}`,
			role: "user",
			content: userMessage,
			createdAt: new Date().toISOString(),
		};
		setMessages((prev) => [...prev, tempUserMsg]);
		setIsStreaming(true);
		setStreamingContent("");

		let shouldReconnect = false;
		try {
			const res = await fetch(`/api/projects/${project.id}/chat`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ message: userMessage }),
			});

			if (!res.ok) {
				shouldReconnect = [502, 503, 504].includes(res.status);
				throw new Error("Chat request failed");
			}

			const reader = res.body?.getReader();
			if (!reader) {
				shouldReconnect = true;
				throw new Error("No reader");
			}

			const decoder = new TextDecoder();
			let assistantContent = "";

			while (true) {
				const { done, value } = await reader.read();
				if (done) break;

				const chunk = decoder.decode(value, { stream: true });
				const lines = chunk.split("\n");

				for (const line of lines) {
					if (line.startsWith("data: ")) {
						try {
							const data = JSON.parse(line.slice(6));
							if (data.type === "stdout" || data.type === "content") {
								assistantContent += data.data || data.content || "";
								setStreamingContent(assistantContent);
							} else if (data.type === "complete" || data.type === "done") {
								// Stream complete
							} else if (data.type === "error") {
								throw new Error(data.error || "Streaming error");
							}
						} catch {
							// Skip invalid JSON lines
						}
					}
				}
			}

			// Add the final assistant message
			if (assistantContent) {
				const assistantMsg: Message = {
					id: `msg-${Date.now()}`,
					role: "assistant",
					content: assistantContent,
					createdAt: new Date().toISOString(),
				};
				setMessages((prev) => [...prev, assistantMsg]);
			}
		} catch (error) {
			console.error("Chat error:", error);
			toast({
				variant: "destructive",
				title: "Chat failed",
				description: "Could not send message. Please try again.",
			});
			// Remove the optimistic user message on error
			setMessages((prev) => prev.filter((m) => m.id !== tempUserMsg.id));

			if (shouldReconnect) startEnsureLoop();
		} finally {
			setIsStreaming(false);
			setStreamingContent("");
			if (!shouldReconnect) inputRef.current?.focus();
		}
	};

	// Extract artefacts from messages (code blocks, etc.)
	const artefacts = messages
		.filter((m) => m.role === "assistant")
		.flatMap((m) => {
			const codeBlocks = m.content.match(/```[\s\S]*?```/g) || [];
			return codeBlocks.map((block, idx) => ({
				id: `${m.id}-${idx}`,
				content: block,
			}));
		})
		.slice(-3); // Show last 3 artefacts

	const contextContent = (
		<div className="space-y-4">
			{/* Research objective */}
			<div>
				<div className="flex items-center gap-2 mb-2">
					<FileText className="h-4 w-4 text-gray-400" />
					<span className="text-xs font-medium text-gray-500 uppercase tracking-wider">
						Objective
					</span>
				</div>
				<p className="text-sm text-gray-600 leading-relaxed">
					{project.researchObjectiveText.slice(0, 500)}
					{project.researchObjectiveText.length > 500 && "..."}
				</p>
			</div>

			{artefacts.length > 0 && (
				<div className="pt-4 border-t border-gray-200">
					<span className="text-xs font-medium text-gray-500 uppercase tracking-wider">
						Recent Artefacts
					</span>
					<div className="mt-2 space-y-2">
						{artefacts.map((artefact) => (
							<div
								key={artefact.id}
								className="p-2.5 bg-gray-50 rounded-md border border-gray-200"
							>
								<pre className="text-xs overflow-x-auto whitespace-pre-wrap text-gray-600">
									{artefact.content.slice(0, 200)}
									{artefact.content.length > 200 && "..."}
								</pre>
							</div>
						))}
					</div>
				</div>
			)}
		</div>
	);

	// Recursive tree item renderer
	const renderTreeItem = (node: TreeNode, depth: number = 0) => {
		const isExpanded = expandedFolders.has(node.path);
		const isDir = node.type === "directory";
		const paddingLeft = depth * 12;

		return (
			<div key={node.path}>
				<div
					className={cn(
						"group flex items-center gap-1.5 py-1 px-2 rounded-md hover:bg-gray-100 cursor-pointer text-sm",
						"transition-colors"
					)}
					style={{ paddingLeft: `${paddingLeft + 8}px` }}
					onClick={() => isDir && toggleFolder(node.path)}
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
								onClick={(e) => {
									e.stopPropagation();
									downloadFile(node.path);
								}}
								aria-label={`Download ${node.name}`}
							/>
						)}
						<Button
							variant="ghost"
							size="smallIcon"
							icon={<Trash2 className="h-3.5 w-3.5" />}
							className="h-6 w-6 text-gray-400 hover:text-red-500"
							onClick={(e) => {
								e.stopPropagation();
								if (
									window.confirm(
										`Delete ${isDir ? "folder" : "file"} "${node.name}"?`
									)
								) {
									deleteFile(node.path, node.type);
								}
							}}
							aria-label={`Delete ${node.name}`}
						/>
					</div>
				</div>
				{isDir && isExpanded && node.children.length > 0 && (
					<div>
						{node.children.map((child) => renderTreeItem(child, depth + 1))}
					</div>
				)}
			</div>
		);
	};

	const filesContent = (
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
							uploadFiles(e.target.files);
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
							uploadFiles(e.target.files);
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
					onClick={createFolder}
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
					onClick={fetchFiles}
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
				onDragOver={handleDragOver}
				onDragLeave={handleDragLeave}
				onDrop={handleDrop}
			>
				{filesLoading && files.length === 0 ? (
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
					<div className="p-2">
						{fileTree.map((node) => renderTreeItem(node, 0))}
					</div>
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

	return (
		<div className="h-dvh flex flex-col">
			{/* Header */}
			<div className="h-14 border-b border-gray-200 bg-white px-4 flex items-center gap-3 shrink-0">
				<Link href="/projects">
					<Button
						variant="ghost"
						size="smallIcon"
						icon={<ArrowLeft className="h-4 w-4" />}
						aria-label="Back to projects"
						className="text-gray-500 hover:text-gray-700 hover:bg-gray-100"
					/>
				</Link>
				<div className="flex-1 min-w-0">
					<h1 className="text-sm font-semibold text-gray-900 truncate">
						{project.name}
					</h1>
				</div>
				<div className="hidden sm:flex items-center gap-2 text-xs text-gray-500">
					<span
						className={cn(
							"h-2 w-2 rounded-full",
							sandboxStatus === "connected" ? "bg-emerald-500" : "bg-amber-500"
						)}
					/>
					<span>
						{sandboxStatus === "connected" ? "Connected" : "Connecting…"}
					</span>
				</div>
				<Dialog>
					<DialogTrigger asChild>
						<Button
							variant="ghost"
							size="smallIcon"
							className="lg:hidden text-gray-500 hover:text-gray-700 hover:bg-gray-100"
							aria-label="Open panel"
							icon={<PanelRight className="h-4 w-4" />}
						/>
					</DialogTrigger>
					<DialogContent className="p-0 overflow-hidden max-w-lg">
						<DialogHeader className="px-4 py-3 border-b border-gray-200">
							<DialogTitle className="text-sm font-medium text-gray-900">
								Project Panel
							</DialogTitle>
							<DialogDescription className="sr-only">
								Research context and files for this project.
							</DialogDescription>
						</DialogHeader>
						<Tabs
							value={activeTab}
							onValueChange={(v) => setActiveTab(v as "context" | "files")}
							className="flex flex-col"
						>
							<TabsList className="mx-4 mt-2 grid w-auto grid-cols-2">
								<TabsTrigger value="context" className="text-xs">
									Context
								</TabsTrigger>
								<TabsTrigger value="files" className="text-xs">
									Files
								</TabsTrigger>
							</TabsList>
							<ScrollArea className="max-h-[60vh]">
								<TabsContent value="context" className="p-4 mt-0">
									{contextContent}
								</TabsContent>
								<TabsContent value="files" className="p-4 mt-0">
									{filesContent}
								</TabsContent>
							</ScrollArea>
						</Tabs>
					</DialogContent>
				</Dialog>
				<Button
					variant="ghost"
					size="smallIcon"
					className="hidden lg:inline-flex text-gray-500 hover:text-gray-700 hover:bg-gray-100"
					onClick={() => setShowContext(!showContext)}
					aria-label={
						showContext ? "Hide research context" : "Show research context"
					}
					icon={
						showContext ? (
							<PanelRightClose className="h-4 w-4" />
						) : (
							<PanelRight className="h-4 w-4" />
						)
					}
				/>
			</div>

			{/* Main content */}
			<div className="flex-1 flex overflow-hidden">
				{/* Chat panel */}
				<div className="flex-1 flex flex-col min-w-0 bg-gray-50 relative">
					<ScrollArea className="flex-1">
						<div
							className="max-w-2xl mx-auto space-y-4 my-4"
							role="log"
							aria-label="Chat messages"
							aria-live="polite"
							aria-busy={isStreaming}
							aria-relevant="additions text"
						>
							{messages.length === 0 && !isStreaming && (
								<div className="text-center py-16">
									<div className="w-12 h-12 mx-auto mb-4 rounded-full flex items-center justify-center">
										<Image
											src="/metaforms-logo.svg"
											alt="AI"
											width={24}
											height={24}
											style={{ width: "auto", height: "auto" }}
											className="opacity-90"
										/>
									</div>
									<h3 className="text-sm font-medium text-gray-900 mb-1">
										Start your research
									</h3>
									<p className="text-sm text-gray-500 max-w-xs mx-auto">
										Ask Metaforms about your research objective or request
										analysis.
									</p>
								</div>
							)}

							{messages.map((message) => (
								<div
									key={message.id}
									className={cn(
										"flex",
										message.role === "user" ? "justify-end" : "justify-start"
									)}
								>
									{message.role === "user" ? (
										<div className="max-w-[80%] rounded-2xl border border-gray-200 bg-gray-100/60 px-4 py-2.5 text-sm leading-relaxed text-gray-900 shadow-[0_1px_0_rgba(0,0,0,0.02)]">
											<MarkdownMessage
												className="text-gray-900 leading-6"
												content={message.content}
											/>
										</div>
									) : (
										<div className="max-w-[70ch] py-1 text-sm leading-7 text-gray-900">
											<MarkdownMessage content={message.content} />
										</div>
									)}
								</div>
							))}

							{isStreaming && streamingContent && (
								<div className="flex justify-start">
									<div className="max-w-[70ch] py-1 text-sm leading-7 text-gray-900">
										<MarkdownMessage
											content={`${streamingContent}\n\n▍`}
											className="[&_*]:!text-gray-900"
										/>
									</div>
								</div>
							)}

							{isStreaming && !streamingContent && (
								<div className="flex items-center gap-2 py-1 text-sm text-gray-500">
									<Loader2 className="h-4 w-4 animate-spin text-burgundy-500" />
									<span>Thinking…</span>
								</div>
							)}
							<div
								// Leave some space so the composer can overlap/fade messages,
								// without permanently hiding the last message.
								style={{
									paddingBottom: Math.max(24, Math.round(composerHeight * 0.6)),
								}}
							/>
							<div ref={messagesEndRef} />
						</div>
					</ScrollArea>

					{/* Input */}
					<div
						ref={composerRef}
						className="absolute bottom-0 left-0 right-0 z-20 px-4 pb-4 pt-6 bg-gradient-to-t from-white via-white/95 to-transparent"
					>
						<div className="max-w-2xl mx-auto">
							<div className="rounded-2xl border border-gray-200 bg-white shadow-sm">
								<form
									ref={formRef}
									onSubmit={handleSubmit}
									className="flex gap-2 p-2 items-end"
								>
									<Textarea
										ref={inputRef}
										placeholder={
											sandboxStatus === "connected"
												? "Ask Metaforms Copilot..."
												: "Connecting… you can type while we get things ready"
										}
										value={input}
										onChange={(e) => setInput(e.target.value)}
										onKeyDown={(e) => {
											if (
												e.key === "Enter" &&
												!e.shiftKey &&
												sandboxStatus === "connected" &&
												!isStreaming &&
												!e.nativeEvent.isComposing
											) {
												e.preventDefault();
												formRef.current?.requestSubmit();
											}
										}}
										disabled={isStreaming}
										rows={1}
										className="flex-1 min-h-[44px] max-h-40 resize-none border-0 bg-white shadow-none focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:outline-none text-sm leading-5 px-3 py-3"
									/>
									<Button
										type="submit"
										disabled={
											isStreaming ||
											sandboxStatus !== "connected" ||
											!input.trim()
										}
										size="icon"
										icon={
											isStreaming ? (
												<Loader2 className="h-4 w-4 animate-spin" />
											) : (
												<Send className="h-4 w-4" />
											)
										}
										aria-label="Send message"
										className="h-11 w-11 bg-burgundy-500 hover:bg-burgundy-400 text-white rounded-xl shadow-sm"
									/>
								</form>
							</div>

							<div className="mt-2 flex items-center justify-between text-[11px] text-gray-500">
								<span className="hidden sm:inline">
									Enter to send • Shift+Enter for a new line
								</span>
								{sandboxStatus !== "connected" && (
									<span className="flex items-center gap-1.5">
										<Loader2 className="h-3 w-3 animate-spin" />
										{hasConnectedOnce
											? "Almost there…"
											: "Getting things ready…"}
									</span>
								)}
							</div>
						</div>
					</div>
				</div>

				{/* Right panel with tabs */}
				{showContext && (
					<div className="w-80 border-l border-gray-200 hidden lg:flex flex-col bg-white">
						<Tabs
							value={activeTab}
							onValueChange={(v) => setActiveTab(v as "context" | "files")}
							className="flex flex-col flex-1"
						>
							<div className="h-12 px-4 border-b border-gray-200 flex items-center">
								<TabsList className="h-8 p-0.5">
									<TabsTrigger value="context" className="text-xs h-7 px-3">
										Context
									</TabsTrigger>
									<TabsTrigger value="files" className="text-xs h-7 px-3">
										Files
									</TabsTrigger>
								</TabsList>
							</div>
							<TabsContent
								value="context"
								className="flex-1 mt-0 data-[state=active]:flex data-[state=active]:flex-col"
							>
								<ScrollArea className="flex-1 p-4">{contextContent}</ScrollArea>
							</TabsContent>
							<TabsContent
								value="files"
								className="flex-1 mt-0 data-[state=active]:flex data-[state=active]:flex-col"
							>
								<ScrollArea className="flex-1 p-4">{filesContent}</ScrollArea>
							</TabsContent>
						</Tabs>
					</div>
				)}
			</div>
		</div>
	);
}
