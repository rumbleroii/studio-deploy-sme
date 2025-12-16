"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import Image from "next/image";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
	FileText,
	FolderKanban,
	Users,
	LogOut,
	MoreVertical,
	Settings,
} from "lucide-react";

interface AppShellProps {
	children: React.ReactNode;
	user: {
		email: string;
		role: string;
	};
	canAccessUsers: boolean;
}

export function AppShell({ children, user, canAccessUsers }: AppShellProps) {
	const pathname = usePathname();
	const router = useRouter();
	const supabase = createClient();

	const handleSignOut = async () => {
		await supabase.auth.signOut();
		router.push("/login");
		router.refresh();
	};

	const initials = user.email.split("@")[0].slice(0, 2).toUpperCase();

	const userName = user.email.split("@")[0];
	const userDomain = user.email.split("@")[1]?.split(".")[0] || "Studio";

	const navItems = [
		{
			href: "/projects",
			label: "Projects",
			icon: FolderKanban,
			active: pathname.startsWith("/projects"),
		},
		...(canAccessUsers
			? [
					{
						href: "/users",
						label: "Users",
						icon: Users,
						active: pathname.startsWith("/users"),
					},
			  ]
			: []),
	];

	// Check if we're viewing a project detail page (not just the projects list)
	const isProjectDetailPage = /^\/projects\/[^/]+$/.test(pathname);

	return (
		<div className="min-h-screen flex bg-[#F6F7F8]">
			{/* Sidebar - hidden when viewing a project */}
			{!isProjectDetailPage && (
				<aside className="w-64 flex flex-col bg-white border-r border-gray-200 fixed h-full">
					{/* Logo */}
					<div className="h-16 flex items-center px-4 border-b border-gray-200">
						<Link href="/projects" className="flex items-center gap-3">
							<Image
								src="/metaforms-logo.svg"
								alt="Metaforms"
								width={18}
								height={18}
							/>
							<span className="text-sm font-medium text-gray-900">
								Metaforms Studio
							</span>
						</Link>
					</div>

					{/* Navigation */}
					<nav className="flex-1 px-3 py-4 space-y-1">
						{navItems.map((item) => (
							<Link key={item.href} href={item.href} className="block">
								<div
									className={cn(
										"flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
										item.active
											? "bg-gray-100 text-gray-900"
											: "text-gray-700 hover:bg-gray-50 hover:text-gray-900"
									)}
								>
									<item.icon className="h-4 w-4 text-gray-500" />
									{item.label}
								</div>
							</Link>
						))}

						<div className="pt-2">
							<div className="h-px bg-gray-200/60" />
						</div>

						<div className="pt-1 space-y-1">
							<Link href="/settings" className="block">
								<div
									className={cn(
										"flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
										pathname.startsWith("/settings")
											? "bg-gray-100 text-gray-900"
											: "text-gray-700 hover:bg-gray-50 hover:text-gray-900"
									)}
								>
									<Settings className="h-4 w-4 text-gray-500" />
									Settings
								</div>
							</Link>
						</div>
					</nav>

					{/* User footer */}
					<div className="p-3 border-t border-gray-200">
						<DropdownMenu>
							<DropdownMenuTrigger asChild>
								<button className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 transition-colors">
									<Avatar className="h-9 w-9">
										<AvatarFallback className="text-xs bg-gray-100 text-gray-700 font-medium">
											{initials}
										</AvatarFallback>
									</Avatar>
									<div className="flex-1 text-left min-w-0">
										<p className="text-sm font-medium text-gray-900 truncate">
											{userName}
										</p>
										<p className="text-xs text-gray-500 capitalize truncate">
											{userDomain}
										</p>
									</div>
									<MoreVertical className="h-4 w-4 text-gray-400 shrink-0" />
								</button>
							</DropdownMenuTrigger>
							<DropdownMenuContent
								align="end"
								side="top"
								className="w-56 bg-white border-gray-200"
							>
								<div className="px-2 py-2">
									<p className="text-sm font-medium text-gray-900">
										{user.email}
									</p>
									<p className="text-xs text-gray-500 capitalize">
										{user.role}
									</p>
								</div>
								<DropdownMenuSeparator className="bg-gray-200" />
								<DropdownMenuItem
									onClick={handleSignOut}
									className="text-coral-600 focus:text-coral-700 focus:bg-coral-50 cursor-pointer"
								>
									<LogOut className="mr-2 h-4 w-4" />
									Sign out
								</DropdownMenuItem>
							</DropdownMenuContent>
						</DropdownMenu>
					</div>
				</aside>
			)}

			{/* Main content */}
			<main
				className={cn("flex-1 min-h-screen", !isProjectDetailPage && "ml-64")}
			>
				{children}
			</main>
		</div>
	);
}
