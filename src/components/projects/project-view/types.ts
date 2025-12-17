export type MessageStatus = "streaming" | "complete" | "error";

export interface Message {
	id: string;
	role: "user" | "assistant";
	content: string;
	createdAt: string;
	runId?: string;
	status?: MessageStatus;
	streamSeq?: number;
	error?: string;
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
	};
	initialMessages: Message[];
	isDevMode?: boolean;
}
