export type NormalizedStatus = "active" | "awaiting" | "failed" | "completed" | "planned" | "open" | "unknown";

/** Normalize tracker, manifest, and child spellings without erasing terminal states. */
export function normalizeStatus(status: string | undefined): NormalizedStatus {
	switch (status?.trim().toLowerCase()) {
		case "active":
		case "in-progress":
		case "in_progress":
		case "running":
		case "starting":
		case "terminating":
			return "active";
		case "awaiting":
		case "waiting":
			return "awaiting";
		case "failed":
		case "failure":
		case "error":
		case "cancelled":
		case "blocked":
			return "failed";
		case "closed":
		case "completed":
		case "complete":
		case "success":
		case "passed":
			return "completed";
		case "planned":
		case "ready":
		case "queued":
			return "planned";
		case "open":
		case "pending":
			return "open";
		default:
			return "unknown";
	}
}

export function isActiveStatus(status: string | undefined): boolean {
	return normalizeStatus(status) === "active";
}

export function isCompletedStatus(status: string | undefined): boolean {
	return normalizeStatus(status) === "completed";
}

/** Dashboard spelling: active aliases collapse to running; terminal history remains explicit. */
export function dashboardStatus(status: string | undefined): string {
	const raw = status?.trim().toLowerCase();
	const normalized = normalizeStatus(raw);
	if (normalized === "active") return "running";
	if (normalized === "completed") return "completed";
	if (normalized === "awaiting") return "awaiting";
	if (raw === "failure" || raw === "error") return "failed";
	// Keep distinct terminal history such as blocked/cancelled rather than flattening it.
	return status ?? "queued";
}
