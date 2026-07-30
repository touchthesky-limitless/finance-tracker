import { ICON_MAP } from "@/constants/icons";
import { HelpCircle } from "lucide-react";

/**
 * Returns a Lucide icon component for a given category name.
 * Falls back to HelpCircle if not found.
 */
export function getIconForCategory(categoryName: string) {
  const icon = ICON_MAP[categoryName];
  return icon || HelpCircle;
}