"use client";

import {
	useEffect,
	useMemo,
	useRef,
	useState,
	type KeyboardEvent as ReactKeyboardEvent,
	type MouseEvent as ReactMouseEvent,
	type RefObject,
} from "react";
import {
	sankey,
	sankeyLinkHorizontal,
	type SankeyLink,
	type SankeyNode,
} from "d3-sankey";
import { useRouter } from "next/navigation";

import type {
	SankeyLinkDatum,
	SankeyNodeDatum,
} from "@/components/CashFlow/types";
import { resolveCashFlowDetailUrl } from "@/components/CashFlow/cashFlowUtils";
import { CategoryIcon } from "@/components/CategoryIcon";
import { formatMoney } from "@/utils/formatters";

const MINIMUM_DIAGRAM_WIDTH = 980;
const MINIMUM_HEIGHT = 760;
const VERTICAL_PADDING = 28;
const LABEL_GAP = 12;
const DEFAULT_LABEL_HEIGHT = 42;

type LayoutNode = SankeyNode<SankeyNodeDatum, SankeyLinkDatum> &
	SankeyNodeDatum;

type LayoutLink = SankeyLink<SankeyNodeDatum, SankeyLinkDatum> &
	SankeyLinkDatum;

type HoveredSeed =
	| {
			kind: "node";
			id: string;
	  }
	| {
			kind: "link";
			index: number;
	  };

type HoveredElement = HoveredSeed & {
	x: number;
	y: number;
};

function getNodeId(
	endpoint: string | number | SankeyNode<SankeyNodeDatum, SankeyLinkDatum>,
): string {
	if (typeof endpoint === "string" || typeof endpoint === "number") {
		return String(endpoint);
	}

	return endpoint.id;
}

function getNodeAmount(node: SankeyNodeDatum): number {
	return Number.isFinite(node.amount) ? node.amount : 0;
}

function navigateToDetail(
	event: ReactMouseEvent<Element>,
	detailUrl: string | null,
	push: (href: string) => void,
): void {
	if (!detailUrl) {
		return;
	}

	event.preventDefault();
	event.stopPropagation();
	push(detailUrl);
}

function clamp(value: number, minimum: number, maximum: number): number {
	return Math.min(Math.max(value, minimum), maximum);
}

function useResponsiveWidth(
	containerRef: RefObject<HTMLDivElement | null>,
): number {
	const [width, setWidth] = useState(0);

	useEffect(() => {
		const element = containerRef.current;

		if (!element) {
			return;
		}

		let frameId = 0;

		const updateWidth = (nextWidth: number): void => {
			window.cancelAnimationFrame(frameId);
			frameId = window.requestAnimationFrame(() => {
				setWidth((currentWidth) => {
					const roundedWidth = Math.max(0, Math.floor(nextWidth));

					return currentWidth === roundedWidth ? currentWidth : roundedWidth;
				});
			});
		};

		updateWidth(element.getBoundingClientRect().width);

		if (typeof ResizeObserver === "undefined") {
			const handleResize = (): void => {
				updateWidth(element.getBoundingClientRect().width);
			};

			window.addEventListener("resize", handleResize);

			return () => {
				window.cancelAnimationFrame(frameId);
				window.removeEventListener("resize", handleResize);
			};
		}

		const observer = new ResizeObserver((entries) => {
			const entry = entries[0];

			if (entry) {
				updateWidth(entry.contentRect.width);
			}
		});

		observer.observe(element);

		return () => {
			window.cancelAnimationFrame(frameId);
			observer.disconnect();
		};
	}, [containerRef]);

	return width;
}

function getHorizontalPadding(width: number): number {
	if (width >= 1440) {
		return 30;
	}

	if (width >= 1120) {
		return 24;
	}

	return 18;
}

function getNodeWidth(width: number): number {
	return width >= 1120 ? 16 : 13;
}

