/**
 * Calculates the monthly principal and interest payment for a loan.
 * Formula: M = P * r * (1 + r)^n / ((1 + r)^n - 1)
 * * @param principal - The total loan amount (e.g., 400000)
 * @param annualRate - The annual interest rate in percentage (e.g., 6.5)
 * @param years - The loan term in years (e.g., 30)
 * @returns The monthly payment amount
 */
export function calculateMonthlyPayment(principal: number, annualRate: number, years: number): number {
  if (!annualRate || annualRate <= 0) return 0;

  const monthlyRate = annualRate / 100 / 12;
  const numberOfPayments = years * 12;

  return (
    (principal * monthlyRate * Math.pow(1 + monthlyRate, numberOfPayments)) /
    (Math.pow(1 + monthlyRate, numberOfPayments) - 1)
  );
}

/**
 * Formats a number as USD currency (no cents).
 * Example: 2450.12 -> "$2,450"
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(amount);
}