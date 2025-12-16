export interface Message {
	id: string;
	role: "user" | "assistant";
	content: string;
	createdAt: string;
}

export interface FileInfo {
	name: string;
	absolutePath: string;
	relativePath: string;
	type: "file" | "directory" | "symlink" | "other";
	size: number;
	modifiedAt: string;
}

export interface TreeNode {
	name: string;
	path: string;
	type: "file" | "directory";
	size?: number;
	children: TreeNode[];
}

export interface ProjectViewProps {
	project: {
		id: string;
		name: string;
		researchObjectiveText: string;
	};
	initialMessages: Message[];
}
