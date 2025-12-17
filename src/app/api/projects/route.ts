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
			uploadedFile,
		}: {
			name?: string;
			inputMode?: "text" | "upload";
			objectiveText?: string;
			uploadedFile?: { name: string; contentBase64: string };
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

		if (inputMode === "upload" && !uploadedFile?.contentBase64) {
			return NextResponse.json(
				{ error: "Client brief file is required" },
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

		const objectivePath = "inputs/research_objective.txt";
		const objectiveContent =
			objectiveText?.trim() ||
			(inputMode === "upload"
				? `Client brief uploaded. See inputs/client_brief/${sanitizeFilename(
						uploadedFile!.name
				  )}\n`
				: "");
		if (objectiveContent) {
			files.push({
				path: objectivePath,
				content: objectiveContent,
				encoding: "utf-8",
			});
		}

		if (inputMode === "upload" && uploadedFile?.contentBase64) {
			const briefName = sanitizeFilename(uploadedFile.name);
			files.push({
				path: `inputs/client_brief/${briefName}`,
				content: uploadedFile.contentBase64,
				encoding: "base64",
			});
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
