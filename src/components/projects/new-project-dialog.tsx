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
	const [files, setFiles] = useState<File[]>([]);
	const [creating, setCreating] = useState(false);
	const fileInputRef = useRef<HTMLInputElement>(null);
	const router = useRouter();
	const { toast } = useToast();

	const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
		const selectedFiles = Array.from(e.target.files || []);
		if (selectedFiles.length === 0) return;

		// Allow any file type for upload
		setFiles((prev) => [...prev, ...selectedFiles]);
	};

	// Helper: Convert PDF/DOCX to markdown using the extract-text API
	const convertDocumentToMarkdown = async (file: File): Promise<{ name: string; content: string } | null> => {
		try {
			const formData = new FormData();
			formData.append("file", file);

			const response = await fetch("/api/extract-text", {
				method: "POST",
				body: formData,
			});

			if (!response.ok) {
				console.warn(`Failed to convert ${file.name}:`, await response.text());
				return null;
			}

			const { text } = await response.json();
			
			// Create markdown filename
			const baseName = file.name.replace(/\.(pdf|docx)$/i, "");
			return {
				name: `${baseName}.md`,
				content: text,
			};
		} catch (error) {
			console.error(`Error converting ${file.name}:`, error);
			return null;
		}
	};

	// Helper: Check if file should be converted
	const shouldConvertFile = (filename: string): boolean => {
		const ext = filename.toLowerCase();
		return ext.endsWith(".pdf") || ext.endsWith(".docx");
	};

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();

		const objectiveText = inputMode === "text" ? objective : "";

		if (!name.trim()) {
			toast({
				variant: "destructive",
				title: "Missing fields",
				description: "Please provide a project name.",
			});
			return;
		}

		if (inputMode === "text" && !objectiveText.trim()) {
			toast({
				variant: "destructive",
				title: "Missing fields",
				description: "Please provide a research objective.",
			});
			return;
		}

		if (inputMode === "upload" && files.length === 0) {
			toast({
				variant: "destructive",
				title: "Missing files",
				description: "Please upload at least one file.",
			});
			return;
		}

		setCreating(true);

		try {
			// Process files: convert PDF/DOCX to markdown, keep others as-is
			let uploadedFiles: Array<{ name: string; contentBase64: string }> | undefined;
			
			if (inputMode === "upload" && files.length > 0) {
				const processedFiles: Array<{ name: string; contentBase64: string }> = [];
				
				for (const file of files) {
					// Check if this is a PDF or DOCX that needs conversion
					if (shouldConvertFile(file.name)) {
						toast({
							title: "Converting document",
							description: `Converting ${file.name} to text...`,
						});
						
						const converted = await convertDocumentToMarkdown(file);
						if (!converted) {
							// Conversion failed - stop project creation
							toast({
								variant: "destructive",
								title: "Conversion failed",
								description: `Could not convert ${file.name}. Please try a different file or format.`,
							});
							setCreating(false);
							return;
						}
						// Return converted markdown as base64
						const base64 = btoa(unescape(encodeURIComponent(converted.content)));
						processedFiles.push({ name: converted.name, contentBase64: base64 });
					} else {
						// For non-convertible files, upload as-is
						const arrayBuffer = await file.arrayBuffer();
						const bytes = new Uint8Array(arrayBuffer);
						let binary = "";
						for (let i = 0; i < bytes.byteLength; i++) {
							binary += String.fromCharCode(bytes[i]);
						}
						const base64 = btoa(binary);
						processedFiles.push({ name: file.name, contentBase64: base64 });
					}
				}
				
				uploadedFiles = processedFiles;
			}

			const res = await fetch("/api/projects", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					name: name.trim(),
					inputMode,
					objectiveText: objectiveText.trim() || undefined,
					uploadedFiles,
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
		setFiles([]);
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
							Start a new research project with your objective or upload files.
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
									<div className="space-y-3">
										<div
											className="border border-dashed border-gray-300 rounded-md p-6 text-center cursor-pointer hover:border-gray-400 transition-colors"
											onClick={() => fileInputRef.current?.click()}
										>
											<Upload className="h-6 w-6 mx-auto text-gray-400 mb-2" />
											<p className="text-sm text-gray-500">
												Click to upload files (any type)
											</p>
											<input
												ref={fileInputRef}
												type="file"
												multiple
												className="hidden"
												onChange={handleFileChange}
											/>
										</div>
										{files.length > 0 && (
											<div className="space-y-2">
												<Label className="text-xs text-gray-500">
													Selected Files ({files.length})
												</Label>
												<div className="space-y-1 max-h-40 overflow-y-auto">
													{files.map((file, index) => (
														<div
															key={index}
															className="flex items-center gap-2 p-2.5 bg-gray-50 rounded-md border border-gray-200"
														>
															<FileText className="h-4 w-4 text-gray-500 flex-shrink-0" />
															<span className="text-sm flex-1 truncate text-gray-700">
																{file.name}
															</span>
															<span className="text-xs text-gray-400 flex-shrink-0">
																{(file.size / 1024).toFixed(1)} KB
															</span>
															<button
																type="button"
																className="text-gray-400 hover:text-gray-600 flex-shrink-0"
																onClick={() => {
																	setFiles((prev) =>
																		prev.filter((_, i) => i !== index)
																	);
																}}
															>
																<X className="h-4 w-4" />
															</button>
														</div>
													))}
												</div>
											</div>
										)}
									</div>
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
							disabled={creating}
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
