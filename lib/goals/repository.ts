import { createClient } from "@/lib/supabase";
import { deriveGoalStatus } from "@/lib/goals/formatters";
import type {
	DebtAccountSetting,
	DebtPaydownSetting,
	GoalAccountLink,
	GoalAccountSetting,
	GoalAllocation,
	GoalAllocationKind,
	GoalCreateInput,
	GoalUpdateInput,
	SavingsGoal,
} from "@/lib/goals/types";

const supabase = createClient();
const GOAL_COLUMNS =
	"id, user_id, name, target_amount, target_date, image_path, spending_reduces_progress, archived_at, created_at, updated_at";

interface GoalRow {
	id: string;
	user_id: string;
	name: string;
	target_amount: number | string | null;
	target_date: string | null;
	image_path: string | null;
	spending_reduces_progress: boolean;
	archived_at: string | null;
	created_at: string;
	updated_at: string;
}

interface GoalAccountRow {
	goal_id: string;
	account_id: string;
	planned_monthly_amount: number | string | null;
}

interface AllocationRow {
	id: string;
	goal_id: string;
	account_id: string | null;
	kind: GoalAllocationKind;
	amount: number | string;
	allocated_at: string;
	include_in_budget: boolean;
	note: string | null;
	created_at: string;
}

async function requireUserId(): Promise<string> {
	const {
		data: { user },
		error,
	} = await supabase.auth.getUser();

	if (error) {
		throw error;
	}

	if (!user) {
		throw new Error("You must be signed in to use goals.");
	}

	return user.id;
}

async function createGoalImageUrl(imagePath: string | null): Promise<string | null> {
	if (!imagePath) {
		return null;
	}

	const { data, error } = await supabase.storage
		.from("goal-images")
		.createSignedUrl(imagePath, 60 * 60);

	if (error) {
		console.error("Failed to create goal image URL:", error.message);
		return null;
	}

	return data.signedUrl;
}

function mapAllocation(row: AllocationRow): GoalAllocation {
	return {
		id: row.id,
		goalId: row.goal_id,
		accountId: row.account_id,
		kind: row.kind,
		amount: Number(row.amount) || 0,
		allocatedAt: row.allocated_at,
		includeInBudget: row.include_in_budget,
		note: row.note,
		createdAt: row.created_at,
	};
}

async function hydrateGoals(
	rows: GoalRow[],
	accountRows: GoalAccountRow[],
	allocationRows: AllocationRow[],
): Promise<SavingsGoal[]> {
	const accountRowsByGoal = new Map<string, GoalAccountRow[]>();
	const allocationsByGoal = new Map<string, GoalAllocation[]>();

	for (const row of accountRows) {
		const current = accountRowsByGoal.get(row.goal_id) ?? [];
		current.push(row);
		accountRowsByGoal.set(row.goal_id, current);
	}

	for (const row of allocationRows) {
		const allocation = mapAllocation(row);
		const current = allocationsByGoal.get(row.goal_id) ?? [];
		current.push(allocation);
		allocationsByGoal.set(row.goal_id, current);
	}

	return Promise.all(
		rows.map(async (row) => {
			const links = accountRowsByGoal.get(row.id) ?? [];
			const allocations = allocationsByGoal.get(row.id) ?? [];
			const saved = allocations.reduce((total, allocation) => {
				return allocation.kind === "spending"
					? total - Math.abs(allocation.amount)
					: total + Math.abs(allocation.amount);
			}, 0);
			const spent = allocations.reduce((total, allocation) => {
				return allocation.kind === "spending"
					? total + Math.abs(allocation.amount)
					: total;
			}, 0);
			const targetAmount = Number(row.target_amount) || 0;
			const imageUrl = await createGoalImageUrl(row.image_path);

			return {
				id: row.id,
				userId: row.user_id,
				name: row.name,
				targetAmount,
				targetDate: row.target_date,
				imagePath: row.image_path,
				imageUrl,
				spendingReducesProgress: row.spending_reduces_progress,
				archivedAt: row.archived_at,
				createdAt: row.created_at,
				updatedAt: row.updated_at,
				saved: Math.max(0, saved),
				spent,
				status: deriveGoalStatus({
					saved: Math.max(0, saved),
					targetAmount,
					targetDate: row.target_date,
				}),
				linkedAccountIds: links.map((link) => link.account_id),
				monthlyContribution: links.reduce((total, link) => {
					return total + (Number(link.planned_monthly_amount) || 0);
				}, 0),
			};
		}),
	);
}

