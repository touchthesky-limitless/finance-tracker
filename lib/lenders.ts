export const LENDER_TEMPLATES = [
  {
    name: "Simplist",
    nmls: "1764611",
    // Strategy: Super low rate (-0.73% below avg), but higher fees
    rateOffset: -0.73, 
    feePercent: 1.0,   // 1% Origination Fee
    flatFee: 1500,     // + Processing
    link: "#"
  },
  {
    name: "Sage Home Loans",
    nmls: "3304",
    // Strategy: Moderate rate (-0.49% below avg), moderate fees
    rateOffset: -0.49,
    feePercent: 0.5,
    flatFee: 1200,
    link: "#"
  },
  {
    name: "Better",
    nmls: "330511",
    // Strategy: Higher rate (-0.36% below avg), but ZERO lender fees
    rateOffset: -0.36,
    feePercent: 0, 
    flatFee: 2000,     // Just 3rd party costs
    link: "#"
  }
];