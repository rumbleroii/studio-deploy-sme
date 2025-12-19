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
import { Send, Loader2, Square, CheckCircle2, XCircle, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Message } from "../types";
import { MarkdownMessage } from "./MarkdownMessage";
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

export interface QACheck {
	id: string;
	name: string;
	status: "pending" | "running" | "passed" | "failed";
	message?: string;
}

export interface FailedCheck {
	id: string;
	code: string;
	summary: string;
}

interface MessageBubbleProps {
	message: Message;
}

const MessageBubble = memo(function MessageBubble({
	message,
}: MessageBubbleProps) {
	const content = message.content;

	return (
		<div
			className={cn(
				"flex animate-in fade-in slide-in-from-bottom-3 duration-500 ease-out fill-mode-both",
				message.role === "user" ? "justify-end" : "justify-start"
			)}
		>
			{message.role === "user" ? (
				<div className="max-w-[80%] rounded-2xl border border-gray-200 bg-gray-100/60 px-4 mx-4 py-2.5 text-sm leading-relaxed text-gray-900 shadow-[0_1px_0_rgba(0,0,0,0.02)]">
					<MarkdownMessage
						className="text-gray-900 leading-6"
						content={content}
					/>
				</div>
			) : (
				<div className="max-w-[70ch] py-1 mx-4 text-sm leading-7 text-gray-900">
					<MarkdownMessage content={content} />
				</div>
			)}
		</div>
	);
});

const QACheckItem = memo(function QACheckItem({ check }: { check: QACheck }) {
	const getStatusIcon = () => {
		switch (check.status) {
			case "passed":
				return <CheckCircle2 className="h-4 w-4 text-green-500" />;
			case "failed":
				return <XCircle className="h-4 w-4 text-red-500" />;
			case "running":
				return <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />;
			default:
				return <Clock className="h-4 w-4 text-gray-400" />;
		}
	};

	return (
		<div className="flex items-start gap-3 py-1.5">
			<div className="mt-0.5">{getStatusIcon()}</div>
			<div className="flex-1 min-w-0">
				<div className="text-sm text-gray-900">{check.name}</div>
				{check.message && (
					<div className="text-xs text-gray-600 mt-0.5">{check.message}</div>
				)}
			</div>
		</div>
	);
});

const QAChecksMessage = memo(function QAChecksMessage({ 
	checks,
	isExpanded,
	onToggle 
}: { 
	checks: QACheck[];
	isExpanded: boolean;
	onToggle: () => void;
}) {
	return (
		<div className="mx-4">
			<div className="bg-white border border-gray-200 rounded-lg shadow-sm max-w-[85%]">
				{/* Header */}
				<button
					onClick={onToggle}
					className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
				>
					<div className="flex items-center gap-2">
						<Loader2 className="h-4 w-4 animate-spin text-gray-700" />
						<span className="text-sm font-medium text-gray-900">Running QA Checks</span>
					</div>
					<div className="text-gray-500">
						{isExpanded ? (
							<svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
								<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
							</svg>
						) : (
							<svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
								<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
							</svg>
						)}
					</div>
				</button>
				
				{/* Checks List - Collapsible */}
				{isExpanded && (
					<div className="border-t border-gray-200 max-h-[300px] overflow-y-auto">
						<div className="p-4 pt-2 space-y-0.5">
							{checks.map((check) => (
								<QACheckItem key={check.id} check={check} />
							))}
						</div>
					</div>
				)}
			</div>
		</div>
	);
});

const FailedCheckItem = memo(function FailedCheckItem({ check }: { check: FailedCheck }) {
	return (
		<div className="flex items-start gap-3 py-2 border-b border-gray-100 last:border-0">
			<div className="flex-shrink-0 w-16 mt-0.5">
				<span className="inline-block px-2 py-1 bg-gray-100 text-gray-700 text-xs font-medium rounded">
					{check.code}
				</span>
			</div>
			<div className="flex-1 min-w-0">
				<p className="text-sm text-gray-900">{check.summary}</p>
			</div>
		</div>
	);
});

