"use client";

import Link from "next/link";
import { formatDistanceToNow } from "@/lib/format";
import { FolderOpen, ChevronRight } from "lucide-react";
import { DeleteProjectDialog } from "./delete-project-dialog";

interface Project {
	id: string;
	name: string;
	createdAt: Date;
}

interface ProjectListProps {
	projects: Project[];
}

export function ProjectList({ projects }: ProjectListProps) {
	if (projects.length === 0) {
		return (
			<div className="bg-white rounded-md border border-gray-200">
				<div className="flex flex-col items-center justify-center py-16 text-center">
					<div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mb-3">
						<FolderOpen className="h-6 w-6 text-gray-400" />
					</div>
					<h3 className="text-sm font-medium text-gray-900 mb-1">
						No projects yet
					</h3>
					<p className="text-sm text-gray-500 max-w-sm">
						Create your first project to start researching with Claude.
					</p>
				</div>
			</div>
		);
	}

	return (
		<div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
			{/* Table Header */}
			<div className="grid grid-cols-12 gap-6 px-6 py-4 bg-gray-50/50 border-b border-gray-100 text-xs font-semibold text-gray-500 uppercase tracking-wider">
				<div className="col-span-8">Project Name</div>
				<div className="col-span-3 text-right">Created</div>
				<div className="col-span-1 text-right">Actions</div>
			</div>

			{/* Table Body */}
			<div className="divide-y divide-gray-50">
				{projects.map((project) => (
					<div
						key={project.id}
						className="grid grid-cols-12 gap-6 px-6 py-4 hover:bg-gray-50/80 transition-all duration-200 group items-center"
					>
						<Link
							href={`/projects/${project.id}`}
							className="col-span-8 flex items-center gap-3 cursor-pointer"
						>
							<div className="w-8 h-8 rounded-full bg-[#3D1C35]/5 flex items-center justify-center text-[#3D1C35] group-hover:bg-[#3D1C35]/10 transition-colors">
								<FolderOpen className="h-4 w-4" />
							</div>
							<span className="text-sm font-medium text-gray-900 group-hover:text-[#3D1C35] transition-colors">
								{project.name}
							</span>
						</Link>
						<Link
							href={`/projects/${project.id}`}
							className="col-span-3 text-right flex items-center justify-end gap-2 cursor-pointer"
						>
							<span className="text-sm text-gray-400">
								{formatDistanceToNow(project.createdAt)}
							</span>
							<ChevronRight className="h-4 w-4 text-gray-300 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-200" />
						</Link>
						<div
							className="col-span-1 text-right flex items-center justify-end"
							onClick={(e) => {
								e.preventDefault();
								e.stopPropagation();
							}}
						>
							<DeleteProjectDialog
								projectId={project.id}
								projectName={project.name}
							/>
						</div>
					</div>
				))}
			</div>
		</div>
	);
}