export async function fetchSavingsGoals(): Promise<SavingsGoal[]> {
	const userId = await requireUserId();
	const { data: goalRows, error: goalError } = await supabase
		.from("goals")
		.select(GOAL_COLUMNS)
		.eq("user_id", userId)
		.eq("kind", "savings")
		.is("archived_at", null)
		.order("created_at", { ascending: true });

	if (goalError) {
		throw goalError;
	}

	const rows = (goalRows ?? []) as GoalRow[];
	const goalIds = rows.map((row) => row.id);

	if (goalIds.length === 0) {
		return [];
	}

	const [{ data: accountRows, error: accountError }, { data: allocations, error: allocationError }] =
		await Promise.all([
			supabase
				.from("goal_accounts")
				.select("goal_id, account_id, planned_monthly_amount")
				.in("goal_id", goalIds),
			supabase
				.from("goal_allocations")
				.select(
					"id, goal_id, account_id, kind, amount, allocated_at, include_in_budget, note, created_at",
				)
				.in("goal_id", goalIds)
				.order("allocated_at", { ascending: false }),
		]);

	if (accountError) {
		throw accountError;
	}

	if (allocationError) {
		throw allocationError;
	}

	return hydrateGoals(
		rows,
		(accountRows ?? []) as GoalAccountRow[],
		(allocations ?? []) as AllocationRow[],
	);
}

export async function fetchGoalAllocations(goalId: string): Promise<GoalAllocation[]> {
	const userId = await requireUserId();
	const { data, error } = await supabase
		.from("goal_allocations")
		.select(
			"id, goal_id, account_id, kind, amount, allocated_at, include_in_budget, note, created_at",
		)
		.eq("user_id", userId)
		.eq("goal_id", goalId)
		.order("allocated_at", { ascending: false });

	if (error) {
		throw error;
	}

	return ((data ?? []) as AllocationRow[]).map(mapAllocation);
}

export async function fetchGoalAccountLinks(goalId: string): Promise<GoalAccountLink[]> {
	const { data, error } = await supabase
		.from("goal_accounts")
		.select("goal_id, account_id, planned_monthly_amount")
		.eq("goal_id", goalId);

	if (error) {
		throw error;
	}

	return ((data ?? []) as GoalAccountRow[]).map((row) => ({
		goalId: row.goal_id,
		accountId: row.account_id,
		plannedMonthlyAmount: Number(row.planned_monthly_amount) || 0,
	}));
}

export async function createSavingsGoal(input: GoalCreateInput): Promise<SavingsGoal> {
	const userId = await requireUserId();
	const { data, error } = await supabase
		.from("goals")
		.insert({
			user_id: userId,
			kind: "savings",
			name: input.name.trim(),
			target_amount: input.targetAmount,
			target_date: input.targetDate,
			spending_reduces_progress: input.spendingReducesProgress,
		})
		.select(GOAL_COLUMNS)
		.single();

	if (error) {
		throw error;
	}

	const row = data as GoalRow;

	if (input.linkedAccounts.length > 0) {
		const { error: linkError } = await supabase.from("goal_accounts").insert(
			input.linkedAccounts.map((link) => ({
				user_id: userId,
				goal_id: row.id,
				account_id: link.accountId,
				planned_monthly_amount: link.plannedMonthlyAmount,
			})),
		);

		if (linkError) {
			throw linkError;
		}
	}

	if (input.initialAllocations.length > 0) {
		const { error: allocationError } = await supabase
			.from("goal_allocations")
			.insert(
				input.initialAllocations.map((allocation) => ({
					user_id: userId,
					goal_id: row.id,
					account_id: allocation.accountId,
					kind: "adjustment",
					amount: allocation.amount,
					allocated_at: new Date().toISOString(),
					include_in_budget: allocation.includeInBudget,
				})),
			);

		if (allocationError) {
			throw allocationError;
		}
	}

	const goals = await fetchSavingsGoals();
	const createdGoal = goals.find((goal) => goal.id === row.id);

	if (!createdGoal) {
		throw new Error("Goal was created but could not be reloaded.");
	}

	return createdGoal;
}

