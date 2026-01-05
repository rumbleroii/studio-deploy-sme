/**
 * Vercel Deployment Service
 *
 * Uses Vercel CLI via the sandbox to deploy Next.js apps.
 * Vercel handles the build process, so we just need to deploy the source.
 */

interface DeploymentResult {
	success: boolean;
	url?: string;
	projectName?: string;
	deploymentId?: string;
	error?: string;
	details?: string;
}

interface DeployResponse {
	success: boolean;
	url?: string;
	projectName?: string;
	inspectorUrl?: string;
	error?: string;
	details?: string;
}

/**
 * Deploy to Vercel via agent-worker
 * The agent-worker runs `vercel deploy` in the sandbox
 */
export async function deployToVercel(projectId: string): Promise<DeploymentResult> {
	const workerUrl = process.env.AGENT_WORKER_URL;
	const sharedSecret = process.env.AGENT_WORKER_SHARED_SECRET;

	if (!workerUrl || !sharedSecret) {
		return { success: false, error: "Missing worker configuration" };
	}

	try {
		console.log(`Deploying project ${projectId} to Vercel...`);

		const response = await fetch(
			`${workerUrl}/v1/projects/${projectId}/deploy-vercel`,
			{
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					"X-Shared-Secret": sharedSecret,
				},
			}
		);

		const data = (await response.json()) as DeployResponse;

		if (!response.ok || !data.success) {
			return {
				success: false,
				error: data.error || "Deployment failed",
				details: data.details,
			};
		}

		return {
			success: true,
			url: data.url,
			projectName: data.projectName,
			deploymentId: data.inspectorUrl,
		};
	} catch (error) {
		console.error("Vercel deployment request failed:", error);
		return {
			success: false,
			error: error instanceof Error ? error.message : "Deployment request failed",
		};
	}
}

