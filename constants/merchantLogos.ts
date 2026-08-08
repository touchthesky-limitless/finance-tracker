/**
 * Centralised configuration for merchant logo resolution.
 *
 * Contains:
 * - DOMAIN_OVERRIDES: Map of normalized merchant names to custom domains
 *   (e.g., "american airlines" → "aa.com").
 * - APISTEMIC_SKIP_LIST: Merchants that should skip Apistemic and go
 *   directly to Google favicon (or placeholder).
 * - COMMON_TLDS: List of recognised top‑level domains used to detect
 *   whether a merchant name already includes a TLD (e.g., "giftcards.com").
 *
 * These constants are consumed by the useMerchantLogoConfig hook.
 */
export const DOMAIN_OVERRIDES: Record<string, string> = {
	// "texas department of public safety": "dps.texas.gov",
	"ntta": "ntta.org",
	"internal revenue service": "irs.gov",
	"collin county tx": "collincountytx.gov",
	"costco gas": "costco.com",
	"american airlines": "aa.com",
	"dallas superstore": "shunfatsupermarket.com",
	"saigon mall supermarket": "shunfatsupermarket.com",
	"fidelity investments": "fidelity.com",
	"amazon prime": "amazon.com",
	"amazon prime annual fee": "amazon.com",
	"capital 1 lounge": "capitalone.com",
	"baylor scott & white health": "bswhealth.com",
	"advanced technology group": "atgonline.com",
	"spec's wine, spirits & finer foods": "specsonline.com",
};

export const APISTEMIC_SKIP_LIST = new Set([
	// "texas department of public safety",
	"frontier utilities",
	"bank of america",
	"bear creek sud",
	"saigon mall supermarket",
	"staples",
	"office depot",
	"officemax",
	"bistro b",
	"citi",
	"uniqlo",
	"cot",
	"capital one travel",
	"capital 1 lounge",
	"macy's",
	"bamboo airways",
	"phuongs nursery",
	"frontier airlines",
	"giftcards.com",
	"zelle",
	"advanced technology group",
	"chili's",
	"woot",
	"stanley",
	"collin county tx",
	"gamecardsvn",
	"abc stores",
	"76",
	"76 fuel",
	"spec's wine, spirits & finer foods",
	"la fitness",
]);

export const COMMON_TLDS = [
	".com",
	".org",
	".net",
	".gov",
	".edu",
	".io",
	".co",
	".vn",
];
