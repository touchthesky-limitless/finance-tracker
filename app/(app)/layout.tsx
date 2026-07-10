import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import React from "react";
import ClientDashboardLayout from "@/components/ClientDashboardLayout";

export default async function ProtectedAppLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    // 1. Initialize the cookie store
    const cookieStore = await cookies();

    // 2. Create the server-side Supabase client
    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() {
                    return cookieStore.getAll();
                },
            },
        }
    );

    // 3. Verify the user session securely on the server
    const { data: { user } } = await supabase.auth.getUser();

    // 4. The Master Lock: If no user is found, boot them to login before the client loads
    if (!user) {
        redirect("/login");
    }

    // 5. If authorized, render your beautiful Zustand client layout!
    return (
        <ClientDashboardLayout>
            {children}
        </ClientDashboardLayout>
    );
}