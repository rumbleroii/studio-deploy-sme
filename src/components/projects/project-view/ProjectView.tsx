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
	const [activeTab, setActiveTab] = useState<"context" | "files">("context");
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
		filesLoading,
		uploadingFiles,
		isDraggingOver,
		expandedFolders,
		fileInputRef,
		folderInputRef,
		fetchFiles,
		uploadFiles,
		deleteFile,
		downloadFile,
		createFolder,
		toggleFolder,
		handleDragOver,
		handleDragLeave,
		handleDrop,
	} = useProjectFiles(project.id, sandboxStatus, activeTab);

	// Memoize files content to avoid re-renders on chat input changes
	const filesContent = useMemo(
		() => (
			<FilesPanel
				fileTree={fileTree}
				filesLoading={filesLoading}
				uploadingFiles={uploadingFiles}
				isDraggingOver={isDraggingOver}
				expandedFolders={expandedFolders}
				sandboxStatus={sandboxStatus}
				fileInputRef={fileInputRef}
				folderInputRef={folderInputRef}
				onUploadFiles={uploadFiles}
				onCreateFolder={createFolder}
				onFetchFiles={fetchFiles}
				onToggleFolder={toggleFolder}
				onDownloadFile={downloadFile}
				onDeleteFile={deleteFile}
				onDragOver={handleDragOver}
				onDragLeave={handleDragLeave}
				onDrop={handleDrop}
			/>
		),
		[
			fileTree,
			filesLoading,
			uploadingFiles,
			isDraggingOver,
			expandedFolders,
			sandboxStatus,
			fileInputRef,
			folderInputRef,
			uploadFiles,
			createFolder,
			fetchFiles,
			toggleFolder,
			downloadFile,
			deleteFile,
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
							onValueChange={(v) => setActiveTab(v as "context" | "files")}
							className="flex flex-col"
						>
							<TabsList className="mx-4 mt-2 grid w-auto grid-cols-2">
								<TabsTrigger value="context" className="text-xs">
									Context
								</TabsTrigger>
								<TabsTrigger value="files" className="text-xs">
									Files
								</TabsTrigger>
							</TabsList>
							<ScrollArea className="max-h-[60vh]">
								<TabsContent value="context" className="p-4 mt-0">
									<ContextContent
										researchObjectiveText={project.researchObjectiveText}
										messages={messages}
									/>
								</TabsContent>
								<TabsContent value="files" className="p-4 mt-0">
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

				{/* Preview & Context panel */}
				{showContext && (
					<div className="w-1/2 border-l border-gray-200 hidden lg:flex flex-col bg-white">
						{/* Preview section */}
						<PreviewPanel
							previewUrl={previewUrl}
							isLoadingPreview={isLoadingPreview}
						/>
						{/* Context section */}
						<div className="h-64 flex flex-col">
							<div className="h-12 px-4 border-b border-gray-200 flex items-center">
								<h2 className="text-sm font-medium text-gray-900">
									Research Context
								</h2>
							</div>
							<ScrollArea className="flex-1 p-4">
								<ContextContent
									researchObjectiveText={project.researchObjectiveText}
									messages={messages}
								/>
							</ScrollArea>
						</div>
					</div>
				)}
			</div>
		</div>
	);
}
