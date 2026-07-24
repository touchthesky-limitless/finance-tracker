import type { ComponentPropsWithoutRef } from "react";

import styles from "./Shimmer.module.css";

export type ShimmerProps = Omit<
	ComponentPropsWithoutRef<"div">,
	"children" | "aria-hidden"
>;

export function Shimmer({
	className = "",
	...props
}: ShimmerProps) {
	return (
		<div
			{...props}
			aria-hidden="true"
			className={`${styles.shimmer} ${className}`.trim()}
		/>
	);
}
