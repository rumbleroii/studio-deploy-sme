import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/auth";

export async function GET() {
	try {
		const user = await requireAuth();

		const projects = await prisma.project.findMany({
			where: { createdById: user.id },
			orderBy: { createdAt: "desc" },
			select: {
				id: true,
				name: true,
				createdAt: true,
			},
		});

		return NextResponse.json(projects);
	} catch (error) {
		console.error("Failed to fetch projects:", error);
		return NextResponse.json(
			{ error: "Failed to fetch projects" },
			{ status: 500 }
		);
	}
}

export async function POST(request: Request) {
	try {
		const user = await requireAuth();
		const body = await request.json();

		const {
			name,
			inputMode,
			objectiveText,
			uploadedFiles,
		}: {
			name?: string;
			inputMode?: "text" | "upload";
			objectiveText?: string;
			uploadedFiles?: Array<{ name: string; contentBase64: string }>;
		} = body ?? {};

		if (!name?.trim()) {
			return NextResponse.json({ error: "Name is required" }, { status: 400 });
		}

		if (inputMode !== "text" && inputMode !== "upload") {
			return NextResponse.json(
				{ error: "inputMode must be 'text' or 'upload'" },
				{ status: 400 }
			);
		}

		if (inputMode === "text" && !objectiveText?.trim()) {
			return NextResponse.json(
				{ error: "Objective text is required" },
				{ status: 400 }
			);
		}

		if (
			inputMode === "upload" &&
			(!uploadedFiles || uploadedFiles.length === 0)
		) {
			return NextResponse.json(
				{ error: "At least one file is required" },
				{ status: 400 }
			);
		}

		const project = await prisma.project.create({
			data: {
				name: name.trim(),
				sandboxId: null,
				createdById: user.id,
			},
		});

		// Use the existing Files implementation to seed the sandbox working_directory.
		const workerUrl = process.env.AGENT_WORKER_URL;
		const sharedSecret = process.env.AGENT_WORKER_SHARED_SECRET;

		if (!workerUrl || !sharedSecret) {
			console.error("Missing worker config");
			await prisma.project.delete({ where: { id: project.id } });
			return NextResponse.json(
				{ error: "Worker not configured" },
				{ status: 500 }
			);
		}

		// 1) Ensure sandbox exists
		const ensureRes = await fetch(
			`${workerUrl}/v1/projects/${project.id}/ensure`,
			{
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					"X-Shared-Secret": sharedSecret,
				},
				body: JSON.stringify({}),
			}
		);

		if (!ensureRes.ok) {
			const errorText = await ensureRes.text();
			console.error(
				"Worker ensure failed during project create:",
				ensureRes.status,
				errorText
			);
			await prisma.project.delete({ where: { id: project.id } });
			return NextResponse.json(
				{ error: "Failed to initialize sandbox" },
				{ status: 502 }
			);
		}

		const sanitizeFilename = (filename: string): string => {
			const base =
				filename.split("/").pop()?.split("\\").pop() || "client-brief";
			const cleaned = base
				.replace(/[^\w.\- ()]/g, "_")
				.replace(/_+/g, "_")
				.trim();
			return cleaned.slice(0, 120) || "client-brief";
		};

		const files: Array<{
			path: string;
			content: string;
			encoding?: "base64" | "utf-8";
		}> = [];

		// If text mode, save the objective to a file
		if (inputMode === "text" && objectiveText?.trim()) {
			files.push({
				path: "research_objective.txt",
				content: objectiveText.trim(),
				encoding: "utf-8",
			});
		}

		// If upload mode, save all uploaded files directly to user_files
		if (inputMode === "upload" && uploadedFiles && uploadedFiles.length > 0) {
			for (const uploadedFile of uploadedFiles) {
				const fileName = sanitizeFilename(uploadedFile.name);
				files.push({
					path: `${fileName}`,
					content: uploadedFile.contentBase64,
					encoding: "base64",
				});
			}
		}

		if (files.length > 0) {
			const writeRes = await fetch(
				`${workerUrl}/v1/projects/${project.id}/files/write`,
				{
					method: "POST",
					headers: {
						"Content-Type": "application/json",
						"X-Shared-Secret": sharedSecret,
					},
					body: JSON.stringify({ files }),
				}
			);

			if (!writeRes.ok) {
				const errorText = await writeRes.text();
				console.error(
					"Worker files write failed during project create:",
					writeRes.status,
					errorText
				);
				await prisma.project.delete({ where: { id: project.id } });
				return NextResponse.json(
					{ error: "Failed to seed project files" },
					{ status: 502 }
				);
			}
		}

		return NextResponse.json(project);
	} catch (error) {
		console.error("Failed to create project:", error);
		return NextResponse.json(
			{ error: "Failed to create project" },
			{ status: 500 }
		);
	}
}
