"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import {
	ArrowLeft,
	Send,
	Loader2,
	FileText,
	Bot,
	User,
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
	const scrollRef = useRef<HTMLDivElement>(null);
	const inputRef = useRef<HTMLInputElement>(null);
	const { toast } = useToast();

	// Auto-scroll to bottom when messages change
	useEffect(() => {
		if (scrollRef.current) {
			scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
		}
	}, [messages, streamingContent]);

	// Ensure sandbox is ready on mount
	useEffect(() => {
		fetch(`/api/projects/${project.id}/sandbox/ensure`, {
			method: "POST",
		}).catch(() => {
			// Silently fail - sandbox will be created on first message if needed
		});
	}, [project.id]);

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!input.trim() || isStreaming) return;

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

		try {
			const res = await fetch(`/api/projects/${project.id}/chat`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ message: userMessage }),
			});

			if (!res.ok) {
				throw new Error("Chat request failed");
			}

			const reader = res.body?.getReader();
			if (!reader) throw new Error("No reader");

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
		} finally {
			setIsStreaming(false);
			setStreamingContent("");
			inputRef.current?.focus();
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

	return (
		<div className="h-[calc(100vh)] flex flex-col">
			{/* Header */}
			<div className="h-14 border-b border-gray-200 bg-white px-4 flex items-center gap-3 shrink-0">
				<Link href="/projects">
					<Button
						variant="ghost"
						size="smallIcon"
						icon={<ArrowLeft className="h-4 w-4" />}
						className="text-gray-500 hover:text-gray-700 hover:bg-gray-100"
					/>
				</Link>
				<div className="flex-1 min-w-0">
					<h1 className="text-sm font-semibold text-gray-900 truncate">
						{project.name}
					</h1>
				</div>
				<Button
					variant="ghost"
					size="smallIcon"
					className="text-gray-500 hover:text-gray-700 hover:bg-gray-100"
					onClick={() => setShowContext(!showContext)}
					icon={showContext ? (
						<PanelRightClose className="h-4 w-4" />
					) : (
						<PanelRight className="h-4 w-4" />
					)}
				/>
			</div>

			{/* Main content */}
			<div className="flex-1 flex overflow-hidden">
				{/* Chat panel */}
				<div className="flex-1 flex flex-col min-w-0 bg-[#fafafa]">
					<ScrollArea ref={scrollRef} className="flex-1 p-4">
						<div className="max-w-2xl mx-auto space-y-4">
							{messages.length === 0 && !isStreaming && (
								<div className="text-center py-16">
									<div className="w-12 h-12 mx-auto mb-4 rounded-full bg-[#3D1C35]/5 flex items-center justify-center">
										<Image
											src="/metaforms-logo.svg"
											alt="AI"
											width={24}
											height={24}
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
												? "bg-[#3D1C35] text-white border-[#3D1C35]"
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
												className="opacity-90"
											/>
										)}
									</div>
									<div
										className={cn(
											"rounded-2xl px-5 py-3.5 max-w-[80%] text-sm leading-relaxed shadow-sm",
											message.role === "user"
												? "bg-[#3D1C35] text-white rounded-tr-none"
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
											className="opacity-90 animate-pulse"
										/>
									</div>
									<div className="rounded-2xl rounded-tl-none px-5 py-3.5 bg-white border border-gray-100 shadow-sm">
										<Loader2 className="h-4 w-4 animate-spin text-[#3D1C35]" />
									</div>
								</div>
							)}
						</div>
					</ScrollArea>

					{/* Input */}
					<div className="border-t border-gray-100 p-4 bg-white">
						<form
							onSubmit={handleSubmit}
							className="max-w-2xl mx-auto flex gap-3"
						>
							<Input
								ref={inputRef}
								placeholder="Ask Metaforms Copilot..."
								value={input}
								onChange={(e) => setInput(e.target.value)}
								disabled={isStreaming}
								className="flex-1 h-11 border-gray-200 focus:border-[#3D1C35] focus:ring-0 text-sm shadow-sm rounded-lg"
							/>
							<Button
								type="submit"
								disabled={isStreaming || !input.trim()}
								size="icon"
								icon={isStreaming ? (
									<Loader2 className="h-4 w-4 animate-spin" />
								) : (
									<Send className="h-4 w-4" />
								)}
								className="h-11 w-11 bg-[#3D1C35] hover:bg-[#5D3A54] text-white rounded-lg shadow-sm"
							/>
						</form>
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
						<ScrollArea className="flex-1 p-4">
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
						</ScrollArea>
					</div>
				)}
			</div>
		</div>
	);
}
