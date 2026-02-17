import { VersionProvider } from "@/app/context/VersionContext";

export default function PremiumLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	return <VersionProvider version="premium">{children}</VersionProvider>;
}
