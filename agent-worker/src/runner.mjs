import { Anthropic } from "@anthropic-ai/sdk";
import fs from "fs/promises";
import path from "path";

// This script runs INSIDE the sandbox.
// It reads inputs from files written by the Worker.

async function main() {
	// 1. Read configuration
	const apiKey = process.env.ANTHROPIC_API_KEY;
	if (!apiKey) {
		console.error("Error: ANTHROPIC_API_KEY not found in environment");
		process.exit(1);
	}

	// 2. Read context and inputs
	const projectDir = process.cwd();

	let researchObjective = "";
	try {
		researchObjective = await fs.readFile(
			path.join(projectDir, "research_objective.md"),
			"utf-8"
		);
	} catch (err) {
		console.warn("No research_objective.md found, proceeding without it.");
	}

	let userMessage = "";
	try {
		userMessage = await fs.readFile(
			path.join(projectDir, ".current_message.txt"),
			"utf-8"
		);
	} catch (err) {
		console.error("Error: .current_message.txt not found");
		process.exit(1);
	}

	let history = [];
	try {
		const historyData = await fs.readFile(
			path.join(projectDir, ".chat_history.json"),
			"utf-8"
		);
		history = JSON.parse(historyData);
	} catch (err) {
		// No history or invalid JSON, start fresh
	}

	// 3. Initialize Claude
	const client = new Anthropic({ apiKey });

	// 4. Construct messages array
	const systemPrompt = `You are a research assistant. Context:\n${researchObjective}`;

	const messages = history.map((m) => ({
		role: m.role,
		content: m.content,
	}));
	messages.push({ role: "user", content: userMessage });

	// 5. Stream response
	const stream = await client.messages.create({
		// Default to a modern model, but allow overriding via env.
		model: process.env.ANTHROPIC_MODEL || "claude-sonnet-4-20250514",
		max_tokens: 1024,
		system: systemPrompt,
		messages: messages,
		stream: true,
	});

	for await (const chunk of stream) {
		if (chunk.type === "content_block_delta") {
			process.stdout.write(chunk.delta.text);
		}
	}
}

main().catch((err) => {
	console.error("Fatal error:", err);
	process.exit(1);
});
