"use client";

import { useState, useRef } from "react";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Plus, Upload, FileText, Loader2, X, ChevronDown } from "lucide-react";

export function NewProjectDialog() {
	const [open, setOpen] = useState(false);
	const [name, setName] = useState("");
	const [objective, setObjective] = useState("");
	const [inputMode, setInputMode] = useState<"text" | "upload">("text");
	const [file, setFile] = useState<File | null>(null);
	const [extractedText, setExtractedText] = useState("");
	const [extracting, setExtracting] = useState(false);
	const [creating, setCreating] = useState(false);
	const fileInputRef = useRef<HTMLInputElement>(null);
	const router = useRouter();
	const { toast } = useToast();

	const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
		const selectedFile = e.target.files?.[0];
		if (!selectedFile) return;

		const validTypes = [
			"application/pdf",
			"application/vnd.openxmlformats-officedocument.wordprocessingml.document",
		];

		if (!validTypes.includes(selectedFile.type)) {
			toast({
				variant: "destructive",
				title: "Invalid file type",
				description: "Please upload a PDF or DOCX file.",
			});
			return;
		}

		setFile(selectedFile);
		setExtracting(true);

		try {
			const formData = new FormData();
			formData.append("file", selectedFile);

			const res = await fetch("/api/extract-text", {
				method: "POST",
				body: formData,
			});

			if (!res.ok) {
				throw new Error("Failed to extract text");
			}

			const data = await res.json();
			setExtractedText(data.text);
		} catch {
			toast({
				variant: "destructive",
				title: "Extraction failed",
				description: "Could not extract text from the file.",
			});
			setFile(null);
		} finally {
			setExtracting(false);
		}
	};

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();

		const objectiveText = inputMode === "text" ? objective : extractedText;

		if (!name.trim() || !objectiveText.trim()) {
			toast({
				variant: "destructive",
				title: "Missing fields",
				description: "Please provide a project name and research objective.",
			});
			return;
		}

		setCreating(true);

		try {
			const res = await fetch("/api/projects", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					name: name.trim(),
					researchObjectiveText: objectiveText.trim(),
					objectiveSource: inputMode,
				}),
			});

			if (!res.ok) {
				throw new Error("Failed to create project");
			}

			const project = await res.json();
			setOpen(false);
			router.push(`/projects/${project.id}`);
			router.refresh();
		} catch {
			toast({
				variant: "destructive",
				title: "Creation failed",
				description: "Could not create the project.",
			});
		} finally {
			setCreating(false);
		}
	};

	const resetForm = () => {
		setName("");
		setObjective("");
		setFile(null);
		setExtractedText("");
		setInputMode("text");
	};

	return (
		<Dialog
			open={open}
			onOpenChange={(v) => {
				setOpen(v);
				if (!v) resetForm();
			}}
		>
			<DialogTrigger asChild>
				<Button className="h-9 font-medium text-sm rounded-md gap-2">
					New Project
					<ChevronDown className="h-4 w-4" />
				</Button>
			</DialogTrigger>
			<DialogContent className="sm:max-w-lg bg-white border-gray-200 rounded-lg p-0 gap-0 overflow-hidden">
				<form onSubmit={handleSubmit} className="overflow-hidden">
					<DialogHeader className="px-6 pt-6 pb-4 border-b border-gray-200">
						<DialogTitle className="text-base font-semibold text-gray-900">
							Create New Project
						</DialogTitle>
						<DialogDescription className="text-sm text-gray-500">
							Start a new research project with your objective or client brief.
						</DialogDescription>
					</DialogHeader>

					<div className="px-6 py-4 space-y-4">
						<div className="space-y-1.5">
							<Label
								htmlFor="name"
								className="text-sm font-medium text-gray-700"
							>
								Project Name
							</Label>
							<Input
								id="name"
								placeholder="e.g., Market Research Q1 2024"
								value={name}
								onChange={(e) => setName(e.target.value)}
								disabled={creating}
								className="h-9 border-gray-200 focus:border-coral-500 focus:ring-0"
							/>
						</div>

						<div className="space-y-1.5">
							<Label className="text-sm font-medium text-gray-700">
								Research Objective
							</Label>
							<Tabs
								value={inputMode}
								onValueChange={(v) => setInputMode(v as "text" | "upload")}
							>
								<TabsList className="grid w-full grid-cols-2 bg-gray-100 p-1 rounded-md h-9">
									<TabsTrigger
										value="text"
										disabled={creating}
										className="text-sm rounded data-[state=active]:bg-white data-[state=active]:text-gray-900 data-[state=inactive]:text-gray-500 h-7"
									>
										<FileText className="h-3.5 w-3.5 mr-1.5" />
										Type Text
									</TabsTrigger>
									<TabsTrigger
										value="upload"
										disabled={creating}
										className="text-sm rounded data-[state=active]:bg-white data-[state=active]:text-gray-900 data-[state=inactive]:text-gray-500 h-7"
									>
										<Upload className="h-3.5 w-3.5 mr-1.5" />
										Upload File
									</TabsTrigger>
								</TabsList>

								<TabsContent value="text" className="mt-3">
									<Textarea
										placeholder="Describe your research objective..."
										className="min-h-[120px] border-gray-200 focus:border-coral-500 focus:ring-0 text-sm"
										value={objective}
										onChange={(e) => setObjective(e.target.value)}
										disabled={creating}
									/>
								</TabsContent>

								<TabsContent value="upload" className="mt-3">
									{!file ? (
										<div
											className="border border-dashed border-gray-300 rounded-md p-6 text-center cursor-pointer hover:border-gray-400 transition-colors"
											onClick={() => fileInputRef.current?.click()}
										>
											<Upload className="h-6 w-6 mx-auto text-gray-400 mb-2" />
											<p className="text-sm text-gray-500">
												Click to upload a PDF or DOCX file
											</p>
											<input
												ref={fileInputRef}
												type="file"
												className="hidden"
												accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
												onChange={handleFileChange}
											/>
										</div>
									) : (
										<div className="space-y-3">
											<div className="flex items-center gap-2 p-2.5 bg-gray-50 rounded-md border border-gray-200">
												<FileText className="h-4 w-4 text-gray-500" />
												<span className="text-sm flex-1 truncate text-gray-700">
													{file.name}
												</span>
												{!extracting && (
													<button
														type="button"
														className="text-gray-400 hover:text-gray-600"
														onClick={() => {
															setFile(null);
															setExtractedText("");
														}}
													>
														<X className="h-4 w-4" />
													</button>
												)}
											</div>
											{extracting ? (
												<div className="flex items-center justify-center py-4">
													<Loader2 className="h-4 w-4 animate-spin text-gray-400" />
													<span className="ml-2 text-sm text-gray-500">
														Extracting text...
													</span>
												</div>
											) : extractedText ? (
												<div className="space-y-1.5">
													<Label className="text-xs text-gray-500">
														Extracted Text Preview
													</Label>
													<Textarea
														className="min-h-[100px] text-sm border-gray-200 focus:border-coral-500 focus:ring-0"
														value={extractedText}
														onChange={(e) => setExtractedText(e.target.value)}
														disabled={creating}
													/>
												</div>
											) : null}
										</div>
									)}
								</TabsContent>
							</Tabs>
						</div>
					</div>

					<DialogFooter className="px-6 py-4 border-t border-gray-200 bg-gray-50">
						<Button
							type="button"
							variant="outline"
							onClick={() => setOpen(false)}
							disabled={creating}
							className="h-9 border-gray-200 text-gray-600 hover:bg-gray-100 font-medium text-sm"
						>
							Cancel
						</Button>
						<Button
							type="submit"
							disabled={creating || extracting}
							className="h-9 font-medium text-sm"
						>
							{creating && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
							Create Project
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}
