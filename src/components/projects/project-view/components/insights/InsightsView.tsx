"use client";

import { useState, useRef, useEffect } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { FileText, Send, Upload } from "lucide-react";
import { cn } from "@/lib/utils";
import Image from "next/image";

interface Slide {
	id: string;
	title: string;
	thumbnail: string;
	content: any;
}

interface Message {
	id: string;
	role: "user" | "assistant";
	content: string;
	timestamp: Date;
}

// Mock slides data - replace with actual data later
const mockSlides: Slide[] = [
	{
		id: "slide-1",
		title: "Outline Presentation",
		thumbnail: "/images/slide-1.png",
		content: {
			title: "Outline Presentation",
			description: "Ut enim ad minima veniam, quis nostrum exercitationem ullam corporis suscipit laboriosam, nisi ut al",
			sections: [
				"01 Glimpse of the product",
				"02 Build our market",
				"03 What make us special",
				"04 Sales Report"
			]
		}
	},
	{
		id: "slide-2",
		title: "Building our market",
		thumbnail: "/images/slide-1.png",
		content: {}
	},
	{
		id: "slide-3",
		title: "Market Analysis",
		thumbnail: "/images/slide-1.png",
		content: {}
	},
	{
		id: "slide-4",
		title: "Product Features",
		thumbnail: "/images/slide-1.png",
		content: {}
	},
	{
		id: "slide-5",
		title: "Sales Report",
		thumbnail: "/images/slide-1.png",
		content: {}
	},
];

// Message Bubble Component
function MessageBubble({ message }: { message: Message }) {
	return (
		<div
			className={cn(
				"flex animate-in fade-in slide-in-from-bottom-3 duration-300",
				message.role === "user" ? "justify-end" : "justify-start"
			)}
		>
			{message.role === "user" ? (
				<div className="max-w-[80%] rounded-2xl border border-gray-200 bg-gray-100/60 px-4 py-2.5 text-sm leading-relaxed text-gray-900 shadow-sm">
					{message.content}
				</div>
			) : (
				<div className="max-w-[80%] rounded-2xl bg-white border border-gray-200 px-4 py-2.5 text-sm leading-relaxed text-gray-900 shadow-sm">
					{message.content}
				</div>
			)}
		</div>
	);
}

