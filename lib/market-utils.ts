import { LENDER_TEMPLATES } from "@/lib/lenders";
import { calculateMonthlyPayment } from "@/lib/monthlypayment";

export function getAverageMortgagePayment(loanAmount: number, baseRate: number) {
    const lenderPayments = LENDER_TEMPLATES.map((lender) => {
        return calculateMonthlyPayment(
            loanAmount,
            baseRate + lender.rateOffset,
            30,
        );
    });

    const totalPayment = lenderPayments.reduce((sum, p) => sum + p, 0);
    const avg = totalPayment / lenderPayments.length;
    
    return Math.round(avg).toLocaleString("en-US");
}