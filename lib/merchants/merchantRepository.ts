"use client";

import { createClient } from "@/lib/supabase";

const supabase = createClient();

async function getCurrentUserId(): Promise<string> {
	const {
		data: { user },
		error,
	} = await supabase.auth.getUser();

	if (error) {
		throw error;
	}

	if (!user) {
		throw new Error("You must be signed in to edit merchants.");
	}

	return user.id;
}

export async function updateCustomMerchantName(
	merchantId: string,
	name: string,
): Promise<void> {
	const cleanName = name.trim();

	if (!cleanName) {
		throw new Error("Merchant name is required.");
	}

	const userId = await getCurrentUserId();
	const { error } = await supabase
		.from("merchants")
		.update({ name: cleanName })
		.eq("id", merchantId)
		.eq("user_id", userId)
		.eq("is_system", false);

	if (error) {
		throw error;
	}
}

export async function deleteCustomMerchantRecord(
	merchantId: string,
): Promise<void> {
	const userId = await getCurrentUserId();
	const { error } = await supabase
		.from("merchants")
		.delete()
		.eq("id", merchantId)
		.eq("user_id", userId)
		.eq("is_system", false);

	if (error) {
		throw error;
	}
}
