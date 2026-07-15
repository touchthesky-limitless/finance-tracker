import { memo } from "react";
import { ArrowRight } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { ActionRow } from "@/components/ui/ActionRow";
import { formatCurrency } from "@/utils/formatters";

interface PredictedBill {
	dueDate: Date;
	merchant: string;
	frequency: string;
	amount: number;
}

interface PredictedBillsListProps {
	predictedBills: PredictedBill[];
}

export const PredictedBillsList = memo(function PredictedBillsList({
	predictedBills,
}: PredictedBillsListProps) {
	const predictedBillsElements = [];
	for (let i = 0; i < predictedBills.length; i++) {
		const bill = predictedBills[i];
		predictedBillsElements.push(
			<ActionRow
				key={i}
				day={bill.dueDate.getDate().toString().padStart(2, "0")}
				month={bill.dueDate.toLocaleDateString("en-US", { month: "short" })}
				title={bill.merchant}
				subtitle={`Estimated based on ${bill.frequency} history`}
				amount={formatCurrency(bill.amount)}
				status="upcoming"
			/>,
		);
	}

	return (
		<Card title="Predicted Bills & Subscriptions">
			<div className="flex flex-col gap-1 mt-4">
				{predictedBills.length > 0 ? (
					predictedBillsElements
				) : (
					<div className="py-12 text-center">
						<p className="text-sm text-gray-400 italic">
							No recurring patterns detected yet.
						</p>
					</div>
				)}
			</div>
			<button className="mt-5 text-xs font-bold text-gray-400 hover:text-orange-600 flex items-center gap-1 w-fit transition-colors">
				View Subscription Manager <ArrowRight size={14} />
			</button>
		</Card>
	);
});