const FixingQAIssuesMessage = memo(function FixingQAIssuesMessage({ 
	failedChecks,
	isExpanded,
	onToggle,
	isFixing 
}: { 
	failedChecks: FailedCheck[];
	isExpanded: boolean;
	onToggle: () => void;
	isFixing: boolean;
}) {
	return (
		<div className="mx-4">
			<div className="bg-white border border-gray-200 rounded-lg shadow-sm max-w-[85%]">
				{/* Header */}
				<button
					onClick={onToggle}
					className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
				>
					<div className="flex items-center gap-2">
						{isFixing ? (
							<Loader2 className="h-4 w-4 animate-spin text-gray-700" />
						) : (
							<CheckCircle2 className="h-4 w-4 text-green-500" />
						)}
						<span className="text-sm font-medium text-gray-900">
							{isFixing ? "Fixing QA Issues" : "Fixed QA Issues"}
						</span>
					</div>
					<div className="text-gray-500">
						{isExpanded ? (
							<svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
								<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
							</svg>
						) : (
							<svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
								<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
							</svg>
						)}
					</div>
				</button>
				
				{/* Failed Checks List - Collapsible */}
				{isExpanded && (
					<div className="border-t border-gray-200 max-h-[300px] overflow-y-auto">
						<div className="p-4 pt-2">
							{failedChecks.map((check) => (
								<FailedCheckItem key={check.id} check={check} />
							))}
						</div>
					</div>
				)}
			</div>
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
	qaChecks?: QACheck[] | null;
	isRunningQA?: boolean;
	failedChecks?: FailedCheck[] | null;
	isFixingIssues?: boolean;
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
			qaChecks,
			isRunningQA,
			failedChecks,
			isFixingIssues,
		},
		ref
	) {
		const [input, setInput] = useState("");
		const [isStreaming, setIsStreaming] = useState(false);
		const [activeRunId, setActiveRunId] = useState<string | null>(null);
		const [composerHeight, setComposerHeight] = useState(120);
		const [lastDeltaTime, setLastDeltaTime] = useState<number>(0);
		const [isProcessing, setIsProcessing] = useState(false);
		const [statusMessage, setStatusMessage] = useState<string | null>(null);
		const [isQAExpanded, setIsQAExpanded] = useState(true);
		const [isFixingExpanded, setIsFixingExpanded] = useState(true);

		const inputRef = useRef<HTMLTextAreaElement>(null);
		const formRef = useRef<HTMLFormElement>(null);
		const composerRef = useRef<HTMLDivElement>(null);
		const messagesEndRef = useRef<HTMLDivElement>(null);
		const eventSourceRef = useRef<EventSource | null>(null);
		const wasStreamingRef = useRef(false);
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
			messagesEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
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

		// Play chime when chat becomes ready after streaming
		useEffect(() => {
			const isReady = sandboxStatus === "connected" && !isStreaming;
			const wasStreaming = wasStreamingRef.current;
			
			if (isReady && wasStreaming) {
				// Play notification chime
				const audio = new Audio("/sounds/chime.mp3");
				audio.volume = 0.4;
				audio.play().catch(() => {});
			}
			
			wasStreamingRef.current = isStreaming;
		}, [sandboxStatus, isStreaming]);

		// Show "Agent is processing" after 1.5s of no text during streaming
		useEffect(() => {
			if (!isStreaming) return setIsProcessing(false);
			
			const timeout = setTimeout(() => setIsProcessing(true), 1500);
			return () => clearTimeout(timeout);
		}, [isStreaming, lastDeltaTime]);

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
							setLastDeltaTime(Date.now());
							setIsProcessing(false);
							setStatusMessage(null); // Clear status when text arrives
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

			es.addEventListener("status", (event) => {
				try {
					const data = JSON.parse(event.data);
					if (data.message) {
						setStatusMessage(data.message);
						setIsProcessing(true);
					}
				} catch {
					// Ignore parse errors
				}
			});

			es.addEventListener("done", () => {
				es.close();
				setIsStreaming(false);
				setActiveRunId(null);
				setIsProcessing(false);
				setStatusMessage(null);
				// Mark message as complete
				onMessagesChange((prev) =>
					prev.map((m) =>
						m.id === assistantMessageId ? { ...m, status: "complete" } : m
					)
				);
				// Restart the preview server after chat completes
				startEnsureLoop();
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
					setIsProcessing(false);
					setStatusMessage(null);

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
					setIsProcessing(false);
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
				setIsProcessing(false);
				setStatusMessage(null);

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
			setIsStreaming(true); // Set immediately for responsive UI

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
						toast({
							variant: "destructive",
							title: "Run already active",
							description: "Please wait for the current response to complete.",
						});
						// Remove the optimistic user message and restore to input
						setIsStreaming(false);
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
				setIsStreaming(false);
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
				<ScrollArea className="flex-1 scroll-smooth">
				<div
					className="max-w-2xl mx-auto space-y-4 my-4"
					style={{ maxHeight: '80vh', overflow: 'overlay' }}
					role="log"
					aria-label="Chat messages"
					aria-live="polite"
					aria-busy={isStreaming}
					aria-relevant="additions text"
				>
					{messages.length === 0 && !isStreaming && !isRunningQA && (
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
								Start a conversation
							</h3>
							<p className="text-sm text-gray-500 max-w-xs mx-auto">
								You can ask Metaforms questions about your survey or request analysis on your data.
							</p>
						</div>
					)}

					{messages.map((message) => (
						<MessageBubble
							key={message.id}
							message={message}
						/>
					))}

				{isRunningQA && qaChecks && qaChecks.length > 0 && (
					<QAChecksMessage
						checks={qaChecks}
						isExpanded={isQAExpanded}
						onToggle={() => setIsQAExpanded(!isQAExpanded)}
					/>
				)}

				{failedChecks && failedChecks.length > 0 && (
					<FixingQAIssuesMessage
						failedChecks={failedChecks}
						isExpanded={isFixingExpanded}
						onToggle={() => setIsFixingExpanded(!isFixingExpanded)}
						isFixing={isFixingIssues || false}
					/>
				)}

					{isProcessing && (
							<div className="flex items-center gap-2 pl-4 py-1 text-sm text-gray-400 italic animate-in fade-in slide-in-from-bottom-2 duration-300 ease-out">
								<Loader2 className="h-3 w-3 animate-spin text-gray-400" />
								<span>{statusMessage || "Agent is processing"}</span>
		
							</div>
						)}
						<div
							style={{
								paddingBottom: Math.max(100, composerHeight + 10),
							}}
						/>
					<div ref={messagesEndRef} />
				</div>


			{/* Input */}
			<div
				ref={composerRef}
				className="absolute bottom-0 left-0 right-0 z-20 px-4 pb-4 pt-6 bg-gradient-to-t from-white via-white/95 to-transparent"
			>
					<div className="max-w-2xl mx-auto mt-3">
						<div className={cn(
						"rounded-2xl border border-gray-300 bg-white shadow-sm transition-all duration-200",
						sandboxStatus === "connected" && !isStreaming
							? "ring-2 ring-burgundy-100 ring-offset-2"
							: ""
					)}>
							<form
								ref={formRef}
								onSubmit={handleSubmit}
								className="flex gap-2 p-2 items-end"
							>
								<Textarea
									ref={inputRef}
									placeholder={
										isStreaming
											? "Agent is responding..."
											: sandboxStatus === "connected"
											? "Ask, Search or Chat..."
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
				</ScrollArea>
			</div>
		);
	}
);
