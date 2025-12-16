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
import { Send, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { MarkdownMessage } from "./MarkdownMessage";
import type { Message } from "../types";
import type { SandboxStatus } from "../hooks/useSandboxConnection";

interface MessageBubbleProps {
	message: Message;
}

const MessageBubble = memo(function MessageBubble({
	message,
}: MessageBubbleProps) {
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
						content={message.content}
					/>
				</div>
			) : (
				<div className="max-w-[70ch] py-1 text-sm leading-7 text-gray-900">
					<MarkdownMessage content={message.content} />
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
		const [streamingContent, setStreamingContent] = useState("");
		const [composerHeight, setComposerHeight] = useState(120);

		const inputRef = useRef<HTMLTextAreaElement>(null);
		const formRef = useRef<HTMLFormElement>(null);
		const composerRef = useRef<HTMLDivElement>(null);
		const messagesEndRef = useRef<HTMLDivElement>(null);

		const { toast } = useToast();

		useImperativeHandle(ref, () => ({
			focusInput: () => inputRef.current?.focus(),
		}));

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
			onMessagesChange((prev) => [...prev, tempUserMsg]);
			setIsStreaming(true);
			setStreamingContent("");

			let shouldReconnect = false;
			try {
				const res = await fetch(`/api/projects/${projectId}/chat`, {
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
					onMessagesChange((prev) => [...prev, assistantMsg]);
				}
			} catch (error) {
				console.error("Chat error:", error);
				toast({
					variant: "destructive",
					title: "Chat failed",
					description: "Could not send message. Please try again.",
				});
				// Remove the optimistic user message on error
				onMessagesChange((prev) => prev.filter((m) => m.id !== tempUserMsg.id));

				if (shouldReconnect) startEnsureLoop();
			} finally {
				setIsStreaming(false);
				setStreamingContent("");
				if (!shouldReconnect) inputRef.current?.focus();
			}
		};

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
							<MessageBubble key={message.id} message={message} />
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
