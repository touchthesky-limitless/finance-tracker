import type { FilterNode } from "@/components/Accounts/types";

export function getDescendantAccountIds(node: FilterNode): string[] {
	if (node.account) {
		return [node.account.id];
	}

	return (
		node.children?.flatMap((child) => {
			return getDescendantAccountIds(child);
		}) ?? []
	);
}

export function getDescendantParentIds(node: FilterNode): string[] {
	if (node.account) {
		return [];
	}

	return [
		node.id,
		...(
			node.children?.flatMap((child) => {
				return getDescendantParentIds(child);
			}) ?? []
		),
	];
}

export function findAccountAncestorIds(
	tree: FilterNode[],
	accountId: string,
): string[] {
	function visit(
		node: FilterNode,
		ancestorIds: string[],
	): string[] | null {
		if (node.account?.id === accountId) {
			return ancestorIds;
		}

		const nextAncestorIds = node.account
			? ancestorIds
			: [...ancestorIds, node.id];

		for (const child of node.children ?? []) {
			const result = visit(child, nextAncestorIds);

			if (result) {
				return result;
			}
		}

		return null;
	}

	for (const node of tree) {
		const result = visit(node, []);

		if (result) {
			return result;
		}
	}

	return [];
}
