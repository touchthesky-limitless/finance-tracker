import { LENDER_TEMPLATES } from "@/lib/lenders";

interface RefiCalculatorInputs {
    loanAmount: number;
    creditScore: number;
    nationalRate: number;
}

export function RefiCalculator({ loanAmount, creditScore, nationalRate } : RefiCalculatorInputs) {
    let riskPremium = 0;
    if (creditScore < 640) riskPremium = 0.5;
    else if (creditScore < 680) riskPremium = 0.25;
    else if (creditScore < 720) riskPremium = 0.125;
    else if (creditScore >= 760) riskPremium = -0.125;

    const adjustBaseRate = nationalRate + riskPremium;

    return LENDER_TEMPLATES.map((lender) => {
        // A. Calculate THIS Lender's specific rate
        // e.g. 6.11 (Base) - 0.125 (Credit) - 0.73 (Simplist Discount) = 5.255%
        let finalRate = adjustBaseRate + lender.feePercent;
        if (finalRate < 3) finalRate = 3;

        // B. Monthly Payment Formula
        const r = finalRate / 100 / 12;
        const n = 360; // 30 yrs
        const monthlyPayment =
            (loanAmount * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);

        // C. Fees
        const totalFees = lender.flatFee + loanAmount * (lender.feePercent / 100);

        // D. APR (The real cost  = Rate + fees spread over time)
        const apr = finalRate + (totalFees / loanAmount) * 0.15;

        return {
            ...lender, // name, nmls, link
            rate: finalRate.toFixed(3),
            apr: apr.toFixed(3),
            payment: Math.round(monthlyPayment).toLocaleString(),
            fees: Math.round(totalFees).toLocaleString(),
        };
    });
}