"use client";

import { useState, useMemo, useRef } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { useBudgetStore, type CustomCategory } from "@/store/useBudgetStore";
import { CategoryEditorModal } from "@/components/Categories/CategoryEditorModal";
import { GoalSettingsModal } from "@/components/Goals/GoalDialogs";
import {
	EditAccountForm,
	type EditableAccount,
} from "@/components/Accounts/details/EditAccountForm";
import type { SavingsGoal } from "@/lib/goals/types";
import { setGoalAccountLinks, updateSavingsGoal } from "@/lib/goals/repository";
import { usePlanPageState } from "@/hooks/usePlanPageState";
import { EditGroupModal } from "@/components/modals";
import { FlexibleBudgetModal } from "@/components/Plan/FlexibleBudgetModal";
import { BudgetSettingsModal } from "@/components/Plan/BudgetSettingsModal";
import { PlanPageContributionsSection } from "@/components/Plan/PlanPageContributionsSection";
import { PlanPageHeader } from "@/components/Plan/PlanPageHeader";
import { PlanPageSidebar } from "@/components/Plan/PlanPageSidebar";
import { CategoryHistoryPopover } from "@/components/Plan/CategoryHistoryPopover";
import { GoalContributionPopover } from "@/components/Plan/GoalContributionPopover";
import { AccountPaydownPopover } from "@/components/Plan/AccountPaydownPopover";
import { PlanPageIncomeSection } from "@/components/Plan/PlanPageIncomeSection";
import { PlanPageExpensesSection } from "@/components/Plan/PlanPageExpensesSection";
import { Skeleton } from "@/components/ui/skeleton";

