import {
  Landmark,
  LineChart,
  Home,
  Car,
  Sparkles,
  CreditCard,
  Building2,
  WalletCards,
  type LucideIcon,
} from "lucide-react";

// Helper to map raw account names to logical subgroups
export function inferAccountSubgroup(accountName: string): string {
  const name = accountName.toLowerCase();
  if (/(checking|saving|bank|cash)/.test(name)) return "Cash";
  if (/(invest|stock|etf|mutual|brokerage)/.test(name)) return "Investments";
  if (/(real estate|property|home|mortgage)/.test(name)) return "Real Estate";
  if (/(car|auto|vehicle)/.test(name)) return "Vehicles";
  if (/(valuable|jewelry|art)/.test(name)) return "Valuables";
  if (/(credit|visa|mastercard|amex|discover)/.test(name)) return "Credit Cards";
  if (/(loan|student|personal)/.test(name)) return "Loans";
  return "Other Assets";
}

interface AccountIconProps {
  subgroup: string;
  size?: number;
  className?: string;
}

export function AccountIcon({ subgroup, size = 11, className = "" }: AccountIconProps) {
  const normalized = subgroup.toLowerCase();
  
  const Icon: LucideIcon =
    normalized === "cash" ? Landmark :
    normalized === "investments" ? LineChart :
    normalized === "real estate" || normalized === "mortgage" ? Home :
    normalized === "vehicles" ? Car :
    normalized === "valuables" ? Sparkles :
    normalized === "credit cards" ? CreditCard :
    normalized === "loans" ? Building2 :
    WalletCards;

  return (
    <span className={`flex size-5 shrink-0 items-center justify-center rounded-full bg-blue-600 text-white ${className}`}>
      <Icon size={size} strokeWidth={2} />
    </span>
  );
}