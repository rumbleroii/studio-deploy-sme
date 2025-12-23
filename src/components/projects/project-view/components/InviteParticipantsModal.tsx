"use client";

import { useState } from "react";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Link2, Copy } from "lucide-react";
import { cn } from "@/lib/utils";

interface InviteParticipantsModalProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	surveyUrl: string;
}

export function InviteParticipantsModal({
	open,
	onOpenChange,
	surveyUrl,
}: InviteParticipantsModalProps) {
	const [criteria, setCriteria] = useState("");
	const { toast } = useToast();

	const handleCopyLink = async () => {
		try {
			await navigator.clipboard.writeText(surveyUrl);
			toast({
				title: "Link copied!",
				description: "Survey link has been copied to clipboard",
			});
		} catch (error) {
			toast({
				variant: "destructive",
				title: "Failed to copy",
				description: "Could not copy link to clipboard",
			});
		}
	};

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="max-w-xl p-0 gap-0">
				<DialogHeader className="px-8 pt-8 pb-4">
					<DialogTitle className="text-xl font-semibold text-gray-900">
						Invite Participants
					</DialogTitle>
					<p className="text-md text-gray-500 mt-2 font-normal">
						Copy the link to directly share with participants or find participants
						through our partners
					</p>
				</DialogHeader>

				<div className="px-8 pb-8 space-y-6">
					{/* Survey Link Section */}
					<div className="flex items-center gap-3 bg-gray-50 border border-gray-200 rounded-lg p-2">
						<Link2 className="h-5 w-5 text-gray-400 flex-shrink-0" />
						<input
							type="text"
							value={surveyUrl}
							readOnly
							className="flex-1 bg-transparent text-gray-900 text-sm outline-none"
						/>
						<Button
							onClick={handleCopyLink}
							variant="ghost"
							className="gap-2 text-gray-700 hover:text-gray-900 hover:bg-gray-100"
						>
							<Copy className="h-4 w-4" />
							Copy Link
						</Button>
					</div>

					{/* Divider */}
					<div className="relative">
						<div className="absolute inset-0 flex items-center">
							<div className="w-full border-t border-gray-200" />
						</div>
						<div className="relative flex justify-center">
							<span className="bg-white px-4 text-sm text-gray-500">or</span>
						</div>
					</div>

					{/* Panel Provider Section */}
					<div>
						<div className="flex items-center gap-3 mb-4">
							<h3 className="text-lg font-medium text-gray-900">
								Choose Panel Provider
							</h3>
							<span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
								Coming Soon
							</span>
						</div>

						<label className="block text-md text-gray-600 mb-2">
							Tell us what you are looking for
						</label>
						<Textarea
							value={criteria}
							onChange={(e) => setCriteria(e.target.value)}
							placeholder="Age >30, living in New York, SF and Texas, working in Investment Banking"
							className="min-h-[120px] resize-none text-md"
							disabled
						/>
					</div>
				</div>
			</DialogContent>
		</Dialog>
	);
}
