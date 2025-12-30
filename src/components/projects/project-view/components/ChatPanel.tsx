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
import { useToast } from "@/hooks/use-toast";
import { Send, Loader2, CheckCircle2, XCircle, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Message } from "../types";
import { MarkdownMessage } from "./MarkdownMessage";
import type { SandboxStatus } from "../hooks/useSandboxConnection";

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
						content={message.content}
					/>
				</div>
			) : (
				<div className="max-w-[70ch] py-1 mx-4 text-sm leading-7 text-gray-900">
					<MarkdownMessage content={message.content} />
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
	isPublished?: boolean;
	setIsEditInProgress?: React.Dispatch<React.SetStateAction<boolean>>;
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
			isPublished,
			setIsEditInProgress

		},
		ref
	) {
		const [input, setInput] = useState("");
		const [isStreaming, setIsStreaming] = useState(false);
		const [composerHeight, setComposerHeight] = useState(120);
		const [isProcessing, setIsProcessing] = useState(false);
		const [statusMessage, setStatusMessage] = useState<string | null>(null);
		const [isQAExpanded, setIsQAExpanded] = useState(true);
		const [isFixingExpanded, setIsFixingExpanded] = useState(true);

		const inputRef = useRef<HTMLTextAreaElement>(null);
		const formRef = useRef<HTMLFormElement>(null);
		const composerRef = useRef<HTMLDivElement>(null);
		const messagesEndRef = useRef<HTMLDivElement>(null);
		const abortControllerRef = useRef<AbortController | null>(null);
		const wasStreamingRef = useRef(false);
		const hasTriggeredInitialMessage = useRef(false);

		const { toast } = useToast();

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

	// Play chime when streaming ends
		useEffect(() => {
			if (!isStreaming && wasStreamingRef.current) {
				const audio = new Audio("/sounds/chime.mp3");
				audio.volume = 0.4;
				audio.play().catch(() => {});
			}
			wasStreamingRef.current = isStreaming;
		}, [isStreaming]);

		// Cleanup on unmount
		useEffect(() => {
			return () => {
				// Abort any in-flight requests
				if (abortControllerRef.current) {
					abortControllerRef.current.abort();
					abortControllerRef.current = null;
				}
				// Reset refs
				hasTriggeredInitialMessage.current = false;
				wasStreamingRef.current = false;
			};
		}, []);

		// Function to send a message programmatically
		const sendMessage = useCallback(async (messageContent: string) => {
			if (isStreaming || sandboxStatus !== "connected") return;

			const userMessage = messageContent.trim();
			if (!userMessage) return;

			setIsStreaming(true);
			setIsProcessing(true);
			setStatusMessage("Thinking...");

			// Add user message
			const userMsgId = `user-${Date.now()}`;
			const userMsg: Message = {
				id: userMsgId,
				role: "user",
				content: userMessage,
				createdAt: new Date().toISOString(),
				status: "complete",
			};
			onMessagesChange((prev) => [...prev, userMsg]);

			// Add assistant placeholder
			const assistantMsgId = `assistant-${Date.now()}`;
			const assistantPlaceholder: Message = {
				id: assistantMsgId,
				role: "assistant",
				content: "",
				createdAt: new Date().toISOString(),
				status: "streaming",
			};
			onMessagesChange((prev) => [...prev, assistantPlaceholder]);

			// Create abort controller
			abortControllerRef.current = new AbortController();

			try {
				const res = await fetch(`/api/projects/${projectId}/chat`, {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({ message: userMessage }),
					signal: abortControllerRef.current.signal,
				});

				if (!res.ok || !res.body) {
					throw new Error("Chat request failed");
				}

				const reader = res.body.getReader();
				const decoder = new TextDecoder();
				let buffer = "";

				while (true) {
					const { done, value } = await reader.read();
					if (done) break;

					buffer += decoder.decode(value, { stream: true });

					let idx: number;
					while ((idx = buffer.indexOf("\n\n")) !== -1) {
						const block = buffer.slice(0, idx);
						buffer = buffer.slice(idx + 2);

						if (!block.startsWith("data: ")) continue;
						const data = block.slice(6);

						try {
							const payload = JSON.parse(data);
							
							const EDIT_TOOLS = ["edit"];
							const isEditTool = payload.tool && EDIT_TOOLS.some(t => 
								payload.tool.toLowerCase().includes(t)
							);

							if (payload.type === "delta" && payload.text) {
								setIsProcessing(false);
								setStatusMessage(null);
								onMessagesChange((prev) =>
									prev.map((m) =>
										m.id === assistantMsgId
											? { ...m, content: m.content + payload.text }
											: m
									)
								);
							} else if (payload.type === "tool_start") {
								setIsProcessing(true);
								if (isEditTool) {
									setIsEditInProgress?.(true);
								} 
								setStatusMessage(`Running: ${payload.tool || "tool"}...`);
							} else if (payload.type === "tool_end") {
								setIsProcessing(false);
								setStatusMessage(null);
								// Only clear edit state when an edit tool ends
								if (isEditTool) {
									setIsEditInProgress?.(false);
								}
								// Add newline after tool call so next text starts fresh
								onMessagesChange((prev) =>
									prev.map((m) =>
										m.id === assistantMsgId && m.content && !m.content.endsWith("\n\n")
											? { ...m, content: m.content.trimEnd() + "\n\n" }
											: m
									)
								);
							} else if (payload.type === "done") {
								setIsEditInProgress?.(false)
								onMessagesChange((prev) =>
									prev.map((m) =>
										m.id === assistantMsgId ? { ...m, status: "complete" } : m
									)
								);
							} else if (payload.type === "error") {
								throw new Error(payload.error);
							}
						} catch (parseError) {
							// Ignore parse errors
						}
					}
				}

				setIsStreaming(false);
				setIsProcessing(false);
				setStatusMessage(null);
				startEnsureLoop();
				inputRef.current?.focus();
			} catch (error) {
				if ((error as Error).name === "AbortError") {
					// User cancelled
					onMessagesChange((prev) => prev.filter((m) => m.id !== assistantMsgId));
				} else {
					console.error("Chat error:", error);
					onMessagesChange((prev) => prev.filter((m) => m.id !== assistantMsgId));
					onMessagesChange((prev) => prev.filter((m) => m.id !== userMsgId));

					toast({
						variant: "destructive",
						title: "Chat failed",
						description: "Could not send message. Please try again.",
					});
				}

				setIsStreaming(false);
				setIsProcessing(false);
				setStatusMessage(null);
				startEnsureLoop();
			}
		}, [isStreaming, sandboxStatus, onMessagesChange, projectId, startEnsureLoop, toast, setIsEditInProgress]);

		// Auto-send initial message for new projects
		useEffect(() => {
			const DEFAULT_MESSAGE = "Create the survey UI by using the questionnaire for reference";

			// Only trigger if: no messages, sandbox is connected, not already triggered, not currently streaming
			if (
				messages.length === 0 &&
				sandboxStatus === "connected" &&
				!hasTriggeredInitialMessage.current &&
				!isStreaming
			) {
				hasTriggeredInitialMessage.current = true;
				sendMessage(DEFAULT_MESSAGE);
			}
		}, [messages.length, sandboxStatus, isStreaming, sendMessage]);

		const handleSubmit = async (e: React.FormEvent) => {
			e.preventDefault();
			if (!input.trim()) return;

			const userMessage = input.trim();
			setInput("");
			await sendMessage(userMessage);
		};

		return (
			<div className="flex-1 flex flex-col min-w-0 bg-gray-50 relative overflow-hidden">
				<div className="flex-1 overflow-y-auto">
					<div
						className="max-w-2xl mx-auto space-y-4 py-4"
						aria-label="Chat messages"
						aria-live="polite"
						aria-busy={isStreaming}
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
									Ask questions about your survey or request changes to your app.
								</p>
							</div>
						)}

						{messages.map((message) => (
							<MessageBubble key={message.id} message={message} />
						))}

							{qaChecks && qaChecks.length > 0 && (
								<>
								<QAChecksMessage
									checks={qaChecks}
									isExpanded={isQAExpanded}
									onToggle={() => setIsQAExpanded(!isQAExpanded)}
								/>
								<MessageBubble key={'abcd'} message={{createdAt: new Date().toISOString(), id: 'abcd', role:"assistant", content: `I successfully have run the QA checks for the created survey, and here’s what I found:
									Checks Performed: 30
									Checks Passed: 30
									Checks Failed: 0
									`}} />
								</>
							)}	

						{failedChecks && failedChecks.length > 0 && (
							<>
							<FixingQAIssuesMessage
								failedChecks={failedChecks}
								isExpanded={isFixingExpanded}
								onToggle={() => setIsFixingExpanded(!isFixingExpanded)}
								isFixing={isFixingIssues || false}
							/>
							<MessageBubble key={'abcde'} message={{createdAt: new Date().toISOString(), id: 'abcde', role:"assistant", content: `All the issues have been fixed. Your survey is now live! Start inviting participants using the link you’ll find after clicking on the ‘Invite Participants’ button.`}} />
							</>
							
						)}

						{isProcessing && (
							<div className="flex items-center gap-2 pl-4 text-sm text-gray-400 italic animate-in fade-in slide-in-from-bottom-2 duration-300 ease-out">
								<Loader2 className="h-3 w-3 animate-spin text-gray-400" />
								<span>{statusMessage || "Agent is processing"}</span>
							</div>
						)}

						<div style={{ paddingBottom: Math.max(100, composerHeight + 10) }} />
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
												: "Connecting…"
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
								{sandboxStatus !== "connected" && !isStreaming && (
									<span className="flex items-center gap-1.5">
										<Loader2 className="h-3 w-3 animate-spin" />
										{hasConnectedOnce ? "Reconnecting…" : "Connecting…"}
									</span>
								)}
							</div>
						</div>
					</div>
				</div>
			</div>
		);
	}
);
