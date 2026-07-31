import { create } from "zustand";
import { createClient } from "@/lib/supabase";

export interface DashboardWidgets {
	order: string[]; // ordered list of widget IDs
	hidden: string[]; // widget IDs that are hidden
}

interface DashboardStore {
	widgets: DashboardWidgets;
	isLoading: boolean;
	fetchDashboardWidgets: () => Promise<void>;
	updateOrder: (newOrder: string[]) => Promise<void>;
	setHiddenList: (hiddenIds: string[]) => Promise<void>;
	toggleHidden: (widgetId: string) => Promise<void>;
}

const DEFAULT_WIDGETS: DashboardWidgets = {
	order: [
		"budget",
		"spending",
		"networth",
		"top_categories",
		"recurring",
		"transactions",
		"stocks",
		"goals",
	],
	hidden: [],
};

export const useDashboardStore = create<DashboardStore>((set, get) => ({
	widgets: DEFAULT_WIDGETS,
	isLoading: true,

	fetchDashboardWidgets: async () => {
		const supabase = createClient();
		const {
			data: { user },
		} = await supabase.auth.getUser();
		if (!user) {
			set({ widgets: DEFAULT_WIDGETS, isLoading: false });
			return;
		}

		const { data, error } = await supabase
			.from("user_preferences")
			.select("dashboard_widgets")
			.eq("user_id", user.id)
			.single();

		if (error) {
			console.error("Failed to load dashboard widgets:", error);
			set({ widgets: DEFAULT_WIDGETS, isLoading: false });
			return;
		}

		// Merge with defaults in case of missing fields
		const saved = data?.dashboard_widgets || {};
		const widgets: DashboardWidgets = {
			order: Array.isArray(saved.order) ? saved.order : DEFAULT_WIDGETS.order,
			hidden: Array.isArray(saved.hidden)
				? saved.hidden
				: DEFAULT_WIDGETS.hidden,
		};
		set({ widgets, isLoading: false });
	},

	updateOrder: async (newOrder: string[]) => {
		const supabase = createClient();
		const {
			data: { user },
		} = await supabase.auth.getUser();
		if (!user) return;

		const current = get().widgets;
		const updated = { ...current, order: newOrder };
		set({ widgets: updated });

		const { error } = await supabase
			.from("user_preferences")
			.upsert({ user_id: user.id, dashboard_widgets: updated });
		if (error) console.error("Failed to save order:", error);
	},

	setHiddenList: async (hiddenIds: string[]) => {
		const supabase = createClient();
		const {
			data: { user },
		} = await supabase.auth.getUser();
		if (!user) return;

		const current = get().widgets;
		const updated = { ...current, hidden: hiddenIds };
		set({ widgets: updated });

		const { error } = await supabase
			.from("user_preferences")
			.upsert({ user_id: user.id, dashboard_widgets: updated });
		if (error) console.error("Failed to save hidden list:", error);
	},

	toggleHidden: async (widgetId: string) => {
		const current = get().widgets;
		const isHidden = current.hidden.includes(widgetId);
		const newHidden = isHidden
			? current.hidden.filter((id) => id !== widgetId)
			: [...current.hidden, widgetId];
		await get().setHiddenList(newHidden);
	},
}));
