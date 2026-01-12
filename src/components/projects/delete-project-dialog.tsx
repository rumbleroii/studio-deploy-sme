"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Trash2, Loader2, AlertTriangle } from "lucide-react";

interface DeleteProjectDialogProps {
	projectId: string;
	projectName: string;
}

export function DeleteProjectDialog({
	projectId,
	projectName,
}: DeleteProjectDialogProps) {
	const [open, setOpen] = useState(false);
	const [deleting, setDeleting] = useState(false);
	const router = useRouter();
	const { toast } = useToast();

	const handleDelete = async () => {
		setDeleting(true);

		try {
			const res = await fetch(`/api/projects/${projectId}`, {
				method: "DELETE",
			});

			if (!res.ok) {
				const error = await res.json();
				throw new Error(error.error || "Failed to delete project");
			}

			toast({
				title: "Project deleted",
				description: `"${projectName}" has been permanently deleted.`,
			});

			setOpen(false);
			router.refresh();
		} catch (error) {
			toast({
				variant: "destructive",
				title: "Deletion failed",
				description:
					error instanceof Error
						? error.message
						: "Could not delete the project.",
			});
		} finally {
			setDeleting(false);
		}
	};

	return (
		<>
			<button
				type="button"
				className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors z-10 relative pointer-events-auto"
				onClick={(e) => {
					e.preventDefault();
					e.stopPropagation();
					console.log("Delete button clicked for project:", projectName);
					setOpen(true);
				}}
				title="Delete project"
			>
				<Trash2 className="h-4 w-4 pointer-events-none" />
			</button>

			<Dialog open={open} onOpenChange={setOpen}>
				<DialogContent className="sm:max-w-md bg-white border-gray-200 rounded-lg z-[100]">
				<DialogHeader>
					<div className="flex items-center gap-3 mb-2">
						<div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
							<AlertTriangle className="h-5 w-5 text-red-600" />
						</div>
						<DialogTitle className="text-base font-semibold text-gray-900">
							Delete Project
						</DialogTitle>
					</div>
					<DialogDescription className="text-sm text-gray-600">
						Are you sure you want to delete{" "}
						<span className="font-semibold text-gray-900">"{projectName}"</span>?
						This action cannot be undone and will permanently delete all associated
						data, messages, and files.
					</DialogDescription>
				</DialogHeader>

				<DialogFooter className="gap-2 sm:gap-2">
					<Button
						type="button"
						variant="outline"
						onClick={() => setOpen(false)}
						disabled={deleting}
						className="h-9 border-gray-200 text-gray-600 hover:bg-gray-100 font-medium text-sm"
					>
						Cancel
					</Button>
					<Button
						type="button"
						onClick={handleDelete}
						disabled={deleting}
						className="h-9 bg-red-600 hover:bg-red-700 text-white font-medium text-sm"
					>
						{deleting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
						Delete Project
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
		</>
	);
}