export default function PlanPageClient() {
	const {
		router,
		currentDate,
		viewMode,
		setViewMode,
		expandedSections,
		expandedGroups,
		showUnbudgeted,
		budgetedIncomeRows,
		unbudgetedIncomeRows,
		categoryMap,
		summary,
		groupTotals,
		sidebarData,
		goals,
		savingsAccounts,
		accounts,
		sidebarTab,
		isLoading,
		setSidebarTab,
		setCategoryPreferences,
		getPlanned,
		handlePlanChange,
		goToPreviousMonth,
		goToNextMonth,
		goToToday,
		toggleSection,
		toggleGroup,
		toggleUnbudgeted,
		toggleAllCollapse,
		incomeGroupRecord,
		handleDeleteGroup,
		handleSaveGroup,
		editorGroups,
		mapToEditorValue,
		handleGoalContributionSave,
		handleAccountPaydownSave,
		expenseGroupData,
	} = usePlanPageState();

	const closeTimeoutRef = useRef<NodeJS.Timeout | null>(null);
	const transactions = useBudgetStore((state) => state.transactions);
	// --- Modals states ---
	const [isEditGroupOpen, setIsEditGroupOpen] = useState(false);
	const [isFlexibleBudgetOpen, setIsFlexibleBudgetOpen] = useState(false);

	// State for category history popover
	const [historyCategory, setHistoryCategory] = useState<string | null>(null);
	const [historyAnchor, setHistoryAnchor] = useState<HTMLElement | null>(null);
	const [historyOpen, setHistoryOpen] = useState(false);

	// State for goal contribution popover
	const [goalContributionOpen, setGoalContributionOpen] = useState(false);
	const [goalContributionGoal, setGoalContributionGoal] =
		useState<SavingsGoal | null>(null);
	const [goalContributionAnchor, setGoalContributionAnchor] =
		useState<HTMLElement | null>(null);
	const [, setGoalContributionValue] = useState(0);

	// State for account paydown popover
	const [accountPaydownOpen, setAccountPaydownOpen] = useState(false);
	const [accountPaydownAccount, setAccountPaydownAccount] =
		useState<EditableAccount | null>(null);
	const [accountPaydownAnchor, setAccountPaydownAnchor] =
		useState<HTMLElement | null>(null);
	const [accountPaydownValue, setAccountPaydownValue] = useState(0);

	const [settingsOpen, setSettingsOpen] = useState(false);

	// --- Editor states ---
	const [editingCategory, setEditingCategory] = useState<CustomCategory | null>(
		null,
	);
	const handleCloseCategoryEditor = () => setEditingCategory(null);
	const [editingGoal, setEditingGoal] = useState<SavingsGoal | null>(null);
	const handleCloseGoalSettings = () => setEditingGoal(null);
	const [editingAccount, setEditingAccount] = useState<EditableAccount | null>(
		null,
	);
	const handleCloseEditAccount = () => setEditingAccount(null);

	// Define the standard category groups for the editor dropdown
	const currentMonthLabel = useMemo(() => {
		return currentDate.toLocaleDateString("en-US", {
			month: "long",
			year: "numeric",
		});
	}, [currentDate]);

	const allCollapsed =
		Object.values(expandedSections).every((v) => v === false) &&
		Object.values(expandedGroups).every((v) => v === false);

	return (
		<div className="min-h-screen bg-[#F9FAFB] font-sans text-gray-900 dark:bg-[#121212] dark:text-gray-200">
			{/* --- TOP HEADER (Responsive) --- */}
			<PlanPageHeader
				currentMonthLabel={currentMonthLabel}
				goToPreviousMonth={goToPreviousMonth}
				goToNextMonth={goToNextMonth}
				goToToday={goToToday}
				viewMode={viewMode}
				setViewMode={setViewMode}
				allCollapsed={allCollapsed}
				toggleAllCollapse={toggleAllCollapse}
				setSettingsOpen={setSettingsOpen}
			/>

			{/* --- MAIN LAYOUT --- */}
			<div className="flex w-full flex-col gap-6 p-4 sm:p-6 lg:flex-row">
				{/* === LEFT COLUMN: MAIN TABLE === */}
				<div className="flex-1 overflow-hidden">
					<div className="relative overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm dark:border-white/5 dark:bg-[#191919]">
						<div className="min-w-[800px]">
							<div className="flex items-center bg-[#EBECEE] px-6 py-3 text-xs font-semibold uppercase tracking-wider text-[#5D6064] dark:bg-[#232323] dark:text-gray-400">
								<div className="sticky left-0 z-20 bg-[#EBECEE] dark:bg-[#232323] w-[30%] pl-2 shrink-0"></div>
								<div className="w-[22%] text-center">Planned</div>
								<div className="w-[22%] text-center">Actual</div>
								<div className="w-[26%] text-center">Remaining</div>
							</div>
							{isLoading ? (
								<div className="p-6 space-y-4">
									<Skeleton className="h-12 w-full rounded-md" />
									<Skeleton className="h-12 w-5/6 rounded-md" />
									<Skeleton className="h-12 w-3/4 rounded-md" />
									<Skeleton className="h-12 w-full rounded-md" />
								</div>
							) : (
								<>
									{/* ==================== INCOME SECTION ==================== */}
									<PlanPageIncomeSection
										expanded={expandedSections.income}
										toggleSection={() => toggleSection("income")}
										expandedGroup={expandedGroups.Income}
										toggleGroup={() => toggleGroup("Income")}
										budgetedRows={budgetedIncomeRows}
										unbudgetedRows={unbudgetedIncomeRows}
										showUnbudgeted={showUnbudgeted["Income"]}
										toggleUnbudgeted={() => toggleUnbudgeted("Income")}
										categoryMap={categoryMap}
										getPlanned={getPlanned}
										handlePlanChange={handlePlanChange}
										setIsEditGroupOpen={setIsEditGroupOpen}
										router={router}
										currentDate={currentDate}
										totalIncome={summary.totalIncome}
										setHistoryCategory={setHistoryCategory}
										setHistoryAnchor={setHistoryAnchor}
										setHistoryOpen={setHistoryOpen}
										closeTimeoutRef={closeTimeoutRef}
										setEditingCategory={setEditingCategory}
									/>

									{/* ==================== EXPENSES SECTION ==================== */}
									<PlanPageExpensesSection
										expanded={expandedSections.expenses}
										toggleSection={() => toggleSection("expenses")}
										expandedGroups={expandedGroups}
										toggleGroup={toggleGroup}
										expenseGroupData={expenseGroupData}
										groupTotals={groupTotals}
										showUnbudgeted={showUnbudgeted}
										toggleUnbudgeted={toggleUnbudgeted}
										categoryMap={categoryMap}
										getPlanned={getPlanned}
										handlePlanChange={handlePlanChange}
										setIsFlexibleBudgetOpen={setIsFlexibleBudgetOpen}
										router={router}
										currentDate={currentDate}
										setHistoryCategory={setHistoryCategory}
										setHistoryAnchor={setHistoryAnchor}
										setHistoryOpen={setHistoryOpen}
										closeTimeoutRef={closeTimeoutRef}
										setEditingCategory={setEditingCategory}
										totalExpenses={summary.totalExpenses}
									/>

									{/* ==================== CONTRIBUTIONS ==================== */}
									<PlanPageContributionsSection
										expanded={expandedSections.contributions}
										toggleSection={() => toggleSection("contributions")}
										expandedGroups={expandedGroups}
										toggleGroup={toggleGroup}
										goals={goals}
										accounts={accounts}
										getPlanned={getPlanned}
										handlePlanChange={handlePlanChange}
										showUnbudgeted={showUnbudgeted}
										toggleUnbudgeted={toggleUnbudgeted}
										setGoalContributionGoal={setGoalContributionGoal}
										setGoalContributionAnchor={setGoalContributionAnchor}
										setGoalContributionValue={setGoalContributionValue}
										setGoalContributionOpen={setGoalContributionOpen}
										setAccountPaydownAccount={setAccountPaydownAccount}
										setAccountPaydownAnchor={setAccountPaydownAnchor}
										setAccountPaydownValue={setAccountPaydownValue}
										setAccountPaydownOpen={setAccountPaydownOpen}
										router={router}
										setEditingGoal={setEditingGoal}
										setEditingAccount={setEditingAccount}
										setHistoryCategory={setHistoryCategory}
										setHistoryAnchor={setHistoryAnchor}
										setHistoryOpen={setHistoryOpen}
									/>
								</>
							)}
						</div>
					</div>
				</div>

				{/* === RIGHT COLUMN: SIDEBAR (sticky) === */}
				<PlanPageSidebar
					leftToBudget={summary.totalExpenses - summary.totalIncome}
					sidebarTab={sidebarTab}
					setSidebarTab={setSidebarTab}
					sidebarData={sidebarData}
					getPlanned={getPlanned}
					groupTotals={groupTotals}
				/>
			</div>

			{/* ====== CATEGORY HISTORY POPOVER ====== */}
			{historyCategory && historyOpen && historyAnchor && (
				<CategoryHistoryPopover
					open={historyOpen}
					onClose={() => setHistoryOpen(false)}
					categoryName={historyCategory}
					transactions={transactions}
					anchorRef={historyAnchor}
					onMouseEnter={() => {
						if (closeTimeoutRef.current) {
							clearTimeout(closeTimeoutRef.current);
							closeTimeoutRef.current = null;
						}
					}}
					onMouseLeave={() => {
						closeTimeoutRef.current = setTimeout(() => {
							setHistoryOpen(false);
						}, 300);
					}}
				/>
			)}

			{/* ====== CATEGORY EDITOR MODAL ====== */}
			{editingCategory && (
				<CategoryEditorModal
					category={mapToEditorValue(editingCategory)}
					groups={editorGroups}
					childDialogOpen={false}
					onClose={handleCloseCategoryEditor}
					onSave={async (value) => {
						// Update the category preferences with the new type and rollover settings
						await setCategoryPreferences((prev) => {
							const next = { ...prev };
							if (!next[editingCategory.id]) {
								next[editingCategory.id] = {};
							}
							next[editingCategory.id] = {
								...next[editingCategory.id],
								excludedFromBudget: value.excludedFromBudget,
								budgetType: value.budgetType,
								monthlyRollover: value.monthlyRollover,
								rolloverStartMonth: value.rolloverStartMonth,
								rolloverStartingBalance: value.rolloverStartingBalance,
							};
							return next;
						});
						handleCloseCategoryEditor();
					}}
					onDelete={() => {
						handleCloseCategoryEditor();
					}}
					onActivate={() => {
						handleCloseCategoryEditor();
					}}
					isIncomeCategory={
						mapToEditorValue(editingCategory).parentName === "Income"
					}
				/>
			)}

			{/* ====== GOAL SETTINGS MODAL ====== */}
			{editingGoal && (
				<GoalSettingsModal
					open={!!editingGoal}
					onClose={handleCloseGoalSettings}
					goal={editingGoal}
					accountLinks={[]}
					accounts={savingsAccounts}
					onSave={async (input) => {
						// Actually update the goal!
						if (editingGoal) {
							// 1. Save the goal details (name, amount, date, etc.)
							await updateSavingsGoal(editingGoal.id, {
								name: input.name,
								targetAmount: input.targetAmount,
								targetDate: input.targetDate,
								spendingReducesProgress: input.spendingReducesProgress,
							});

							// 2. Save account links (monthly contributions per linked account)
							await setGoalAccountLinks(editingGoal.id, input.links);

							// 3. (Optional) Reload data or refresh the store
							// await reloadGoalsData();

							console.log("Goal saved successfully");
						}
						handleCloseGoalSettings();
					}}
					// eslint-disable-next-line @typescript-eslint/no-unused-vars
					onImageUpload={async (file) => {
						if (editingGoal) {
							// Upload the image here
							// await uploadGoalImage(editingGoal.id, file, editingGoal.imagePath);
						}
					}}
				/>
			)}

			{/* ====== PAY DOWN EDIT ACCOUNT MODAL ====== */}
			{editingAccount && (
				<Dialog.Root
					open={!!editingAccount}
					onOpenChange={(open) => !open && handleCloseEditAccount()}
				>
					<Dialog.Portal>
						<Dialog.Overlay className="fixed inset-0 z-[140] bg-black/45 backdrop-blur-md data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
						<Dialog.Content
							onOpenAutoFocus={(event) => event.preventDefault()}
							className="fixed left-1/2 top-1/2 z-[150] max-h-[calc(100vh-32px)] w-[min(570px,calc(100vw-24px))] -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-2xl border border-gray-200 bg-white shadow-2xl outline-none dark:border-white/10 dark:bg-[#222220]"
						>
							<Dialog.Title className="sr-only">Edit account</Dialog.Title>
							<Dialog.Description className="sr-only">
								Update account details, visibility, balance, and actions.
							</Dialog.Description>
							<EditAccountForm
								account={editingAccount}
								onBack={handleCloseEditAccount}
							/>
						</Dialog.Content>
					</Dialog.Portal>
				</Dialog.Root>
			)}

			{/* ====== BUDGET SETTINGS MODAL ====== */}
			<BudgetSettingsModal
				open={settingsOpen}
				onClose={() => setSettingsOpen(false)}
			/>

			{/* ====== EDIT GROUP MODAL (Income) ====== */}
			{isEditGroupOpen && (
				<EditGroupModal
					group={incomeGroupRecord}
					childDialogOpen={false}
					onClose={() => setIsEditGroupOpen(false)}
					onSave={handleSaveGroup}
					onDelete={handleDeleteGroup}
				/>
			)}

			{/* ====== FLEXIBLE BUDGET MODAL ====== */}
			<FlexibleBudgetModal
				open={isFlexibleBudgetOpen}
				onClose={() => setIsFlexibleBudgetOpen(false)}
				rolloverEnabled={false} // Populate this from your actual group preferences
				startMonth={null} // Populate this from your actual group preferences
				startingBalance={null} // Populate this from your actual group preferences
				// eslint-disable-next-line @typescript-eslint/no-unused-vars
				onSave={async (data) => {
					setIsFlexibleBudgetOpen(false);
					// Add your update group preferences logic here
				}}
			/>

			{/* ====== GOAL CONTRIBUTION POPOVER ====== */}
			{goalContributionGoal &&
				goalContributionOpen &&
				goalContributionAnchor && (
					<GoalContributionPopover
						open={goalContributionOpen}
						onClose={() => setGoalContributionOpen(false)}
						goal={goalContributionGoal}
						savingsAccounts={savingsAccounts} // ✅ pass the prop
						onSave={handleGoalContributionSave}
						anchorRef={goalContributionAnchor}
					/>
				)}

			{/* ====== ACCOUNT PAYDOWN POPOVER ====== */}
			{accountPaydownAccount && accountPaydownOpen && accountPaydownAnchor && (
				<AccountPaydownPopover
					open={accountPaydownOpen}
					onClose={() => setAccountPaydownOpen(false)}
					account={accountPaydownAccount}
					currentPlanned={accountPaydownValue}
					onSave={handleAccountPaydownSave}
					anchorRef={accountPaydownAnchor}
				/>
			)}
		</div>
	);
}
