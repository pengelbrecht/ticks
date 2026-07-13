import * as path from "node:path";
import { buildDashboardModel, type DashboardModel } from "./dashboard.ts";
import type { RecoverySnapshot } from "./recovery.ts";
import { dashboardStatus, isActiveStatus, normalizeStatus } from "./status.ts";

/** Rebuild a dashboard from bounded persisted history, overlaid with fresh tracker/recovery state. */
export function statusDashboardModel(snapshot: RecoverySnapshot): DashboardModel {
	const manifestStatuses = snapshot.manifests.map((item) => normalizeStatus(item.manifest?.status));
	const active = snapshot.items.some((item) => item.kind === "active-run" || item.kind === "in-progress")
		|| snapshot.ticks.some((tick) => isActiveStatus(tick.tracker?.status));
	const status = active ? "running"
		: snapshot.items.some((item) => item.kind === "awaiting-gate") || manifestStatuses.includes("awaiting") ? "awaiting"
		: snapshot.items.some((item) => item.kind === "failed-run" || item.kind === "failed-verification") || manifestStatuses.includes("failed") ? "failed"
		: manifestStatuses.includes("completed") ? "completed"
		: snapshot.items.length ? "recoverable" : "idle";
	const historical = snapshot.manifests.find((item) => item.dashboard && (!snapshot.epicId || item.manifest?.epicId === snapshot.epicId))?.dashboard;
	const recoveredAgents = snapshot.ticks.filter((tick) => {
		const normalized = normalizeStatus(tick.tracker?.status);
		return normalized === "active" || normalized === "awaiting" || normalized === "failed" || normalized === "completed" || Boolean(tick.tracker?.awaiting) || tick.branches.length > 0 || tick.worktrees.length > 0;
	}).map((tick) => ({
		tickId: tick.tickId,
		title: tick.tracker?.title,
		branch: tick.branches[0],
		worktree: tick.worktrees[0]?.path,
		status: tick.tracker?.awaiting ? "awaiting" : dashboardStatus(tick.tracker?.status ?? "recoverable"),
	}));
	const byTick = new Map(recoveredAgents.map((agent) => [agent.tickId, agent]));
	const historicalAgents = historical?.agents.map((agent) => {
		const recovered = byTick.get(agent.tickId);
		if (!recovered) return agent;
		byTick.delete(agent.tickId);
		return { ...agent, ...recovered, title: recovered.title ?? agent.title, branch: recovered.branch ?? agent.branch, worktree: recovered.worktree ?? agent.worktree };
	}) ?? [];
	return buildDashboardModel({
		runId: historical?.runId ?? snapshot.manifests[0]?.manifest?.runId ?? "repository-status",
		epicId: historical?.epicId ?? snapshot.epicId ?? snapshot.manifests[0]?.manifest?.epicId ?? "repository",
		epicTitle: historical?.epicTitle ?? snapshot.epicId ?? path.basename(snapshot.repoRoot),
		status,
		currentWave: historical?.currentWave,
		criticalPath: historical?.criticalPath,
		waves: historical?.waves,
		agents: [...historicalAgents, ...byTick.values()],
		verification: historical?.verification,
		merges: historical?.merges,
		recovery: snapshot.items.map((item) => ({ kind: item.kind, label: item.label, detail: item.detail, action: item.action, artifacts: item.artifactPaths, lastDecision: item.lastDecision })),
		humanGates: snapshot.ticks.filter((tick) => tick.tracker?.awaiting).map((tick) => ({
			tickId: tick.tickId,
			title: tick.tracker?.title ?? "(untitled)",
			type: tick.tracker!.awaiting!,
			status: "awaiting" as const,
			detail: tick.lastDecision,
		})),
	});
}
