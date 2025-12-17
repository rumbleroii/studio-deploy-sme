"use client";

import {
	useState,
	useRef,
	useEffect,
	useCallback,
	memo,
	forwardRef,
	useImperativeHandle,
} from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { Send, Loader2, Square } from "lucide-react";
import { cn } from "@/lib/utils";
import { MarkdownMessage } from "./MarkdownMessage";
import type { Message } from "../types";
import type { SandboxStatus } from "../hooks/useSandboxConnection";

type TraceSource = "frontend" | "nextjs" | "worker" | "runner";

type TraceMilestone = {
	type?: "milestone";
	name: string;
	source: TraceSource;
	tsMs: number;
	tsIso: string;
	traceId?: string;
	projectId?: string;
	runId?: string;
	observedAtMs?: number;
	observedAtPerfMs?: number;
};

function newTraceId(): string {
	if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
		return crypto.randomUUID();
	}
	return `trace-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

interface MessageBubbleProps {
	message: Message;
	isStreaming?: boolean;
}

const MessageBubble = memo(function MessageBubble({
	message,
	isStreaming,
}: MessageBubbleProps) {
	const showCursor = isStreaming && message.role === "assistant";
	const content = showCursor ? `${message.content}\n\n▍` : message.content;

	return (
		<div
			className={cn(
				"flex",
				message.role === "user" ? "justify-end" : "justify-start"
			)}
		>
			{message.role === "user" ? (
				<div className="max-w-[80%] rounded-2xl border border-gray-200 bg-gray-100/60 px-4 py-2.5 text-sm leading-relaxed text-gray-900 shadow-[0_1px_0_rgba(0,0,0,0.02)]">
					<MarkdownMessage
						className="text-gray-900 leading-6"
						content={content}
					/>
				</div>
			) : (
				<div className="max-w-[70ch] py-1 text-sm leading-7 text-gray-900">
					<MarkdownMessage
						content={content}
						className={showCursor ? "[&_*]:!text-gray-900" : undefined}
					/>
				</div>
			)}
		</div>
	);
});

export interface ChatPanelHandle {
	focusInput: () => void;
}

interface ChatPanelProps {
	projectId: string;
	sandboxStatus: SandboxStatus;
	hasConnectedOnce: boolean;
	messages: Message[];
	onMessagesChange: React.Dispatch<React.SetStateAction<Message[]>>;
	startEnsureLoop: () => void;
}

export const ChatPanel = forwardRef<ChatPanelHandle, ChatPanelProps>(
	function ChatPanel(
		{
			projectId,
			sandboxStatus,
			hasConnectedOnce,
			messages,
			onMessagesChange,
			startEnsureLoop,
		},
		ref
	) {
		const [input, setInput] = useState("");
		const [isStreaming, setIsStreaming] = useState(false);
		const [activeRunId, setActiveRunId] = useState<string | null>(null);
		const [composerHeight, setComposerHeight] = useState(120);

		const inputRef = useRef<HTMLTextAreaElement>(null);
		const formRef = useRef<HTMLFormElement>(null);
		const composerRef = useRef<HTMLDivElement>(null);
		const messagesEndRef = useRef<HTMLDivElement>(null);
		const eventSourceRef = useRef<EventSource | null>(null);
		const traceRef = useRef<{
			traceId: string;
			sentAtMs: number;
			sentAtPerfMs: number;
			milestonesByKey: Map<string, TraceMilestone>;
		} | null>(null);
		// Track the current user message being sent so we can restore it on error
		const currentUserMessageRef = useRef<{
			id: string;
			content: string;
		} | null>(null);

		const { toast } = useToast();

		// Helper to restore failed message to input and remove from chat
		const restoreFailedMessage = useCallback(() => {
			const failedMsg = currentUserMessageRef.current;
			if (failedMsg) {
				// Restore to input
				setInput(failedMsg.content);
				// Remove from messages
				onMessagesChange((prev) => prev.filter((m) => m.id !== failedMsg.id));
				// Clear the ref
				currentUserMessageRef.current = null;
				// Focus input so user can retry
				setTimeout(() => inputRef.current?.focus(), 0);
			}
		}, [onMessagesChange]);

		const recordMilestone = useCallback(
			(m: TraceMilestone, defaults?: { runId?: string }) => {
				const current = traceRef.current;
				if (!current) return;
				const key = `${m.source}:${m.name}`;
				if (current.milestonesByKey.has(key)) return;

				const observedAtMs = Date.now();
				const observedAtPerfMs =
					typeof performance !== "undefined" ? performance.now() : undefined;
				const elapsedMs =
					typeof observedAtPerfMs === "number"
						? Math.round(observedAtPerfMs - current.sentAtPerfMs)
						: Math.max(0, observedAtMs - current.sentAtMs);

				const entry: TraceMilestone = {
					...m,
					traceId: m.traceId || current.traceId,
					projectId: m.projectId || projectId,
					runId: m.runId || defaults?.runId,
					observedAtMs,
					observedAtPerfMs,
				};

				current.milestonesByKey.set(key, entry);

				console.log(
					`[trace ${current.traceId}] ${entry.source}:${entry.name}`,
					{
						tsIso: entry.tsIso,
						tsMs: entry.tsMs,
						elapsedMs,
						observedAtIso: new Date(observedAtMs).toISOString(),
						observedAtMs,
					}
				);
			},
			[projectId]
		);

		useImperativeHandle(ref, () => ({
			focusInput: () => inputRef.current?.focus(),
		}));

		const resizeComposer = useCallback(() => {
			const el = inputRef.current;
			if (!el) return;

			el.style.height = "0px";
			const next = Math.min(el.scrollHeight, 160);
			el.style.height = `${Math.max(next, 44)}px`;
		}, []);

		// Auto-scroll to bottom when messages change
		useEffect(() => {
			messagesEndRef.current?.scrollIntoView({ block: "end" });
		}, [messages]);

		// Resize composer on input change
		useEffect(() => {
			resizeComposer();
		}, [input, resizeComposer]);

		// Track composer height for scroll padding
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

		// Cleanup EventSource on unmount
		useEffect(() => {
			return () => {
				eventSourceRef.current?.close();
			};
		}, []);

		// Start streaming from a run
		const startStream = useCallback(
			(
				runId: string,
				assistantMessageId: string,
				fromSeq = 0,
				traceId?: string
			) => {
				// Close any existing EventSource
				eventSourceRef.current?.close();

				setIsStreaming(true);
				setActiveRunId(runId);

				const traceQuery = traceId
					? `&traceId=${encodeURIComponent(traceId)}`
					: "";
				const url = `/api/projects/${projectId}/chat/stream?runId=${runId}&fromSeq=${fromSeq}${traceQuery}`;
				const es = new EventSource(url);
				eventSourceRef.current = es;

				let sawAnyDelta = false;

				es.addEventListener("delta", (event) => {
					try {
						const data = JSON.parse(event.data);
						if (data.text) {
							if (!sawAnyDelta) {
								sawAnyDelta = true;
								recordMilestone(
									{
										name: "frontend_received_first_delta",
										source: "frontend",
										tsMs: Date.now(),
										tsIso: new Date().toISOString(),
									},
									{ runId }
								);
							}
							onMessagesChange((prev) =>
								prev.map((m) =>
									m.id === assistantMessageId
										? {
												...m,
												content: m.content + data.text,
												streamSeq: data.seq,
										  }
										: m
								)
							);
						}
					} catch {
						// Ignore parse errors
					}
				});

				es.addEventListener("milestone", (event) => {
					try {
						const payload = JSON.parse(
							(event as MessageEvent).data
						) as TraceMilestone;
						if (
							payload?.name &&
							payload?.source &&
							payload?.tsMs &&
							payload?.tsIso
						) {
							recordMilestone(payload, { runId });
						}
					} catch {
						// Ignore parse errors
					}
				});

				es.addEventListener("session_id", () => {
					// Session ID is handled server-side
				});

				es.addEventListener("done", () => {
					es.close();
					setIsStreaming(false);
					setActiveRunId(null);
					// Mark message as complete
					onMessagesChange((prev) =>
						prev.map((m) =>
							m.id === assistantMessageId ? { ...m, status: "complete" } : m
						)
					);
					// Clear the tracked user message on successful completion
					currentUserMessageRef.current = null;
					inputRef.current?.focus();

					// Final trace summary
					const current = traceRef.current;
					if (current && current.traceId) {
						const rows = Array.from(current.milestonesByKey.values()).map(
							(m) => ({
								source: m.source,
								name: m.name,
								tsIso: m.tsIso,
								tsMs: m.tsMs,
								observedAtMs: m.observedAtMs,
								elapsedMs:
									typeof m.observedAtPerfMs === "number"
										? Math.round(m.observedAtPerfMs - current.sentAtPerfMs)
										: typeof m.observedAtMs === "number"
										? Math.max(0, m.observedAtMs - current.sentAtMs)
										: undefined,
							})
						);
						console.log(`[trace ${current.traceId}] milestone summary`);
						// eslint-disable-next-line no-console
						console.table(rows);
					}
				});

				es.addEventListener("error", (event) => {
					// Check if it's a data event with error info
					const errorEvent = event as MessageEvent;
					let errorMsg = "Stream error";
					if (errorEvent.data) {
						try {
							const data = JSON.parse(errorEvent.data);
							errorMsg = data.error || errorMsg;
						} catch {
							// Use default error message
						}
					}

					es.close();
					setIsStreaming(false);
					setActiveRunId(null);

					// Remove both user and assistant messages, restore to input
					onMessagesChange((prev) =>
						prev.filter((m) => m.id !== assistantMessageId)
					);
					restoreFailedMessage();

					toast({
						variant: "destructive",
						title: "Stream error",
						description: errorMsg,
					});

					// Best-effort: cancel the run to clear single-active-run lock.
					// (If the worker is down this may fail; that's OK.)
					fetch(`/api/projects/${projectId}/chat/cancel`, {
						method: "POST",
						headers: { "Content-Type": "application/json" },
						body: JSON.stringify({ runId }),
					}).catch(() => {});
				});

				es.addEventListener("ping", () => {
					// Heartbeat, ignore
				});

				let errorHandled = false;
				es.onerror = (event) => {
					// Connection error - EventSource will attempt to reconnect automatically
					// Close immediately to prevent retries and show error
					if (!errorHandled) {
						errorHandled = true;
						es.close();
						setIsStreaming(false);
						setActiveRunId(null);
						const errorMsg =
							"Failed to connect to stream. The worker may not be running.";

						// Remove both user and assistant messages, restore to input
						onMessagesChange((prev) =>
							prev.filter((m) => m.id !== assistantMessageId)
						);
						restoreFailedMessage();

						toast({
							variant: "destructive",
							title: "Connection failed",
							description: errorMsg,
						});

						// Best-effort cancel to clear the active run lock.
						fetch(`/api/projects/${projectId}/chat/cancel`, {
							method: "POST",
							headers: { "Content-Type": "application/json" },
							body: JSON.stringify({ runId }),
						}).catch(() => {});
					}
				};
			},
			[
				projectId,
				onMessagesChange,
				toast,
				restoreFailedMessage,
				recordMilestone,
			]
		);

		// On mount, check if there's a streaming message to resume
		useEffect(() => {
			const streamingMsg = messages.find(
				(m) => m.role === "assistant" && m.status === "streaming" && m.runId
			);
			if (streamingMsg && !isStreaming && sandboxStatus === "connected") {
				startStream(
					streamingMsg.runId!,
					streamingMsg.id,
					streamingMsg.streamSeq || 0
				);
			}
		}, [messages, isStreaming, sandboxStatus, startStream]);

		const handleCancel = async () => {
			if (!activeRunId) return;

			try {
				eventSourceRef.current?.close();
				setIsStreaming(false);
				setActiveRunId(null);

				await fetch(`/api/projects/${projectId}/chat/cancel`, {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({ runId: activeRunId }),
				});

				// Remove the assistant message that was streaming
				onMessagesChange((prev) =>
					prev.filter(
						(m) => !(m.runId === activeRunId && m.status === "streaming")
					)
				);

				// Restore user message to input
				restoreFailedMessage();
			} catch (error) {
				console.error("Cancel error:", error);
			}
		};

		const handleSubmit = async (e: React.FormEvent) => {
			e.preventDefault();
			if (!input.trim() || isStreaming || sandboxStatus !== "connected") return;

			const userMessage = input.trim();
			setInput("");

			const traceId = newTraceId();
			const sentAtMs = Date.now();
			const sentAtPerfMs =
				typeof performance !== "undefined" ? performance.now() : 0;
			traceRef.current = {
				traceId,
				sentAtMs,
				sentAtPerfMs,
				milestonesByKey: new Map<string, TraceMilestone>(),
			};
			// Record the client-side send milestone immediately
			traceRef.current.milestonesByKey.set("frontend:frontend_sent", {
				name: "frontend_sent",
				source: "frontend",
				tsMs: sentAtMs,
				tsIso: new Date(sentAtMs).toISOString(),
				traceId,
				projectId,
				observedAtMs: sentAtMs,
				observedAtPerfMs: sentAtPerfMs,
			});
			console.log(`[trace ${traceId}] frontend:frontend_sent`, {
				tsIso: new Date(sentAtMs).toISOString(),
				tsMs: sentAtMs,
				elapsedMs: 0,
			});

			// Add user message optimistically
			const tempUserMsg: Message = {
				id: `temp-${Date.now()}`,
				role: "user",
				content: userMessage,
				createdAt: new Date().toISOString(),
				status: "complete",
			};
			// Track this message so we can restore it on error
			currentUserMessageRef.current = {
				id: tempUserMsg.id,
				content: userMessage,
			};
			onMessagesChange((prev) => [...prev, tempUserMsg]);

			let shouldReconnect = false;
			try {
				// Step 1: Start the run
				const res = await fetch(`/api/projects/${projectId}/chat`, {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({
						message: userMessage,
						trace: {
							traceId,
							frontendSentAtMs: sentAtMs,
							milestones: [
								{
									name: "frontend_sent",
									source: "frontend",
									tsMs: sentAtMs,
									tsIso: new Date(sentAtMs).toISOString(),
									traceId,
									projectId,
								},
							],
						},
					}),
				});

				if (!res.ok) {
					shouldReconnect = [502, 503, 504].includes(res.status);

					// Handle conflict (run already active)
					if (res.status === 409) {
						const errorData = await res.json();
						toast({
							variant: "destructive",
							title: "Run already active",
							description: "Please wait for the current response to complete.",
						});
						// Remove the optimistic user message and restore to input
						restoreFailedMessage();
						return;
					}

					throw new Error("Chat request failed");
				}

				const { runId, assistantMessageId, trace } = await res.json();

				// Merge any server-side trace milestones from the POST response
				if (
					traceRef.current &&
					trace?.traceId &&
					trace.traceId === traceRef.current.traceId &&
					Array.isArray(trace.milestones)
				) {
					for (const m of trace.milestones as TraceMilestone[]) {
						recordMilestone(m, { runId });
					}
				}

				// Add assistant placeholder message
				const assistantPlaceholder: Message = {
					id: assistantMessageId,
					role: "assistant",
					content: "",
					createdAt: new Date().toISOString(),
					runId,
					status: "streaming",
					streamSeq: 0,
				};
				onMessagesChange((prev) => [...prev, assistantPlaceholder]);

				// Step 2: Start streaming
				startStream(runId, assistantMessageId, 0, traceId);
			} catch (error) {
				console.error("Chat error:", error);
				toast({
					variant: "destructive",
					title: "Chat failed",
					description: "Could not send message. Please try again.",
				});
				// Remove the optimistic user message and restore to input
				restoreFailedMessage();

				if (shouldReconnect) startEnsureLoop();
			}
		};

		// Find the currently streaming message for display
		const streamingMessage = messages.find(
			(m) => m.role === "assistant" && m.status === "streaming"
		);

		return (
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
							<MessageBubble
								key={message.id}
								message={message}
								isStreaming={message.id === streamingMessage?.id && isStreaming}
							/>
						))}

						{isStreaming && streamingMessage && !streamingMessage.content && (
							<div className="flex items-center gap-2 py-1 text-sm text-gray-500">
								<Loader2 className="h-4 w-4 animate-spin text-burgundy-500" />
								<span>Thinking…</span>
							</div>
						)}
						<div
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
						{/* Streaming indicator with Stop button */}
						{isStreaming && (
							<div className="flex items-center justify-center gap-2 mb-3">
								<Loader2 className="h-4 w-4 animate-spin text-burgundy-500" />
								<span className="text-sm text-gray-600">
									Agent is responding...
								</span>
								<Button
									type="button"
									variant="outline"
									size="sm"
									onClick={handleCancel}
									className="ml-2 h-7 px-2 text-xs"
									icon={<Square className="h-3 w-3" />}
								>
									Stop
								</Button>
							</div>
						)}

						<div className="rounded-2xl border border-gray-200 bg-white shadow-sm">
							<form
								ref={formRef}
								onSubmit={handleSubmit}
								className="flex gap-2 p-2 items-end"
							>
								<Textarea
									ref={inputRef}
									placeholder={
										isStreaming
											? "Wait for response to complete..."
											: sandboxStatus === "connected"
											? "Ask Metaforms Copilot..."
											: "Connecting… you can type while we get things ready"
									}
									value={input}
									onChange={(e) => setInput(e.target.value)}
									onInput={(e) => {
										// Also sync on input events (catches programmatic changes)
										const value = (e.target as HTMLTextAreaElement).value;
										if (value !== input) {
											setInput(value);
										}
									}}
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
										!(inputRef.current?.value.trim() || input.trim())
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
							{sandboxStatus !== "connected" && !isStreaming && (
								<span className="flex items-center gap-1.5">
									<Loader2 className="h-3 w-3 animate-spin" />
									{hasConnectedOnce ? "Almost there…" : "Getting things ready…"}
								</span>
							)}
						</div>
					</div>
				</div>
			</div>
		);
	}
);
