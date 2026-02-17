import { VersionProvider } from "@/app/context/VersionContext";

export default function FreeLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	return <VersionProvider version="free">{children}</VersionProvider>;
}