export async function updateSavingsGoal(
	goalId: string,
	updates: GoalUpdateInput,
): Promise<void> {
	const userId = await requireUserId();
	const payload: Record<string, unknown> = {};

	if (updates.name !== undefined) {
		payload.name = updates.name.trim();
	}
	if (updates.targetAmount !== undefined) {
		payload.target_amount = updates.targetAmount;
	}
	if (updates.targetDate !== undefined) {
		payload.target_date = updates.targetDate;
	}
	if (updates.spendingReducesProgress !== undefined) {
		payload.spending_reduces_progress = updates.spendingReducesProgress;
	}

	const { error } = await supabase
		.from("goals")
		.update(payload)
		.eq("id", goalId)
		.eq("user_id", userId);

	if (error) {
		throw error;
	}
}

export async function setGoalAccountLinks(
	goalId: string,
	links: Array<{ accountId: string; plannedMonthlyAmount: number }>,
): Promise<void> {
	const userId = await requireUserId();
	const { error: deleteError } = await supabase
		.from("goal_accounts")
		.delete()
		.eq("goal_id", goalId)
		.eq("user_id", userId);

	if (deleteError) {
		throw deleteError;
	}

	if (links.length === 0) {
		return;
	}

	const { error } = await supabase.from("goal_accounts").insert(
		links.map((link) => ({
			user_id: userId,
			goal_id: goalId,
			account_id: link.accountId,
			planned_monthly_amount: link.plannedMonthlyAmount,
		})),
	);

	if (error) {
		throw error;
	}
}

export async function createGoalAllocation({
	goalId,
	accountId,
	kind = "contribution",
	amount,
	allocatedAt,
	includeInBudget,
	note,
}: {
	goalId: string;
	accountId: string | null;
	kind?: GoalAllocationKind;
	amount: number;
	allocatedAt: string;
	includeInBudget: boolean;
	note?: string | null;
}): Promise<void> {
	const userId = await requireUserId();
	const { error } = await supabase.from("goal_allocations").insert({
		user_id: userId,
		goal_id: goalId,
		account_id: accountId,
		kind,
		amount: Math.abs(amount),
		allocated_at: allocatedAt,
		include_in_budget: includeInBudget,
		note: note ?? null,
	});

	if (error) {
		throw error;
	}
}

export async function archiveSavingsGoal(goalId: string): Promise<void> {
	const userId = await requireUserId();
	const { error } = await supabase
		.from("goals")
		.update({ archived_at: new Date().toISOString() })
		.eq("id", goalId)
		.eq("user_id", userId);

	if (error) {
		throw error;
	}
}

export async function deleteSavingsGoal(goalId: string): Promise<void> {
	const userId = await requireUserId();
	const { data: goal, error: readError } = await supabase
		.from("goals")
		.select("image_path")
		.eq("id", goalId)
		.eq("user_id", userId)
		.maybeSingle();

	if (readError) {
		throw readError;
	}

	const { error } = await supabase
		.from("goals")
		.delete()
		.eq("id", goalId)
		.eq("user_id", userId);

	if (error) {
		throw error;
	}

	if (goal?.image_path) {
		await supabase.storage.from("goal-images").remove([goal.image_path]);
	}
}

function getSafeImageExtension(file: File): string {
	const fromName = file.name.split(".").pop()?.toLowerCase();
	const allowed = new Set(["jpg", "jpeg", "png", "webp", "gif"]);

	if (fromName && allowed.has(fromName)) {
		return fromName === "jpeg" ? "jpg" : fromName;
	}

	if (file.type === "image/png") {
		return "png";
	}
	if (file.type === "image/webp") {
		return "webp";
	}
	if (file.type === "image/gif") {
		return "gif";
	}

	return "jpg";
}

export async function uploadGoalImage(
	goalId: string,
	file: File,
	previousImagePath: string | null = null,
): Promise<string> {
	if (!file.type.startsWith("image/")) {
		throw new Error("Please select an image file.");
	}

	if (file.size > 8 * 1024 * 1024) {
		throw new Error("Goal images must be 8 MB or smaller.");
	}

	const userId = await requireUserId();
	const extension = getSafeImageExtension(file);
	const path = `${userId}/${goalId}/${crypto.randomUUID()}.${extension}`;
	const { error: uploadError } = await supabase.storage
		.from("goal-images")
		.upload(path, file, {
			cacheControl: "3600",
			contentType: file.type,
			upsert: false,
		});

	if (uploadError) {
		throw uploadError;
	}

	const { error: updateError } = await supabase
		.from("goals")
		.update({ image_path: path })
		.eq("id", goalId)
		.eq("user_id", userId);

	if (updateError) {
		await supabase.storage.from("goal-images").remove([path]);
		throw updateError;
	}

	if (previousImagePath && previousImagePath !== path) {
		await supabase.storage.from("goal-images").remove([previousImagePath]);
	}

	return path;
}

