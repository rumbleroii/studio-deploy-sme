"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
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
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Message {
	id: string;
	role: "user" | "assistant";
	content: string;
	createdAt: string;
}

interface ProjectViewProps {
	project: {
		id: string;
		name: string;
		researchObjectiveText: string;
	};
	initialMessages: Message[];
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
							aria-label="Open research context"
							icon={<PanelRight className="h-4 w-4" />}
						/>
					</DialogTrigger>
					<DialogContent className="p-0 overflow-hidden max-w-lg">
						<DialogHeader className="px-4 py-3 border-b border-gray-200">
							<DialogTitle className="text-sm font-medium text-gray-900">
								Research Context
							</DialogTitle>
							<DialogDescription className="sr-only">
								Research objective and recent artefacts for this project.
							</DialogDescription>
						</DialogHeader>
						<ScrollArea className="max-h-[70vh] p-4">
							{contextContent}
						</ScrollArea>
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
					<ScrollArea className="flex-1 p-4">
						<div
							className="max-w-2xl mx-auto space-y-4"
							role="log"
							aria-label="Chat messages"
							aria-live="polite"
							aria-busy={isStreaming}
							aria-relevant="additions text"
						>
							{messages.length === 0 && !isStreaming && (
								<div className="text-center py-16">
									<div className="w-12 h-12 mx-auto mb-4 rounded-full bg-burgundy-500/5 flex items-center justify-center">
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
										Ask Claude about your research objective or request
										analysis.
									</p>
								</div>
							)}

							{messages.map((message) => (
								<div
									key={message.id}
									className={cn(
										"flex gap-3",
										message.role === "user" && "flex-row-reverse"
									)}
								>
									<div
										className={cn(
											"w-8 h-8 rounded-full flex items-center justify-center shrink-0 border",
											message.role === "user"
												? "bg-burgundy-500 text-white border-burgundy-500"
												: "bg-white border-gray-100"
										)}
									>
										{message.role === "user" ? (
											<span className="text-xs font-medium">YOU</span>
										) : (
											<Image
												src="/metaforms-logo.svg"
												alt="AI"
												width={16}
												height={16}
												style={{ width: "auto", height: "auto" }}
												className="opacity-90"
											/>
										)}
									</div>
									<div
										className={cn(
											"rounded-2xl px-5 py-3.5 max-w-[80%] text-sm leading-relaxed shadow-sm",
											message.role === "user"
												? "bg-burgundy-500 text-white rounded-tr-none"
												: "bg-white border border-gray-100 text-gray-700 rounded-tl-none"
										)}
									>
										<p className="whitespace-pre-wrap">{message.content}</p>
									</div>
								</div>
							))}

							{isStreaming && streamingContent && (
								<div className="flex gap-4">
									<div className="w-8 h-8 rounded-full bg-white border border-gray-100 flex items-center justify-center shrink-0">
										<Image
											src="/metaforms-logo.svg"
											alt="AI"
											width={16}
											height={16}
											style={{ width: "auto", height: "auto" }}
											className="opacity-90 animate-pulse"
										/>
									</div>
									<div className="rounded-2xl rounded-tl-none px-5 py-3.5 max-w-[80%] bg-white border border-gray-100 text-sm leading-relaxed shadow-sm">
										<p className="whitespace-pre-wrap text-gray-700">
											{streamingContent}
										</p>
									</div>
								</div>
							)}

							{isStreaming && !streamingContent && (
								<div className="flex gap-4">
									<div className="w-8 h-8 rounded-full bg-white border border-gray-100 flex items-center justify-center shrink-0">
										<Image
											src="/metaforms-logo.svg"
											alt="AI"
											width={16}
											height={16}
											style={{ width: "auto", height: "auto" }}
											className="opacity-90 animate-pulse"
										/>
									</div>
									<div className="rounded-2xl rounded-tl-none px-5 py-3.5 bg-white border border-gray-100 shadow-sm">
										<Loader2 className="h-4 w-4 animate-spin text-burgundy-500" />
									</div>
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
										className="flex-1 min-h-[44px] max-h-40 resize-none border-0 shadow-none focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:outline-none text-sm leading-5 px-3 py-3"
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

				{/* Context panel */}
				{showContext && (
					<div className="w-80 border-l border-gray-200 hidden lg:flex flex-col bg-white">
						<div className="h-12 px-4 border-b border-gray-200 flex items-center">
							<h2 className="text-sm font-medium text-gray-900">
								Research Context
							</h2>
						</div>
						<ScrollArea className="flex-1 p-4">{contextContent}</ScrollArea>
					</div>
				)}
			</div>
		</div>
	);
}