function getResponsiveLabelWidth({
	diagramWidth,
	maximumLevel,
	isTerminal,
	nodeWidth,
	horizontalPadding,
}: {
	diagramWidth: number;
	maximumLevel: number;
	isTerminal: boolean;
	nodeWidth: number;
	horizontalPadding: number;
}): number {
	const levelCount = Math.max(1, maximumLevel);
	const usableWidth = diagramWidth - horizontalPadding * 2 - nodeWidth;
	const columnSpan = usableWidth / levelCount;
	const maximumWithinColumn = Math.max(
		148,
		columnSpan - nodeWidth - LABEL_GAP * 2,
	);
	const preferredWidth = isTerminal
		? clamp(diagramWidth * 0.18, 210, 292)
		: clamp(diagramWidth * 0.155, 190, 250);

	return Math.min(preferredWidth, maximumWithinColumn);
}

function getDensestLevelCount(nodes: SankeyNodeDatum[]): number {
	const counts = new Map<number, number>();

	for (const node of nodes) {
		if (node.entityKind === "root") {
			continue;
		}

		counts.set(node.level, (counts.get(node.level) ?? 0) + 1);
	}

	return Math.max(1, ...counts.values());
}

function getDiagramHeight(
	densestLevelCount: number,
	diagramWidth: number,
): number {
	/*
	 * Monarch keeps labels attached to their node and gives every dense-column
	 * item enough vertical room for two text rows. The extra 260 px remains
	 * available for the value-scaled node bodies, while 58 px per item prevents
	 * small terminal categories from collapsing into one another.
	 */
	const rowHeight = diagramWidth < 1100 ? 64 : 58;

	return Math.max(MINIMUM_HEIGHT, densestLevelCount * rowHeight + 260);
}

function getNodePadding(densestLevelCount: number): number {
	if (densestLevelCount >= 18) {
		return 44;
	}

	if (densestLevelCount >= 13) {
		return 40;
	}

	if (densestLevelCount >= 9) {
		return 34;
	}

	return 28;
}

