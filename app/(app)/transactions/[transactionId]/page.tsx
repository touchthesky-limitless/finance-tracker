"use client";

import { useParams } from "next/navigation";

import TransactionsPageClient from "@/components/Transactions/TransactionsPageClient";

export default function TransactionDetailsPage() {
	const params = useParams<{ transactionId: string }>();
	const transactionId = decodeURIComponent(params.transactionId);

	return <TransactionsPageClient initialTransactionId={transactionId} />;
}