export async function fetchGoalAccountSettings(): Promise<GoalAccountSetting[]> {
	const userId = await requireUserId();
	const { data, error } = await supabase
		.from("goal_account_settings")
		.select("account_id, enabled, use_entire_balance, linked_goal_id")
		.eq("user_id", userId);

	if (error) {
		throw error;
	}

	return (data ?? []).map((row) => ({
		accountId: row.account_id as string,
		enabled: Boolean(row.enabled),
		useEntireBalance: Boolean(row.use_entire_balance),
		linkedGoalId: (row.linked_goal_id as string | null) ?? null,
	}));
}

export async function saveGoalAccountSetting(
	setting: GoalAccountSetting,
): Promise<void> {
	const userId = await requireUserId();
	const { data: previous, error: previousError } = await supabase
		.from("goal_account_settings")
		.select("linked_goal_id")
		.eq("user_id", userId)
		.eq("account_id", setting.accountId)
		.maybeSingle();

	if (previousError) {
		throw previousError;
	}

	const nextLinkedGoalId = setting.enabled ? setting.linkedGoalId : null;
	const { error } = await supabase.from("goal_account_settings").upsert(
		{
			user_id: userId,
			account_id: setting.accountId,
			enabled: setting.enabled,
			use_entire_balance: setting.useEntireBalance,
			linked_goal_id: nextLinkedGoalId,
		},
		{ onConflict: "user_id,account_id" },
	);

	if (error) {
		throw error;
	}

	const previousGoalId = (previous?.linked_goal_id as string | null) ?? null;

	if (previousGoalId && previousGoalId !== nextLinkedGoalId) {
		const { error: unlinkError } = await supabase
			.from("goal_accounts")
			.delete()
			.eq("user_id", userId)
			.eq("goal_id", previousGoalId)
			.eq("account_id", setting.accountId);

		if (unlinkError) {
			throw unlinkError;
		}
	}

	if (nextLinkedGoalId) {
		const { error: linkError } = await supabase.from("goal_accounts").upsert(
			{
				user_id: userId,
				goal_id: nextLinkedGoalId,
				account_id: setting.accountId,
			},
			{ onConflict: "goal_id,account_id", ignoreDuplicates: true },
		);

		if (linkError) {
			throw linkError;
		}
	}
}

export async function fetchDebtPaydownSetting(): Promise<DebtPaydownSetting> {
	const userId = await requireUserId();
	const { data, error } = await supabase
		.from("debt_paydown_settings")
		.select("strategy, extra_monthly_payment, extra_one_time_payment")
		.eq("user_id", userId)
		.maybeSingle();

	if (error) {
		throw error;
	}

	return {
		strategy: data?.strategy ?? "planned",
		extraMonthlyPayment: Number(data?.extra_monthly_payment) || 0,
		extraOneTimePayment: Number(data?.extra_one_time_payment) || 0,
	};
}

export async function saveDebtPaydownSetting(
	setting: DebtPaydownSetting,
): Promise<void> {
	const userId = await requireUserId();
	const { error } = await supabase.from("debt_paydown_settings").upsert(
		{
			user_id: userId,
			strategy: setting.strategy,
			extra_monthly_payment: setting.extraMonthlyPayment,
			extra_one_time_payment: setting.extraOneTimePayment,
		},
		{ onConflict: "user_id" },
	);

	if (error) {
		throw error;
	}
}

export async function fetchDebtAccountSettings(): Promise<DebtAccountSetting[]> {
	const userId = await requireUserId();
	const { data, error } = await supabase
		.from("debt_account_settings")
		.select("account_id, apr, minimum_payment")
		.eq("user_id", userId);

	if (error) {
		throw error;
	}

	return (data ?? []).map((row) => ({
		accountId: row.account_id as string,
		apr: Number(row.apr) || 0,
		minimumPayment: Number(row.minimum_payment) || 0,
	}));
}

export async function saveDebtAccountSetting(
	setting: DebtAccountSetting,
): Promise<void> {
	const userId = await requireUserId();
	const { error } = await supabase.from("debt_account_settings").upsert(
		{
			user_id: userId,
			account_id: setting.accountId,
			apr: setting.apr,
			minimum_payment: setting.minimumPayment,
		},
		{ onConflict: "user_id,account_id" },
	);

	if (error) {
		throw error;
	}
}
