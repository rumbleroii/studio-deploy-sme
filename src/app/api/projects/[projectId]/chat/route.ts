import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { randomUUID } from "crypto";

type TraceSource = "frontend" | "nextjs" | "worker" | "runner";

interface TraceMilestone {
	name: string;
	source: TraceSource;
	tsMs: number;
	tsIso: string;
	projectId?: string;
	runId?: string;
}

interface TracePayload {
	traceId: string;
	frontendSentAtMs?: number;
	milestones: TraceMilestone[];
}

function dedupeMilestones(milestones: TraceMilestone[]): TraceMilestone[] {
	const seen = new Set<string>();
	const out: TraceMilestone[] = [];
	for (const m of milestones) {
		const key = `${m.source}:${m.name}`;
		if (seen.has(key)) continue;
		seen.add(key);
		out.push(m);
	}
	return out;
}

export async function POST(
	request: NextRequest,
	props: { params: Promise<{ projectId: string }> }
) {
	const params = await props.params;
	try {
		const nextjsReceivedAtMs = Date.now();
		const user = await requireAuth();
		const { projectId } = params;
		const body = await request.json();
		const { message, trace } = body ?? {};

		if (!message) {
			return NextResponse.json({ error: "Message required" }, { status: 400 });
		}

		const traceId: string = trace?.traceId || randomUUID();
		const incomingMilestones: TraceMilestone[] = Array.isArray(
			trace?.milestones
		)
			? trace.milestones
			: [];
		const tracePayload: TracePayload = {
			traceId,
			frontendSentAtMs:
				typeof trace?.frontendSentAtMs === "number"
					? trace.frontendSentAtMs
					: undefined,
			milestones: dedupeMilestones([
				...incomingMilestones,
				{
					name: "nextjs_chat_post_received",
					source: "nextjs",
					tsMs: nextjsReceivedAtMs,
					tsIso: new Date(nextjsReceivedAtMs).toISOString(),
					projectId,
				},
			]),
		};

		const project = await prisma.project.findUnique({
			where: { id: projectId },
			// Avoid selecting fields that may be null in older docs (e.g. updatedAt).
			select: {
				id: true,
				createdById: true,
				claudeSessionId: true,
			},
		});

		if (!project || project.createdById !== user.id) {
			return NextResponse.json({ error: "Not Found" }, { status: 404 });
		}

		// 1. Save User Message
		await prisma.projectMessage.create({
			data: {
				projectId,
				role: "user",
				content: message,
				// User messages don't need status (they're always complete)
			},
		});

		// 2. Generate runId and create assistant placeholder
		const runId = randomUUID();
		const assistantMessage = await prisma.projectMessage.create({
			data: {
				projectId,
				role: "assistant",
				content: "",
				runId,
				status: "streaming",
				streamSeq: 0,
			},
		});

		// 3. Call Worker POST /runs to start the run
		const workerUrl = process.env.AGENT_WORKER_URL;
		const sharedSecret = process.env.AGENT_WORKER_SHARED_SECRET;
		const appUrl = process.env.NEXTAUTH_URL || process.env.VERCEL_URL || "";

		if (!workerUrl || !sharedSecret) {
			console.error("Missing worker config");
			// Clean up the placeholder message
			await prisma.projectMessage.delete({
				where: { id: assistantMessage.id },
			});
			return NextResponse.json(
				{ error: "Internal Server Error" },
				{ status: 500 }
			);
		}

		// Build callback URL for Phase 2 guaranteed persistence
		const callbackUrl = appUrl
			? `${
					appUrl.startsWith("http") ? appUrl : `https://${appUrl}`
			  }/api/internal/run-complete`
			: undefined;

		const workerResponse = await fetch(
			`${workerUrl}/v1/projects/${projectId}/runs`,
			{
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					"X-Shared-Secret": sharedSecret,
				},
				body: JSON.stringify({
					runId,
					message,
					claudeSessionId: project.claudeSessionId,
					callbackUrl,
					callbackSecret: sharedSecret, // Reuse the shared secret for callback auth
					trace: tracePayload,
				}),
			}
		);

		if (!workerResponse.ok) {
			const errorText = await workerResponse.text();
			console.error(
				"Worker runs create failed:",
				workerResponse.status,
				errorText
			);

			// Handle conflict (run already active)
			if (workerResponse.status === 409) {
				// Clean up the placeholder since we couldn't start
				await prisma.projectMessage.delete({
					where: { id: assistantMessage.id },
				});
				const errorData = JSON.parse(errorText);
				return NextResponse.json(
					{
						error: "Run already active",
						activeRunId: errorData.activeRunId,
					},
					{ status: 409 }
				);
			}

			// Clean up the placeholder message on other errors
			await prisma.projectMessage.delete({
				where: { id: assistantMessage.id },
			});
			return NextResponse.json({ error: "Worker Error" }, { status: 502 });
		}

		let workerJson: any = null;
		try {
			workerJson = await workerResponse.json();
		} catch {
			workerJson = null;
		}

		const mergedTrace: TracePayload = (() => {
			const workerTrace = workerJson?.trace;
			const workerMilestones: TraceMilestone[] = Array.isArray(
				workerTrace?.milestones
			)
				? workerTrace.milestones
				: [];
			return {
				...tracePayload,
				milestones: dedupeMilestones([
					...tracePayload.milestones,
					...workerMilestones,
				]),
			};
		})();

		// 4. Return runId and assistantMessageId
		return NextResponse.json({
			runId,
			assistantMessageId: assistantMessage.id,
			trace: mergedTrace,
		});
	} catch (error) {
		console.error("Chat start error:", error);
		return NextResponse.json(
			{ error: "Internal Server Error" },
			{ status: 500 }
		);
	}
}
