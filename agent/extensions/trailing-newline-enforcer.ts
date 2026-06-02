/**
 * Trailing Newline Enforcer
 *
 * Automatically ensures all files written by the agent end with exactly one
 * trailing newline. This prevents "missing final newline" warnings in editors
 * and ensures POSIX-compliant file endings.
 *
 * How it works:
 * - Overrides the built-in `write` tool by registering a tool with the same name
 * - Before delegating to the original tool, ensures content ends with "\n"
 * - If content doesn't end with newline, appends exactly one
 * - This is the cleanest enforcement point since all write operations
 *   pass through this function regardless of whether they're new files or rewrites
 */

import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { createWriteTool } from "@earendil-works/pi-coding-agent";

export default function (pi: ExtensionAPI) {
	// Get the current working directory. This is captured at extension load time.
	// While cwd shouldn't change during a session, if you need dynamic cwd handling,
	// you could use ctx.cwd in a session_start event to update this.
	const cwd = process.cwd();

	// Create the original write tool to delegate to
	const originalWrite = createWriteTool(cwd);

	// Register our override
	pi.registerTool({
		name: "write",
		label: "write",
		description: originalWrite.description,
		parameters: originalWrite.parameters,

		async execute(toolCallId, params, signal, onUpdate, ctx) {
			const { path, content } = params;

			// Ensure content ends with exactly one trailing newline
			let normalizedContent = content;
			if (!content.endsWith("\n")) {
				// Content has no trailing newline - append one
				normalizedContent = content + "\n";
			} else {
				// Content has trailing newline(s) - normalize to exactly one
				normalizedContent = content.replace(/\n+$/g, "\n");
			}

			// Delegate to original tool with normalized content
			return originalWrite.execute(toolCallId, { path, content: normalizedContent }, signal, onUpdate, ctx);
		},

		// Inherit renderers from original write tool
		renderCall: originalWrite.renderCall,
		renderResult: originalWrite.renderResult,
		renderShell: originalWrite.renderShell,
	});
}
