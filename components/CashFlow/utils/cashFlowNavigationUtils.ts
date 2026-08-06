/**
 * cashFlowNavigationUtils – URL resolution for detail pages.
 */
import type { CashFlowBreakdownItem } from "../types";

function addCashFlowSource(url: string | null): string | null {
	if (!url) return null;
	const sep = url.includes("?") ? "&" : "?";
	return `${url}${sep}from=cash-flow`;
}

export function resolveCashFlowDetailUrl(
	entity: Pick<
		CashFlowBreakdownItem,
		"detailUrl" | "entityKind" | "entityId" | "parentEntityId"
	>,
): string | null {
	let url: string | null = null;

	if (entity.entityKind === "group") {
		url = entity.entityId
			? `/category-groups/${encodeURIComponent(entity.entityId)}`
			: entity.detailUrl;
	} else if (entity.entityKind === "category") {
		url = entity.entityId
			? `/categories/${encodeURIComponent(entity.entityId)}`
			: entity.detailUrl;
	} else if (entity.entityKind === "merchant") {
		url = entity.entityId
			? `/merchants/${encodeURIComponent(entity.entityId)}`
			: entity.detailUrl;
	} else {
		url = entity.detailUrl ?? null;
	}
	return addCashFlowSource(url);
}
