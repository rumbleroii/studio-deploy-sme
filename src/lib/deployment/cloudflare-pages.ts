/**
 * Cloudflare Pages Deployment Service
 *
 * Uses Cloudflare Direct Upload API to deploy static sites.
 * Docs: https://developers.cloudflare.com/pages/how-to/use-direct-upload-with-continuous-integration/
 */

interface DeploymentResult {
	success: boolean;
	url?: string;
	projectName?: string;
	deploymentId?: string;
	error?: string;
}

interface FileEntry {
	path: string;
	content: string | Buffer;
}

interface CloudflareConfig {
	accountId: string;
	apiToken: string;
}

function getConfig(): CloudflareConfig {
	const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
	const apiToken = process.env.CLOUDFLARE_API_TOKEN;

	if (!accountId || !apiToken) {
		throw new Error(
			"Missing Cloudflare credentials. Set CLOUDFLARE_ACCOUNT_ID and CLOUDFLARE_API_TOKEN."
		);
	}

	return { accountId, apiToken };
}

/**
 * Check if a Pages project exists
 */
async function projectExists(
	projectName: string,
	config: CloudflareConfig
): Promise<boolean> {
	const response = await fetch(
		`https://api.cloudflare.com/client/v4/accounts/${config.accountId}/pages/projects/${projectName}`,
		{
			method: "GET",
			headers: {
				Authorization: `Bearer ${config.apiToken}`,
			},
		}
	);

	return response.ok;
}

/**
 * Create a new Pages project
 */
async function createProject(
	projectName: string,
	config: CloudflareConfig
): Promise<void> {
	const response = await fetch(
		`https://api.cloudflare.com/client/v4/accounts/${config.accountId}/pages/projects`,
		{
			method: "POST",
			headers: {
				Authorization: `Bearer ${config.apiToken}`,
				"Content-Type": "application/json",
			},
			body: JSON.stringify({
				name: projectName,
				production_branch: "main",
			}),
		}
	);

	if (!response.ok) {
		const error = await response.json();
		throw new Error(
			`Failed to create project: ${JSON.stringify(error)}`
		);
	}
}

/**
 * Deploy files to Cloudflare Pages using Direct Upload
 */
export async function deployToCloudflarePages(
	projectSlug: string,
	files: FileEntry[]
): Promise<DeploymentResult> {
	try {
		const config = getConfig();
		const projectName = `survey-${projectSlug}`;

		// Create project if it doesn't exist
		const exists = await projectExists(projectName, config);
		if (!exists) {
			console.log(`Creating Pages project: ${projectName}`);
			await createProject(projectName, config);
		}

		// Create deployment using multipart form upload
		const formData = new FormData();

		// Add each file to the form
		for (const file of files) {
			let blobContent: BlobPart;
			if (typeof file.content === "string") {
				blobContent = file.content;
			} else {
				// Convert Buffer to Uint8Array for Blob compatibility
				blobContent = new Uint8Array(file.content);
			}
			const blob = new Blob([blobContent], { type: "application/octet-stream" });
			// Cloudflare expects paths without leading slash
			const path = file.path.startsWith("/") ? file.path.slice(1) : file.path;
			formData.append(path, blob, path);
		}

		console.log(`Uploading ${files.length} files to ${projectName}...`);

		const deployResponse = await fetch(
			`https://api.cloudflare.com/client/v4/accounts/${config.accountId}/pages/projects/${projectName}/deployments`,
			{
				method: "POST",
				headers: {
					Authorization: `Bearer ${config.apiToken}`,
				},
				body: formData,
			}
		);

		if (!deployResponse.ok) {
			const error = await deployResponse.json();
			console.error("Deployment failed:", error);
			return {
				success: false,
				error: `Deployment failed: ${JSON.stringify(error)}`,
			};
		}

		const deployData = (await deployResponse.json()) as {
			success: boolean;
			result: {
				id: string;
				url: string;
				environment: string;
			};
		};

		if (!deployData.success) {
			return {
				success: false,
				error: "Deployment response indicated failure",
			};
		}

		console.log(`Deployment successful: ${deployData.result.url}`);

		return {
			success: true,
			url: deployData.result.url,
			projectName,
			deploymentId: deployData.result.id,
		};
	} catch (error) {
		console.error("Cloudflare deployment error:", error);
		return {
			success: false,
			error: error instanceof Error ? error.message : String(error),
		};
	}
}

/**
 * Get the production URL for a deployed project
 */
export function getProductionUrl(projectName: string): string {
	return `https://${projectName}.pages.dev`;
}

