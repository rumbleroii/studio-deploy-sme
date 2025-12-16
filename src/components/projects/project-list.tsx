"use client";

import Link from "next/link";
import { formatDistanceToNow } from "@/lib/format";
import { FolderOpen, ChevronRight } from "lucide-react";

interface Project {
	id: string;
	name: string;
	researchObjectiveText: string;
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
				<div className="col-span-4">Project Name</div>
				<div className="col-span-6">Research Objective</div>
				<div className="col-span-2 text-right">Created</div>
			</div>

			{/* Table Body */}
			<div className="divide-y divide-gray-50">
				{projects.map((project) => (
					<Link
						key={project.id}
						href={`/projects/${project.id}`}
						className="block"
					>
						<div className="grid grid-cols-12 gap-6 px-6 py-4 hover:bg-gray-50/80 transition-all duration-200 cursor-pointer group items-center">
							<div className="col-span-4 flex items-center gap-3">
								<div className="w-8 h-8 rounded-full bg-[#3D1C35]/5 flex items-center justify-center text-[#3D1C35] group-hover:bg-[#3D1C35]/10 transition-colors">
									<FolderOpen className="h-4 w-4" />
								</div>
								<span className="text-sm font-medium text-gray-900 group-hover:text-[#3D1C35] transition-colors">
									{project.name}
								</span>
							</div>
							<div className="col-span-6">
								<p className="text-sm text-gray-500 truncate pr-4">
									{project.researchObjectiveText}
								</p>
							</div>
							<div className="col-span-2 text-right flex items-center justify-end gap-2">
								<span className="text-sm text-gray-400">
									{formatDistanceToNow(project.createdAt)}
								</span>
								<ChevronRight className="h-4 w-4 text-gray-300 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-200" />
							</div>
						</div>
					</Link>
				))}
			</div>
		</div>
	);
}