export function InsightsView() {
	const [selectedSlideId, setSelectedSlideId] = useState<string>(mockSlides[0]?.id || "");
	const [chatInput, setChatInput] = useState("");
	const [messages, setMessages] = useState<Message[]>([]);
	const [isLoading, setIsLoading] = useState(false);
	const messagesEndRef = useRef<HTMLDivElement>(null);

	// Auto-scroll to bottom when messages change
	useEffect(() => {
		messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
	}, [messages]);

	const handleSendMessage = async () => {
		if (!chatInput.trim()) return;

		// Add user message
		const userMessage: Message = {
			id: `user-${Date.now()}`,
			role: "user",
			content: chatInput,
			timestamp: new Date(),
		};

		setMessages(prev => [...prev, userMessage]);
		setChatInput("");
		setIsLoading(true);

		// Simulate AI response (replace with actual API call)
		setTimeout(() => {
			const assistantMessage: Message = {
				id: `assistant-${Date.now()}`,
				role: "assistant",
				content: "I'll help you create your presentation. Let me add that to your slides.",
				timestamp: new Date(),
			};
			setMessages(prev => [...prev, assistantMessage]);
			setIsLoading(false);
		}, 1000);
	};

	return (
		<div className="flex h-full w-full bg-[#F9FAFB] p-5">
			{/* Left Side - Slides Panel (70%) */}
			<div className="flex flex-col border-r border-gray-200" style={{ flexBasis: "60%", flexGrow: 0, flexShrink: 0, maxWidth: "60%" }}>
				{/* <div className="px-4 py-3 border-b border-gray-200">
					<h3 className="text-sm font-semibold text-gray-900">Slides</h3>
				</div> */}
				<ScrollArea className="flex-1">
					<div className="p-3 space-y-2">
						{mockSlides.map((slide, index) => (
							<button
								key={slide.id}
								onClick={() => setSelectedSlideId(slide.id)}
								className={cn(
									"w-full rounded-lg border-2 transition-all overflow-hidden group",
									selectedSlideId === slide.id
										? "border-burgundy-500 shadow-md"
										: "border-gray-200 hover:border-gray-300 hover:shadow-sm"
								)}
							>
								{/* Slide Number Badge */}
								<div className="relative">
									<div className="absolute top-2 left-2 bg-white/90 backdrop-blur-sm rounded px-2 py-0.5 text-xs font-medium text-gray-700 shadow-sm">
										{index + 1}
									</div>
									{/* Slide Thumbnail */}
									<div className=" bg-gray-100 flex items-center justify-center">
										<Image src={slide.thumbnail} alt={slide.title} width={900} height={900} className="object-cover" />
									</div>
								</div>
								{/* Slide Title */}
								<div className="px-3 py-2 bg-gray-50 border-t border-gray-200">
									<p className="text-xs font-medium text-gray-900 truncate text-left">
										{slide.title}
									</p>
								</div>
							</button>
						))}
					</div>
				</ScrollArea>
			</div>

			{/* Right Side - Chat Panel (30%) */}
			<div className="flex flex-col bg-gray-50" style={{ flexBasis: "40%", flexGrow: 0, flexShrink: 0, maxWidth: "40%" }}>
				{/* Chat Messages Area */}
				{messages.length === 0 ? (
					/* Empty State */
					<div className="flex-1 flex flex-col items-center justify-center px-8 py-12">
						{/* Icon */}
						<div className="mb-6 p-4 bg-[#E0BFD8] rounded-2xl">
							<FileText className="h-6 w-6 text-gray-800" />
						</div>

						{/* Title */}
						<h2 className="text-xl font-semibold text-gray-900 mb-3 text-center">
							Create your presentation
						</h2>

						{/* Subtitle */}
						<p className="text-sm text-gray-500 text-center max-w-md">
							Ask AI to add charts, insights, styling as per your liking
						</p>
					</div>
				) : (
					/* Messages List */
					<ScrollArea className="flex-1 px-6 py-4">
						<div className="space-y-4">
							{messages.map((message) => (
								<MessageBubble key={message.id} message={message} />
							))}
							{isLoading && (
								<div className="flex justify-start">
									<div className="max-w-[80%] rounded-2xl bg-white border border-gray-200 px-4 py-2.5 text-sm leading-relaxed text-gray-500">
										<div className="flex items-center gap-2">
											<div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
											<div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
											<div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
										</div>
									</div>
								</div>
							)}
							<div ref={messagesEndRef} />
						</div>
					</ScrollArea>
				)}

				{/* Chat Input - Fixed at Bottom */}
				<div className="px-6 py-6 bg-gray-50">
					<div className="relative">
						{/* Input Textarea */}
						<Textarea
							value={chatInput}
							onChange={(e) => setChatInput(e.target.value)}
							onKeyDown={(e) => {
								if (e.key === "Enter" && !e.shiftKey) {
									e.preventDefault();
									handleSendMessage();
								}
							}}
							placeholder="Ask, Search or Chat..."
							className="min-h-[100px] max-h-[200px] resize-none pr-14 pb-12 text-sm rounded-2xl border-gray-300 bg-white"
						/>

						{/* Upload doc button - bottom left inside textarea */}
						<Button
							variant="ghost"
							size="sm"
							className="absolute left-3 bottom-3 text-xs h-8 gap-1.5 text-gray-600 border-gray-200 border-2 rounded-full hover:text-gray-900"
						>
							<Upload className="h-3.5 w-3.5" />
							Upload doc
						</Button>

						{/* Send button - bottom right outside */}
						<Button
							onClick={handleSendMessage}
							disabled={!chatInput.trim()}
							className="absolute -right-1 bottom-2 bg-gray-900 hover:bg-gray-800 text-white h-11 w-11 p-0 rounded-full shadow-lg"
						>
							<Send className="h-4 w-4" />
						</Button>
					</div>
				</div>
			</div>
		</div>
	);
}
