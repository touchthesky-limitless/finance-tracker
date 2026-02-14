import type { NextConfig } from "next";

const nextConfig: NextConfig = {
	/* config options here */
	images: {
		remotePatterns: [
			{
				protocol: "https",
				hostname: "**.finnhub.io",
				port: "",
				pathname: "/**",
			},
			{
				protocol: "https",
				hostname: "logo.clearbit.com", // Just in case you use other logo sources
				port: "",
			},
		],
	},
};

export default nextConfig;
