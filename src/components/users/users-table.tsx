"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "@/lib/format";
import { Loader2 } from "lucide-react";

interface User {
	id: string;
	email: string;
	role: string;
	createdAt: Date;
}

interface UsersTableProps {
	users: User[];
	currentUserId: string;
	canEdit: boolean;
}

const ROLE_OPTIONS = [
	{ value: "viewer", label: "Viewer" },
	{ value: "editor", label: "Editor" },
	{ value: "admin", label: "Admin" },
];

export function UsersTable({ users, currentUserId, canEdit }: UsersTableProps) {
	const [updating, setUpdating] = useState<string | null>(null);
	const router = useRouter();
	const { toast } = useToast();

	const handleRoleChange = async (userId: string, newRole: string) => {
		setUpdating(userId);

		try {
			const res = await fetch(`/api/users/${userId}/role`, {
				method: "PATCH",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ role: newRole }),
			});

			if (!res.ok) {
				const data = await res.json();
				throw new Error(data.error || "Failed to update role");
			}

			toast({
				title: "Role updated",
				description: `User role has been updated to ${newRole}.`,
			});

			router.refresh();
		} catch (error) {
			toast({
				variant: "destructive",
				title: "Update failed",
				description:
					error instanceof Error ? error.message : "Could not update role.",
			});
		} finally {
			setUpdating(null);
		}
	};

	return (
		<div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
			{/* Table Header */}
			<div className="grid grid-cols-12 gap-6 px-6 py-4 bg-gray-50/50 border-b border-gray-100 text-xs font-semibold text-gray-500 uppercase tracking-wider">
				<div className="col-span-5">User</div>
				<div className="col-span-3">Role</div>
				<div className="col-span-4 text-right">Joined</div>
			</div>

			{/* Table Body */}
			<div className="divide-y divide-gray-50">
				{users.map((user) => {
					const initials = user.email.split("@")[0].slice(0, 2).toUpperCase();
					const isCurrentUser = user.id === currentUserId;
					const isUpdating = updating === user.id;

					return (
						<div
							key={user.id}
							className="grid grid-cols-12 gap-6 px-6 py-4 items-center hover:bg-gray-50/50 transition-colors"
						>
							<div className="col-span-5 flex items-center gap-3">
								<Avatar className="h-8 w-8">
									<AvatarFallback className="bg-[#3D1C35]/5 text-[#3D1C35] text-xs font-medium">
										{initials}
									</AvatarFallback>
								</Avatar>
								<div className="min-w-0">
									<p className="text-sm font-medium text-gray-900 truncate">
										{user.email}
									</p>
									{isCurrentUser && (
										<span className="text-xs text-gray-400">You</span>
									)}
								</div>
							</div>

							<div className="col-span-3">
								{canEdit && !isCurrentUser ? (
									<Select
										value={user.role}
										onValueChange={(value) => handleRoleChange(user.id, value)}
										disabled={isUpdating}
									>
										<SelectTrigger className="h-8 w-28 border-gray-200 text-sm focus:ring-[#3D1C35]">
											{isUpdating ? (
												<Loader2 className="h-3.5 w-3.5 animate-spin" />
											) : (
												<SelectValue />
											)}
										</SelectTrigger>
										<SelectContent className="bg-white border-gray-100">
											{ROLE_OPTIONS.map((option) => (
												<SelectItem
													key={option.value}
													value={option.value}
													className="text-sm"
												>
													{option.label}
												</SelectItem>
											))}
										</SelectContent>
									</Select>
								) : (
									<span className="text-sm text-gray-600 capitalize">
										{user.role}
									</span>
								)}
							</div>

							<div className="col-span-4 text-right">
								<span className="text-sm text-gray-400">
									{formatDistanceToNow(user.createdAt)}
								</span>
							</div>
						</div>
					);
				})}
			</div>
		</div>
	);
}
