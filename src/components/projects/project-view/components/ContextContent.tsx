"use client";

import { memo, useMemo } from "react";
import { FileText } from "lucide-react";
import type { Message } from "../types";

interface ContextContentProps {
	objectiveText?: string;
	messages: Message[];
}

export const ContextContent = memo(function ContextContent({
	objectiveText,
	messages,
}: ContextContentProps) {
	// Extract artefacts from messages (code blocks, etc.)
	const artefacts = useMemo(() => {
		return messages
			.filter((m) => m.role === "assistant")
			.flatMap((m) => {
				const codeBlocks = m.content.match(/```[\s\S]*?```/g) || [];
				return codeBlocks.map((block, idx) => ({
					id: `${m.id}-${idx}`,
					content: block,
				}));
			})
			.slice(-3); // Show last 3 artefacts
	}, [messages]);

	return (
		<div className="space-y-4">
			{/* Research objective */}
			<div>
				<div className="flex items-center gap-2 mb-2">
					<FileText className="h-4 w-4 text-gray-400" />
					<span className="text-xs font-medium text-gray-500 uppercase tracking-wider">
						Objective
					</span>
				</div>
				{objectiveText ? (
					<p className="text-sm text-gray-600 leading-relaxed">
						{objectiveText.slice(0, 500)}
						{objectiveText.length > 500 && "..."}
					</p>
				) : (
					<p className="text-sm text-gray-500 leading-relaxed">
						No objective file found yet. Create{" "}
						<code className="text-xs">inputs/research_objective.txt</code> in
						the Files panel.
					</p>
				)}
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
});