export function CashFlowSankey({
	nodes,
	links,
	hideAmounts,
}: {
	nodes: SankeyNodeDatum[];
	links: SankeyLinkDatum[];
	hideAmounts: boolean;
}) {
	const router = useRouter();
	const containerRef = useRef<HTMLDivElement>(null);
	const [hovered, setHovered] = useState<HoveredElement | null>(null);
	const measuredWidth = useResponsiveWidth(containerRef);

	const maximumLevel = Math.max(
		0,
		...nodes.map((node) => {
			return node.level;
		}),
	);
	const densestLevelCount = getDensestLevelCount(nodes);
	const diagramWidth = Math.max(
		MINIMUM_DIAGRAM_WIDTH,
		measuredWidth || MINIMUM_DIAGRAM_WIDTH,
	);
	const horizontalPadding = getHorizontalPadding(diagramWidth);
	const nodeWidth = getNodeWidth(diagramWidth);
	const height = getDiagramHeight(densestLevelCount, diagramWidth);
	const nodePadding = getNodePadding(densestLevelCount);
	const labelHeight = diagramWidth < 1100 ? 40 : DEFAULT_LABEL_HEIGHT;
	const labelFontSize = diagramWidth < 1100 ? 12 : 13;
	const amountFontSize = diagramWidth < 1100 ? 13 : 14;
	const iconSize = diagramWidth < 1100 ? 13 : 14;

	const graph = useMemo(() => {
		const generator = sankey<SankeyNodeDatum, SankeyLinkDatum>()
			.nodeId((node) => node.id)
			.nodeWidth(nodeWidth)
			.nodePadding(nodePadding)
			.nodeAlign((node) => node.level)
			.nodeSort((first, second) => {
				const amountDifference = getNodeAmount(second) - getNodeAmount(first);

				if (amountDifference !== 0) {
					return amountDifference;
				}

				return String(first.label ?? "").localeCompare(
					String(second.label ?? ""),
					"en-US",
					{
						sensitivity: "base",
						numeric: true,
					},
				);
			})
			.extent([
				[horizontalPadding, VERTICAL_PADDING],
				[diagramWidth - horizontalPadding, height - VERTICAL_PADDING],
			])
			.iterations(72);

		return generator({
			nodes: nodes.map((node) => ({ ...node })),
			links: links.map((link) => ({ ...link })),
		});
	}, [
		diagramWidth,
		height,
		horizontalPadding,
		links,
		nodePadding,
		nodeWidth,
		nodes,
	]);

	const createLinkPath = sankeyLinkHorizontal<
		SankeyNodeDatum,
		SankeyLinkDatum
	>();
	const layoutNodes = useMemo(() => {
		return graph.nodes.map((node) => node as LayoutNode);
	}, [graph.nodes]);
	const nodeById = useMemo(() => {
		return new Map(layoutNodes.map((node) => [node.id, node] as const));
	}, [layoutNodes]);

	const getNodeDetailUrl = (node: LayoutNode): string | null => {
		if (node.entityKind === "root") {
			return null;
		}

		return resolveCashFlowDetailUrl({
			detailUrl: node.detailUrl ?? null,
			entityKind: node.entityKind ?? "category",
			entityId: node.entityId ?? null,
			parentEntityId: node.parentEntityId ?? null,
		});
	};

	const getLinkDetailUrl = (link: LayoutLink): string | null => {
		const targetNode = nodeById.get(getNodeId(link.target));
		return targetNode ? getNodeDetailUrl(targetNode) : null;
	};

	const highlightedNodeIds = useMemo(() => {
		if (!hovered) {
			return null;
		}

		const highlightedIds = new Set<string>();

		if (hovered.kind === "node") {
			highlightedIds.add(hovered.id);

			for (const rawLink of graph.links) {
				const link = rawLink as LayoutLink;
				const sourceId = getNodeId(link.source);
				const targetId = getNodeId(link.target);

				if (sourceId === hovered.id || targetId === hovered.id) {
					highlightedIds.add(sourceId);
					highlightedIds.add(targetId);
				}
			}
		} else {
			const selectedLink = graph.links[hovered.index] as LayoutLink | undefined;

			if (selectedLink) {
				highlightedIds.add(getNodeId(selectedLink.source));
				highlightedIds.add(getNodeId(selectedLink.target));
			}
		}

		return highlightedIds;
	}, [graph.links, hovered]);

	const updatePointerPosition = (
		event: ReactMouseEvent<Element>,
		nextHovered: HoveredSeed,
	): void => {
		const container = containerRef.current;

		if (!container) {
			return;
		}

		const bounds = container.getBoundingClientRect();
		const rawX = event.clientX - bounds.left + container.scrollLeft + 14;
		const rawY = event.clientY - bounds.top + container.scrollTop + 14;
		const maximumX = Math.max(12, container.scrollWidth - 260);
		const maximumY = Math.max(12, container.scrollHeight - 120);

		const next = {
			...nextHovered,
			x: Math.min(Math.max(rawX, 12), maximumX),
			y: Math.min(Math.max(rawY, 12), maximumY),
		};

		setHovered(next);
	};

	const tooltip = useMemo(() => {
		if (!hovered) {
			return null;
		}

		if (hovered.kind === "node") {
			const node = nodeById.get(hovered.id);

			return node
				? {
						title: node.label,
						amount: node.amount,
						share: node.share,
					}
				: null;
		}

		const link = graph.links[hovered.index] as LayoutLink | undefined;

		if (!link) {
			return null;
		}

		const sourceNode = nodeById.get(getNodeId(link.source));
		const targetNode = nodeById.get(getNodeId(link.target));
		const total = nodes.find((node) => node.id === "expenses")?.amount ?? 0;

		return {
			title:
				`${sourceNode?.label ?? "Source"} → ` +
				`${targetNode?.label ?? "Target"}`,
			amount: link.value,
			share: total > 0 ? (link.value / total) * 100 : 0,
		};
	}, [graph.links, hovered, nodeById, nodes]);

	return (
		<div
			ref={containerRef}
			className="relative w-full overflow-x-auto px-0 py-2"
			onMouseLeave={() => setHovered(null)}
		>
			<svg
				width={diagramWidth}
				height={height}
				viewBox={`0 0 ${diagramWidth} ${height}`}
				preserveAspectRatio="xMinYMin meet"
				className="block max-w-none"
				style={{
					width: `${diagramWidth}px`,
					height: `${height}px`,
				}}
				role="img"
				aria-label="Cash flow Sankey diagram"
			>
				<defs>
					{graph.links.map((rawLink, index) => {
						const link = rawLink as LayoutLink;

						return (
							<linearGradient
								key={`${getNodeId(link.source)}:${getNodeId(link.target)}:${index}`}
								id={`cash-flow-link-${index}`}
								x1="0%"
								x2="100%"
								y1="0%"
								y2="0%"
							>
								<stop offset="0%" stopColor="#215845" stopOpacity="0.86" />
								<stop offset="100%" stopColor={link.color} stopOpacity="0.86" />
							</linearGradient>
						);
					})}
				</defs>

				{graph.links.map((rawLink, index) => {
					const link = rawLink as LayoutLink;
					const sourceId = getNodeId(link.source);
					const targetId = getNodeId(link.target);
					const linkPath = createLinkPath(link) ?? undefined;
					const detailUrl = getLinkDetailUrl(link);
					const isHighlighted =
						!hovered ||
						(hovered.kind === "link" && hovered.index === index) ||
						(hovered.kind === "node" &&
							(sourceId === hovered.id || targetId === hovered.id));

					const interactionProps = {
						onMouseEnter: (event: ReactMouseEvent<SVGPathElement>) => {
							updatePointerPosition(event, { kind: "link" as const, index });
						},
						onMouseMove: (event: ReactMouseEvent<SVGPathElement>) => {
							updatePointerPosition(event, { kind: "link" as const, index });
						},
						onMouseLeave: () => setHovered(null),
					};

					return (
						<g key={`${sourceId}:${targetId}:${index}`}>
							<path
								d={linkPath}
								fill="none"
								stroke={`url(#cash-flow-link-${index})`}
								strokeWidth={Math.max(1.5, link.width ?? 1)}
								strokeOpacity={isHighlighted ? 0.88 : 0.12}
								style={{ transition: "stroke-opacity 150ms ease" }}
							/>

							{detailUrl ? (
								<a href={detailUrl} aria-label={`View ${targetId}`}>
									<path
										d={linkPath}
										fill="none"
										stroke="transparent"
										strokeWidth={Math.max(18, link.width ?? 1)}
										pointerEvents="stroke"
										className="cursor-pointer"
										onClick={(event: ReactMouseEvent<SVGPathElement>) => {
											navigateToDetail(event, detailUrl, router.push);
										}}
										{...interactionProps}
									/>
								</a>
							) : (
								<path
									d={linkPath}
									fill="none"
									stroke="transparent"
									strokeWidth={Math.max(18, link.width ?? 1)}
									pointerEvents="stroke"
									{...interactionProps}
								/>
							)}
						</g>
					);
				})}

				{layoutNodes.map((node) => {
					const x0 = node.x0 ?? 0;
					const x1 = node.x1 ?? 0;
					const y0 = node.y0 ?? 0;
					const y1 = node.y1 ?? 0;
					const isRoot = node.entityKind === "root";
					const isTerminal = node.level === maximumLevel;
					const labelWidth = getResponsiveLabelWidth({
						diagramWidth,
						maximumLevel,
						isTerminal,
						nodeWidth,
						horizontalPadding,
					});
					/* Monarch anchors every non-root label directly left of its node. */
					const labelX = x0 - labelWidth - LABEL_GAP;
					const nodeCenterY = (y0 + y1) / 2;
					const labelY = clamp(
						nodeCenterY - labelHeight / 2,
						VERTICAL_PADDING,
						height - VERTICAL_PADDING - labelHeight,
					);
					const detailUrl = getNodeDetailUrl(node);
					const opacity =
						highlightedNodeIds === null || highlightedNodeIds.has(node.id)
							? 1
							: 0.16;
					const hitBoxX = isRoot ? x0 : labelX;
					const hitBoxWidth = isRoot ? x1 - x0 : x1 - labelX;
					const hitBoxY = isRoot ? y0 : Math.min(y0, labelY);
					const hitBoxHeight = isRoot
						? Math.max(2, y1 - y0)
						: Math.max(y1, labelY + labelHeight) - hitBoxY;

					return (
						<a
							key={node.id}
							href={detailUrl ?? undefined}
							tabIndex={detailUrl ? 0 : -1}
							role={detailUrl ? "link" : undefined}
							aria-label={detailUrl ? `View ${node.label}` : undefined}
							className={
								detailUrl ? "cursor-pointer outline-none" : "outline-none"
							}
							style={{ opacity, transition: "opacity 150ms ease" }}
							onClick={(event: ReactMouseEvent<HTMLAnchorElement>) => {
								navigateToDetail(event, detailUrl, router.push);
							}}
							onKeyDown={(event: ReactKeyboardEvent<HTMLAnchorElement>) => {
								if (
									!detailUrl ||
									(event.key !== "Enter" && event.key !== " ")
								) {
									return;
								}

								event.preventDefault();
								router.push(detailUrl);
							}}
							onMouseEnter={(event: ReactMouseEvent<HTMLAnchorElement>) => {
								updatePointerPosition(event, { kind: "node", id: node.id });
							}}
							onMouseMove={(event: ReactMouseEvent<HTMLAnchorElement>) => {
								updatePointerPosition(event, { kind: "node", id: node.id });
							}}
							onMouseLeave={() => setHovered(null)}
						>
							<rect
								x={hitBoxX}
								y={hitBoxY}
								width={Math.max(1, hitBoxWidth)}
								height={Math.max(2, hitBoxHeight)}
								fill="transparent"
								pointerEvents={detailUrl ? "all" : "none"}
							/>
							<rect
								x={x0}
								y={y0}
								width={Math.max(1, x1 - x0)}
								height={Math.max(2, y1 - y0)}
								fill={node.color}
								rx={0.5}
							/>

							{!isRoot && (
								<foreignObject
									x={labelX}
									y={labelY}
									width={labelWidth}
									height={labelHeight}
									pointerEvents="none"
								>
									<div className="flex h-full w-full flex-col items-end justify-center overflow-visible text-right">
										<div className="flex max-w-full items-center justify-end gap-1.5 whitespace-nowrap">
											<CategoryIcon
												name={node.iconName || node.label}
												size={iconSize}
											/>
											<span
												className="whitespace-nowrap font-semibold leading-[1.15] tracking-[-0.01em] text-gray-100 dark:text-white"
												style={{ fontSize: `${labelFontSize}px` }}
											>
												{node.label}
											</span>
										</div>
										<div
											className="mt-1 whitespace-nowrap font-bold leading-[1.15] tracking-[-0.01em] text-white"
											style={{ fontSize: `${amountFontSize}px` }}
										>
											{hideAmounts
												? `${node.share.toFixed(1)}%`
												: `${formatMoney(node.amount)} (${node.share.toFixed(1)}%)`}
										</div>
									</div>
								</foreignObject>
							)}
						</a>
					);
				})}
			</svg>

			{tooltip && hovered && (
				<div
					className="pointer-events-none absolute z-20 min-w-56 rounded-xl border border-white/10 bg-[#111] px-4 py-3 text-white shadow-2xl"
					style={{ left: hovered.x, top: hovered.y }}
				>
					<p className="max-w-64 truncate text-sm font-bold">{tooltip.title}</p>
					<div className="mt-2 flex items-center justify-between gap-5 text-sm">
						{!hideAmounts && (
							<span data-share-amount className="font-bold">
								{formatMoney(tooltip.amount)}
							</span>
						)}
						<span className="text-gray-300">{tooltip.share.toFixed(1)}%</span>
					</div>
				</div>
			)}
		</div>
	);
}
