﻿'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { createClient } from '@/lib/supabase/client'; // Adjust import as needed
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";

export default function SettingUpAccountPage() {
    const [count, setCount] = useState(0);
    const [isChecking, setIsChecking] = useState(true);
    const [isRedirecting, setIsRedirecting] = useState(false);
    const [debugInfo, setDebugInfo] = useState<string[]>([]);
    const router = useRouter();
    const clientSupabase = createClientComponentClient();
    const serviceSupabase = createClient();
    const { toast } = useToast();

    // Add debug information
    const addDebug = (message: string) => {
        setDebugInfo(prev => [...prev, `[${new Date().toISOString()}] ${message}`]);
    };

    const checkProfile = async () => {
        if (!isChecking || isRedirecting) return;

        try {
            addDebug(`Checking profile (attempt ${count + 1})...`);

            // Get the authenticated user
            const { data: { user }, error: userError } = await clientSupabase.auth.getUser();

            if (userError) {
                addDebug(`Auth error: ${userError.message}`);
                return;
            }

            if (!user) {
                addDebug('No authenticated user found');
                router.push('/login');
                return;
            }

            addDebug(`User found: ${user.id.substring(0, 8)}...`);

            // Use service role to check profile
            const { data: profile, error: profileError } = await serviceSupabase
                .from('users')
                .select('id, email, display_name, account_type')
                .eq('id', user.id)
                .single();

            if (profileError) {
                if (profileError.code === 'PGRST116') {
                    addDebug('Profile not found in database');
                } else {
                    addDebug(`Profile query error: ${profileError.message}`);
                }
                return;
            }

            // Profile exists, redirect to dashboard
            if (profile) {
                addDebug('Profile found, redirecting to dashboard...');
                redirectToDashboard();
            }
        } catch (error: any) {
            addDebug(`Unexpected error: ${error.message || 'Unknown error'}`);
            console.error('Error checking profile:', error);
        }
    };

    // Redirect with delay to avoid race conditions
    const redirectToDashboard = () => {
        if (isRedirecting) return;

        setIsRedirecting(true);
        setIsChecking(false);

        toast({
            title: "Account setup complete",
            description: "Redirecting to your dashboard..."
        });

        // Add a small delay to ensure toast is shown and state is updated
        setTimeout(() => {
            window.location.href = '/dashboard';
        }, 1500);
    };

    // Manual redirect button handler
    const manualRedirect = async () => {
        addDebug('Manual redirect requested');
        redirectToDashboard();
    };

    useEffect(() => {
        // Clear any existing intervals when component mounts
        const intervalIds: NodeJS.Timeout[] = [];

        // Check immediately
        checkProfile();

        // Then check every 2 seconds
        const interval = setInterval(() => {
            setCount(c => c + 1);
            checkProfile();
        }, 2000);

        intervalIds.push(interval);

        // Clear interval on unmount
        return () => {
            intervalIds.forEach(id => clearInterval(id));
        };
    }, [count]);

    return (
        <div className="flex min-h-screen flex-col items-center justify-center p-4">
            <div className="w-full max-w-md p-8 space-y-8 bg-card rounded-xl border shadow-md text-center">
                <div className="space-y-2">
                    <h1 className="text-2xl font-bold">Setting up your account</h1>
                    <p className="text-muted-foreground">
                        Please wait while we finish setting up your account...
                    </p>
                </div>

                <div className="flex justify-center my-8">
                    <div className={`h-10 w-10 border-4 border-primary/20 rounded-full border-t-primary ${isRedirecting ? '' : 'animate-spin'}`}></div>
                </div>

                <div className="text-sm text-muted-foreground">
                    <p>This should only take a few seconds.</p>
                    {count > 5 && !isRedirecting && (
                        <div className="mt-4 space-y-2">
                            <p>It's taking longer than expected.</p>
                            <Button
                                onClick={manualRedirect}
                                className="w-full"
                                disabled={isRedirecting}
                            >
                                {isRedirecting ? 'Redirecting...' : 'Go to Dashboard'}
                            </Button>
                        </div>
                    )}
                </div>

                {/* Debug information */}
                {count > 5 && (
                    <div className="mt-8 text-left">
                        <details className="text-xs" open={count > 10}>
                            <summary className="cursor-pointer text-muted-foreground">Debug Information</summary>
                            <div className="mt-2 p-2 bg-muted rounded-md overflow-auto max-h-60 text-xs">
                                {debugInfo.map((msg, i) => (
                                    <div key={i} className="mb-1 whitespace-normal break-words">{msg}</div>
                                ))}
                            </div>
                        </details>
                    </div>
                )}
            </div>
        </div>
    );
}