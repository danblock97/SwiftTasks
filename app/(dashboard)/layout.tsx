﻿import { DashboardNav } from "@/components/dashboard/dashboard-nav";
import { Sidebar } from "@/components/dashboard/sidebar";
import { UserNav } from "@/components/dashboard/user-nav";
import { createServerComponentClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export default async function DashboardLayout({
                                                  children,
                                              }: {
    children: React.ReactNode;
}) {
    const supabase = createServerComponentClient({ cookies });

    // Get the user session
    const {
        data: { session },
    } = await supabase.auth.getSession();

    // If no session, redirect to login
    if (!session) {
        redirect("/login");
    }

    // Get user profile with account type
    const { data: userProfile } = await supabase
        .from("users")
        .select("*, teams(*)")
        .eq("id", session.user.id)
        .single();

    if (!userProfile) {
        // This shouldn't happen normally, but just in case
        return redirect("/login");
    }

    return (
        <div className="flex min-h-screen flex-col">
            <header className="sticky top-0 z-40 border-b bg-background">
                <div className="container flex h-16 items-center justify-between py-4">
                    <div className="flex items-center gap-2">
                        <div className="hidden md:block font-bold text-xl">SwiftTasks</div>
                        <DashboardNav />
                    </div>
                    <UserNav user={userProfile} />
                </div>
            </header>
            <div className="container flex-1 items-start md:grid md:grid-cols-[220px_minmax(0,1fr)] md:gap-6 lg:grid-cols-[240px_minmax(0,1fr)] lg:gap-10">
                <Sidebar user={userProfile} className="hidden md:block" />
                <main className="flex w-full flex-col overflow-hidden p-4 md:p-6">
                    {children}
                </main>
            </div>
        </div>
    );
}