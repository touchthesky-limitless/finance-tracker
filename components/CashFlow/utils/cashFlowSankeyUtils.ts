/**
 * cashFlowSankeyUtils – Build Sankey data from breakdown items.
 */
import type {
	CashFlowBreakdownItem,
	SankeyBreakdown,
	SankeyLinkDatum,
	SankeyNodeDatum,
} from "../types";

function normalizeIdentity(value: string | null | undefined): string {
	return value?.trim().toLowerCase() ?? "";
}

export function buildSankeyData(
	expenseItemsByCategory: CashFlowBreakdownItem[],
	expenseItemsByGroup: CashFlowBreakdownItem[],
	mode: SankeyBreakdown,
): { nodes: SankeyNodeDatum[]; links: SankeyLinkDatum[] } {
	const total = expenseItemsByCategory.reduce(
		(sum, item) => sum + item.amount,
		0,
	);

	const root: SankeyNodeDatum = {
		id: "expenses",
		label: "Expenses",
		amount: total,
		share: 100,
		color: "#235c48",
		level: 0,
		entityKind: "root",
		entityId: null,
		parentEntityId: null,
		detailUrl: null,
	};

	const nodes: SankeyNodeDatum[] = [root];
	const links: SankeyLinkDatum[] = [];

	if (mode === "category") {
		for (const item of expenseItemsByCategory) {
			const nodeId = `category:${item.id}`;
			nodes.push({ ...item, id: nodeId, level: 1 });
			links.push({
				source: root.id,
				target: nodeId,
				value: item.amount,
				color: item.color,
			});
		}
		return { nodes, links };
	}

	const groupNodeIdByLabel = new Map<string, string>();
	for (const item of expenseItemsByGroup) {
		const nodeId = `group:${item.id}`;
		groupNodeIdByLabel.set(normalizeIdentity(item.label), nodeId);
		nodes.push({ ...item, id: nodeId, level: 1 });
		links.push({
			source: root.id,
			target: nodeId,
			value: item.amount,
			color: item.color,
		});
	}

	if (mode === "group") {
		return { nodes, links };
	}

	// mode === "both"
	for (const item of expenseItemsByCategory) {
		const nodeId = `category:${item.id}`;
		nodes.push({ ...item, id: nodeId, level: 2 });
		const sourceId =
			groupNodeIdByLabel.get(normalizeIdentity(item.parentLabel)) ?? root.id;
		links.push({
			source: sourceId,
			target: nodeId,
			value: item.amount,
			color: item.color,
		});
	}

	return { nodes, links };
}
