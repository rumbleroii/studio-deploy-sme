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
import { ArrowLeft, PanelRightClose, PanelRight } from "lucide-react";
import { cn } from "@/lib/utils";

import { useSandboxConnection } from "./hooks/useSandboxConnection";
import { useProjectFiles } from "./hooks/useProjectFiles";
import { ChatPanel, type ChatPanelHandle } from "./components/ChatPanel";
import { FilesPanel } from "./components/FilesPanel";
import { ContextContent } from "./components/ContextContent";
import { PreviewPanel } from "./components/PreviewPanel";
import type { ProjectViewProps, Message } from "./types";

export function ProjectView({ project, initialMessages }: ProjectViewProps) {
	const [showContext, setShowContext] = useState(true);
	const [activeTab, setActiveTab] = useState<"preview" | "context" | "files">(
		"preview"
	);
	const [messages, setMessages] = useState<Message[]>(initialMessages);

	const chatPanelRef = useRef<ChatPanelHandle>(null);

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
				currentItems={currentItems}
				fileTree={fileTree}
				breadcrumbs={breadcrumbs}
				filesLoading={filesLoading}
				uploadingFiles={uploadingFiles}
				isDraggingOver={isDraggingOver}
				sandboxStatus={sandboxStatus}
				fileInputRef={fileInputRef}
				folderInputRef={folderInputRef}
				onUploadFiles={uploadFiles}
				onCreateFolder={createFolder}
				onFetchFiles={fetchFiles}
				onNavigateToFolder={navigateToFolder}
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
								setActiveTab(v as "preview" | "context" | "files")
							}
							className="flex flex-col"
						>
							<TabsList className="mx-4 mt-2 grid w-auto grid-cols-3">
								<TabsTrigger value="preview" className="text-xs">
									Preview
								</TabsTrigger>
								<TabsTrigger value="context" className="text-xs">
									Context
								</TabsTrigger>
								<TabsTrigger value="files" className="text-xs">
									Files
								</TabsTrigger>
							</TabsList>
							<ScrollArea className="max-h-[60vh]">
								<TabsContent value="preview" className="p-4 mt-0">
									<PreviewPanel
										previewUrl={previewUrl}
										isLoadingPreview={isLoadingPreview}
										className="h-[50vh]"
									/>
								</TabsContent>
								<TabsContent value="context" className="p-4 mt-0">
									<ContextContent
										researchObjectiveText={project.researchObjectiveText}
										messages={messages}
									/>
								</TabsContent>
								<TabsContent value="files" className="p-4 mt-0 h-[50vh]">
									{filesContent}
								</TabsContent>
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

			{/* Main content */}
			<div className="flex-1 flex overflow-hidden">
				{/* Chat panel */}
				<ChatPanel
					ref={chatPanelRef}
					projectId={project.id}
					sandboxStatus={sandboxStatus}
					hasConnectedOnce={hasConnectedOnce}
					messages={messages}
					onMessagesChange={setMessages}
					startEnsureLoop={startEnsureLoop}
				/>

				{/* Side panel with Preview/Context/Files tabs */}
				<div
					className={cn(
						"border-l border-gray-200 hidden lg:flex flex-col bg-white transition-all duration-300 ease-in-out overflow-hidden",
						showContext ? "w-1/2 opacity-100" : "w-0 opacity-0 border-l-0"
					)}
				>
					<Tabs
						value={activeTab}
						onValueChange={(v) =>
							setActiveTab(v as "preview" | "context" | "files")
						}
						className="flex flex-col flex-1 min-w-0"
					>
						<div className="h-12 px-4 border-b border-gray-200 flex items-center shrink-0">
							<TabsList className="h-8 p-0.5">
								<TabsTrigger value="preview" className="text-xs h-7 px-3">
									Preview
								</TabsTrigger>
								<TabsTrigger value="context" className="text-xs h-7 px-3">
									Context
								</TabsTrigger>
								<TabsTrigger value="files" className="text-xs h-7 px-3">
									Files
								</TabsTrigger>
							</TabsList>
						</div>
						<TabsContent
							value="preview"
							className="flex-1 mt-0 data-[state=active]:flex data-[state=active]:flex-col"
						>
							<PreviewPanel
								previewUrl={previewUrl}
								isLoadingPreview={isLoadingPreview}
								className="flex-1"
							/>
						</TabsContent>
						<TabsContent
							value="context"
							className="flex-1 mt-0 data-[state=active]:flex data-[state=active]:flex-col"
						>
							<ScrollArea className="flex-1 p-4">
								<ContextContent
									researchObjectiveText={project.researchObjectiveText}
									messages={messages}
								/>
							</ScrollArea>
						</TabsContent>
						<TabsContent
							value="files"
							className="flex-1 mt-0 p-4 data-[state=active]:flex data-[state=active]:flex-col overflow-hidden"
						>
							{filesContent}
						</TabsContent>
					</Tabs>
				</div>
			</div>
		</div>
	);
}
