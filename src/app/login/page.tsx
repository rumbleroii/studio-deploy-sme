"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import Image from "next/image";
import { Loader2 } from "lucide-react";

export default function LoginPage() {
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [loading, setLoading] = useState(false);
	const [mode, setMode] = useState<"signin" | "signup">("signin");
	const router = useRouter();
	const { toast } = useToast();
	const supabase = createClient();

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setLoading(true);

		if (mode === "signin") {
			const { error } = await supabase.auth.signInWithPassword({
				email,
				password,
			});

			if (error) {
				toast({
					variant: "destructive",
					title: "Sign in failed",
					description: error.message,
				});
				setLoading(false);
				return;
			}

			router.push("/projects");
			router.refresh();
		} else {
			const { error } = await supabase.auth.signUp({
				email,
				password,
				options: {
					emailRedirectTo: `${window.location.origin}/auth/callback`,
				},
			});

			if (error) {
				toast({
					variant: "destructive",
					title: "Sign up failed",
					description: error.message,
				});
				setLoading(false);
				return;
			}

			toast({
				title: "Check your email",
				description: "We sent you a confirmation link to complete sign up.",
			});
			setLoading(false);
		}
	};

	return (
		<div className="min-h-screen flex items-center justify-center bg-white p-4">
			<div className="w-full max-w-[400px] space-y-8">
				{/* Logo & Header */}
				<div className="flex flex-col items-center text-center space-y-6">
					<div className="flex items-center gap-2">
						<Image
							src="/metaforms-logo.svg"
							alt="Metaforms"
							width={32}
							height={32}
							className="text-coral-500"
						/>
						<span className="text-xl font-bold tracking-tight text-gray-900">
							Metaforms
						</span>
					</div>

					<div className="space-y-2">
						<h1 className="text-3xl font-bold tracking-tight text-gray-900">
							Welcome
						</h1>
						<p className="text-gray-500">Log in to Metaforms</p>
					</div>
				</div>

				{/* Form */}
				<form onSubmit={handleSubmit} className="space-y-4">
					<div className="space-y-4">
						<div className="space-y-1.5">
							<Label
								htmlFor="email"
								className="text-sm font-medium text-gray-700"
							>
								Email
							</Label>
							<Input
								id="email"
								type="email"
								placeholder="you@company.com"
								value={email}
								onChange={(e) => setEmail(e.target.value)}
								required
								disabled={loading}
								className="h-11 border-gray-200 focus:border-gray-400 focus:ring-0 placeholder:text-gray-400"
							/>
						</div>
						<div className="space-y-1.5">
							<Label
								htmlFor="password"
								className="text-sm font-medium text-gray-700"
							>
								Password
							</Label>
							<Input
								id="password"
								type="password"
								placeholder="••••••••"
								value={password}
								onChange={(e) => setPassword(e.target.value)}
								required
								minLength={6}
								disabled={loading}
								className="h-11 border-gray-200 focus:border-gray-400 focus:ring-0 placeholder:text-gray-200"
							/>
						</div>
					</div>

					<div className="flex items-center justify-between">
						<button
							type="button"
							className="text-sm text-gray-500 hover:text-gray-900"
						>
							Forgot your password?
						</button>
					</div>

					<Button
						type="submit"
						className="w-full h-11 bg-gray-50 hover:bg-gray-100 text-gray-400 font-medium text-sm rounded-md shadow-none border border-gray-200"
						disabled={loading}
					>
						{loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
						{mode === "signin" ? "Sign In" : "Create Account"}
					</Button>
				</form>

				<div className="text-center">
					<button
						type="button"
						onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
						className="text-sm text-gray-500 hover:text-gray-900"
					>
						{mode === "signin"
							? "Create Account"
							: "Already have an account? Sign In"}
					</button>
				</div>
			</div>
		</div>
	);
}
