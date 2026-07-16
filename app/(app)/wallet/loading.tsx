import GlobalShimmer from "@/components/GlobalShimmer";

export default function WalletLoading() {
    return (
        <div className="w-full h-full p-4 lg:p-8">
            <GlobalShimmer />
        </div>
    );
}