"use client";

import { useState, useRef, useMemo } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog";
import { ArrowLeft, PanelRightClose, PanelRight, FileText, Eye, Globe, Loader2, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";

import { useSandboxConnection } from "./hooks/useSandboxConnection";
import { useProjectFiles } from "./hooks/useProjectFiles";
import { ChatPanel, type ChatPanelHandle } from "./components/ChatPanel";
import { FilesPanel } from "./components/FilesPanel";
import { PreviewPanel } from "./components/PreviewPanel";
import { TerminalPanel } from "./components/TerminalPanel";
import type { ProjectViewProps, Message } from "./types";

export function ProjectView({
	project,
	initialMessages,
	isDevMode = false,
}: ProjectViewProps) {
	const [showContext, setShowContext] = useState(true);
	const [activeTab, setActiveTab] = useState<"preview" | "files" | "terminal">(
		"preview"
	);
	const [activeMainTab, setActiveMainTab] = useState<"survey" | "data" | "insights">("survey");
	const [viewMode, setViewMode] = useState<"questionnaire" | "preview">("questionnaire");
	const [messages, setMessages] = useState<Message[]>(initialMessages);
	const [selectedFilePath, setSelectedFilePath] = useState<string | null>(null);
	const [isRunningQA, setIsRunningQA] = useState(false);
	const [qaChecks, setQaChecks] = useState<any[]>([]);
	const [failedChecks, setFailedChecks] = useState<any[]>([]);
	const [isFixingIssues, setIsFixingIssues] = useState(false);

	const chatPanelRef = useRef<ChatPanelHandle>(null);

	// Dummy QA checks data with proper codes
	const dummyQAChecks = [
		{ id: "check-intro1", name: "INTRO1", status: "pending" as const },
		{ id: "check-scr01", name: "SCR01", status: "pending" as const },
		{ id: "check-demo2", name: "DEMO2", status: "pending" as const },
		{ id: "check-term3", name: "TERM3", status: "pending" as const },
		{ id: "check-term6", name: "TERM6", status: "pending" as const },
		{ id: "check-q1", name: "Q1", status: "pending" as const },
		{ id: "check-q2", name: "Q2", status: "pending" as const },
		{ id: "check-q3", name: "Q3", status: "pending" as const },
		{ id: "check-q4", name: "Q4", status: "pending" as const },
		{ id: "check-q5", name: "Q5", status: "pending" as const },
	];

	const handleReviewAndPublish = async () => {
		setIsRunningQA(true);
		setQaChecks(dummyQAChecks);
		setFailedChecks([]); // Clear previous failed checks
		
		const failed: any[] = [];
		
		// Simulate running checks
		for (let i = 0; i < dummyQAChecks.length; i++) {
			await new Promise(resolve => setTimeout(resolve, 500));
			setQaChecks(prev => 
				prev.map((check, idx) => 
					idx === i ? { ...check, status: "running" } : check
				)
			);
			
			await new Promise(resolve => setTimeout(resolve, 300));
			const hasFailed = Math.random() > 0.5;
			
			setQaChecks(prev => 
				prev.map((check, idx) => {
					if (idx === i) {
						const updatedCheck = { 
							...check, 
							status: hasFailed ? "failed" : "passed",
							message: hasFailed ? "Check failed with error" : undefined
						};
						
						// Track failed checks
						if (hasFailed) {
							failed.push({
								id: `failed-${check.id}`,
								code: check.name,
								summary: "Failed Check Summary"
							});
						}
						
						return updatedCheck;
					}
					return check;
				})
			);
		}
		
		// After all checks complete, show fixing issues if there are failures
		await new Promise(resolve => setTimeout(resolve, 500));
		
		if (failed.length > 0) {
			setFailedChecks(failed);
			setIsFixingIssues(true);
			
			// Simulate fixing process
			await new Promise(resolve => setTimeout(resolve, 2000));
			setIsFixingIssues(false);
		}
		
		// Keep showing checks after completion
		// setIsRunningQA(false); // Keep this commented to show checks permanently
	};

	// Sandbox connection hook
	const {
		sandboxStatus,
		hasConnectedOnce,
		previewUrl,
		isLoadingPreview,
		startEnsureLoop,
	} = useSandboxConnection(project.id);

	// Files management hook
	const {
		fileTree,
		currentItems,
		breadcrumbs,
		filesLoading,
		uploadingFiles,
		isDraggingOver,
		fileInputRef,
		folderInputRef,
		fetchFiles,
		uploadFiles,
		deleteFile,
		downloadFile,
		createFolder,
		moveFile,
		navigateToFolder,
		handleDragOver,
		handleDragLeave,
		handleDrop,
	} = useProjectFiles(project.id, sandboxStatus);

	// Memoize files content to avoid re-renders on chat input changes
	const filesContent = useMemo(
		() => (
			<FilesPanel
				projectId={project.id}
				currentItems={currentItems}
				fileTree={fileTree}
				breadcrumbs={breadcrumbs}
				filesLoading={filesLoading}
				uploadingFiles={uploadingFiles}
				isDraggingOver={isDraggingOver}
				sandboxStatus={sandboxStatus}
				selectedFilePath={selectedFilePath}
				fileInputRef={fileInputRef}
				folderInputRef={folderInputRef}
				onUploadFiles={uploadFiles}
				onCreateFolder={createFolder}
				onFetchFiles={fetchFiles}
				onNavigateToFolder={(path) => {
					setSelectedFilePath(null);
					navigateToFolder(path);
				}}
				onSelectFile={(path) => {
					setSelectedFilePath(path);
					// Ensure breadcrumbs match the file's folder.
					const folderPath = path.split("/").slice(0, -1).join("/");
					navigateToFolder(folderPath);
					setActiveTab("files");
				}}
				onClearSelectedFile={() => setSelectedFilePath(null)}
				onDownloadFile={downloadFile}
				onDeleteFile={deleteFile}
				onMoveFile={moveFile}
				onDragOver={handleDragOver}
				onDragLeave={handleDragLeave}
				onDrop={handleDrop}
			/>
		),
		[
			currentItems,
			fileTree,
			breadcrumbs,
			filesLoading,
			uploadingFiles,
			isDraggingOver,
			sandboxStatus,
			selectedFilePath,
			fileInputRef,
			folderInputRef,
			uploadFiles,
			createFolder,
			fetchFiles,
			navigateToFolder,
			downloadFile,
			deleteFile,
			moveFile,
			handleDragOver,
			handleDragLeave,
			handleDrop,
		]
	);

	return (
		<div className="h-dvh flex flex-col">
			{/* Header */}
			<div className="h-14 border-b border-gray-200 bg-white px-4 flex items-center gap-3 shrink-0">
				<Link href="/projects">
					<Button
						variant="ghost"
						size="smallIcon"
						icon={<ArrowLeft className="h-4 w-4" />}
						aria-label="Back to projects"
						className="text-gray-500 hover:text-gray-700 hover:bg-gray-100"
					/>
				</Link>
				<div className="flex-1 min-w-0">
					<h1 className="text-sm font-semibold text-gray-900 truncate">
						{project.name}
					</h1>
				</div>
				<div className="hidden sm:flex items-center gap-2 text-xs text-gray-500">
					<span
						className={cn(
							"h-2 w-2 rounded-full",
							sandboxStatus === "connected" ? "bg-emerald-500" : "bg-amber-500"
						)}
					/>
					<span>
						{sandboxStatus === "connected" ? "Connected" : "Connecting…"}
					</span>
				</div>
				{/* <Button
					className="bg-burgundy-500 hover:bg-burgundy-600 text-white h-9 px-4 gap-2"
					size="sm"
					onClick={handleReviewAndPublish}
					disabled={isRunningQA}
				>
					{isRunningQA ? (
						<>
							<Loader2 className="h-4 w-4 animate-spin" />
							Running Quality Checks
						</>
					) : (
						<>
							<Globe className="h-4 w-4" />
							Review & Publish
						</>
					)}
				</Button> */}
				<Dialog>
					<DialogTrigger asChild>
						<Button
							variant="ghost"
							size="smallIcon"
							className="lg:hidden text-gray-500 hover:text-gray-700 hover:bg-gray-100"
							aria-label="Open panel"
							icon={<PanelRight className="h-4 w-4" />}
						/>
					</DialogTrigger>
					<DialogContent className="p-0 overflow-hidden max-w-lg">
						<DialogHeader className="px-4 py-3 border-b border-gray-200">
							<DialogTitle className="text-sm font-medium text-gray-900">
								Project Panel
							</DialogTitle>
							<DialogDescription className="sr-only">
								Research context and files for this project.
							</DialogDescription>
						</DialogHeader>
						<Tabs
							value={activeTab}
							onValueChange={(v) =>
								setActiveTab(v as "preview" | "files" | "terminal")
							}
							className="flex flex-col"
						>
							<TabsList
								className={cn(
									"mx-4 mt-2 grid w-auto",
									isDevMode ? "grid-cols-3" : "grid-cols-2"
								)}
							>
								<TabsTrigger value="preview" className="text-xs">
									Preview
								</TabsTrigger>
								<TabsTrigger value="files" className="text-xs">
									Files
								</TabsTrigger>
								{isDevMode && (
									<TabsTrigger value="terminal" className="text-xs">
										Terminal
									</TabsTrigger>
								)}
							</TabsList>
							<ScrollArea className="max-h-[60vh]">
								<TabsContent value="preview" className="p-4 mt-0">
									<PreviewPanel
										previewUrl={previewUrl}
										isLoadingPreview={isLoadingPreview}
										className="h-[50vh]"
									/>
								</TabsContent>
								<TabsContent value="files" className="p-4 mt-0 h-[50vh]">
									{filesContent}
								</TabsContent>
								{isDevMode && (
									<TabsContent value="terminal" className="p-0 mt-0 h-[50vh]">
										<TerminalPanel projectId={project.id} />
									</TabsContent>
								)}
							</ScrollArea>
						</Tabs>
					</DialogContent>
				</Dialog>
				<Button
					variant="ghost"
					size="smallIcon"
					className="hidden lg:inline-flex text-gray-500 hover:text-gray-700 hover:bg-gray-100"
					onClick={() => setShowContext(!showContext)}
					aria-label={
						showContext ? "Hide research context" : "Show research context"
					}
					icon={
						showContext ? (
							<PanelRightClose className="h-4 w-4" />
						) : (
							<PanelRight className="h-4 w-4" />
						)
					}
				/>
			</div>

			{/* Main Navigation Tabs */}
			{/* <div className="bg-white border-b border-gray-200 w-full">
				<div className="flex items-center px-4 justify-center">
					<button
						onClick={() => setActiveMainTab("survey")}
						className={cn(
							"px-4 py-3 text-sm font-medium border-b-2 transition-colors",
							activeMainTab === "survey"
								? "border-burgundy-500 text-gray-900"
								: "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
						)}
					>
						Survey
					</button>
					<button
						onClick={() => setActiveMainTab("data")}
						className={cn(
							"px-4 py-3 text-sm font-medium border-b-2 transition-colors",
							activeMainTab === "data"
								? "border-burgundy-500 text-gray-900"
								: "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
						)}
					>
						Data
					</button>
					<button
						onClick={() => setActiveMainTab("insights")}
						className={cn(
							"px-4 py-3 text-sm font-medium border-b-2 transition-colors",
							activeMainTab === "insights"
								? "border-burgundy-500 text-gray-900"
								: "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
						)}
					>
						Insights
					</button>
				</div>
			</div> */}

			{/* Main content */}
			<div className="flex-1 flex overflow-hidden">
				{activeMainTab === "survey" && (
					<>
					<div className={cn(
						"flex flex-col transition-all duration-300 ease-in-out",
						showContext ? "w-[40%]" : "w-full"
					)}>
					<ChatPanel
						ref={chatPanelRef}
						projectId={project.id}
						sandboxStatus={sandboxStatus}
						hasConnectedOnce={hasConnectedOnce}
						messages={messages}
						onMessagesChange={setMessages}
						startEnsureLoop={startEnsureLoop}
						qaChecks={qaChecks}
						isRunningQA={isRunningQA}
						failedChecks={failedChecks}
						isFixingIssues={isFixingIssues}
					/>
					</div>

						{/* Side panel with Questionnaire/Preview buttons - 60% width */}
						<div
							className={cn(
								"border-l border-gray-200 hidden lg:flex flex-col bg-white transition-all duration-300 ease-in-out overflow-hidden",
								showContext ? "w-[60%] opacity-100" : "w-0 opacity-0 border-l-0"
							)}
						>
							<div className="h-12 px-4 border-b border-gray-200 flex items-center justify-between shrink-0">
								{/* Left side - tabs for context/files */}
								<Tabs
									value={activeTab}
									onValueChange={(v) =>
										setActiveTab(v as "preview" | "terminal" | "files")
									}
								>
									<TabsList className="h-8 p-0.5">
										<TabsTrigger value="preview" className="text-xs h-7 px-3">
											Preview
										</TabsTrigger>
										{/* <TabsTrigger value="context" className="text-xs h-7 px-3">
											Context
										</TabsTrigger> */}
										<TabsTrigger value="files" className="text-xs h-7 px-3">
											Files
										</TabsTrigger>
									</TabsList>
								</Tabs>

								{/* Right side - Questionnaire/Preview buttons */}
								{activeTab === "preview" && (
									<div className="flex items-center gap-2">
										<Button
											variant={viewMode === "questionnaire" ? "default" : "ghost"}
											size="sm"
											onClick={() => setViewMode("questionnaire")}
											className={cn(
												"gap-2 h-8 text-xs",
												viewMode === "questionnaire"
													? "bg-burgundy-500 hover:bg-burgundy-600 text-white"
													: "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
											)}
										>
											<FileText className="h-3.5 w-3.5" />
											Questionnaire
										</Button>
										<Button
											variant={viewMode === "preview" ? "default" : "ghost"}
											size="sm"
											onClick={() => setViewMode("preview")}
											className={cn(
												"gap-2 h-8 text-xs",
												viewMode === "preview"
													? "bg-burgundy-500 hover:bg-burgundy-600 text-white"
													: "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
											)}
										>
											<Eye className="h-3.5 w-3.5" />
											Preview
										</Button>
									</div>
								)}
							</div>

							{/* Content based on active tab */}
							{activeTab === "preview" && (
								<div className="flex-1 flex flex-col overflow-hidden">
									{viewMode === "questionnaire" ? (
										<PreviewPanel
										previewUrl={previewUrl}
										isLoadingPreview={isLoadingPreview}
										className="flex-1"
									/>
									) : (
										<PreviewPanel
											previewUrl={`${previewUrl}/s/preview`}
											isLoadingPreview={isLoadingPreview}
											className="flex-1"
										/>
									)}
								</div>
							)}

							{activeTab === "terminal" && (
								<ScrollArea className="flex-1 p-4">
									{/* <ContextContent
										researchObjectiveText={project.researchObjectiveText}
										messages={messages}
									/> */}
									<TerminalPanel projectId={project.id} />
								</ScrollArea>
							)}

							{activeTab === "files" && (
								<div className="flex-1 p-4 overflow-hidden">
									{filesContent}
								</div>
							)}
						</div>
					</>
				)}

				{activeMainTab === "data" && (
					<div className="flex-1 flex items-center justify-center bg-gray-50">
						<div className="text-center">
							<h2 className="text-lg font-semibold text-gray-900 mb-2">Data View</h2>
							<p className="text-sm text-gray-500">Data visualization and management coming soon</p>
						</div>
					</div>
				)}

				{activeMainTab === "insights" && (
					<div className="flex-1 flex items-center justify-center bg-gray-50">
						<div className="text-center">
							<h2 className="text-lg font-semibold text-gray-900 mb-2">Insights View</h2>
							<p className="text-sm text-gray-500">Analytics and insights coming soon</p>
						</div>
					</div>
				)}
			</div>
		</div>
	);
}
