import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { isAbsolute, relative, resolve, sep } from "node:path";

const EXTERNAL_READ_ONLY_TOOLS = new Set(["read", "find", "grep", "ls"]);

type PathBearingInput = {
	path?: unknown;
	file_path?: unknown;
};

function isPathOutsideCwd(pathValue: string, cwd: string): boolean {
	const resolvedCwd = resolve(cwd);
	const resolvedPath = isAbsolute(pathValue) ? resolve(pathValue) : resolve(cwd, pathValue);
	const relativePath = relative(resolvedCwd, resolvedPath);

	return relativePath === ".." || relativePath.startsWith(`..${sep}`) || isAbsolute(relativePath);
}

export default function (pi: ExtensionAPI) {
	pi.on("tool_call", async (event, ctx) => {
		if (!ctx.cwd) {
			return {};
		}

		const input = event.input as PathBearingInput;
		const pathValue = typeof input.path === "string"
			? input.path
			: typeof input.file_path === "string"
				? input.file_path
				: null;

		if (!pathValue || !isPathOutsideCwd(pathValue, ctx.cwd)) {
			return {};
		}

		if (EXTERNAL_READ_ONLY_TOOLS.has(event.toolName)) {
			return {};
		}

		const message = `Tool '${event.toolName}' requested access to '${pathValue}' outside working directory '${ctx.cwd}'. Only read/ls/find/grep are allowed automatically. Allow this external access?`;

		if (!ctx.hasUI) {
			return {
				block: true,
				reason: `${message} No interactive UI is available to ask for approval.`,
			};
		}

		const allowed = await ctx.ui.confirm("External Directory Access", message);
		if (allowed) {
			return {};
		}

		return {
			block: true,
			reason: `User denied external directory access for tool '${event.toolName}' path '${pathValue}'.`,
		};
	});
}
