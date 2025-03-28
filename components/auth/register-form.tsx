﻿"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Link from "next/link";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Database } from "@/lib/supabase/database.types";
import { User, Mail, Lock, Building, UserPlus, Users, ArrowRight, CheckCircle2, UsersRound, UserCheck } from "lucide-react";

type AccountType = "single" | "team";

export function RegisterForm({
                                 initialAccountType = "single",
                             }: {
    initialAccountType: string;
}) {
    const searchParams = useSearchParams();
    const inviteCode = searchParams.get('invite');
    const inviteEmail = searchParams.get('email');

    const [email, setEmail] = useState(inviteEmail || "");
    const [password, setPassword] = useState("");
    const [name, setName] = useState("");
    const [teamName, setTeamName] = useState("");
    const [accountType, setAccountType] = useState<AccountType>(
        initialAccountType === "team" ? "team" : "single"
    );
    const [isLoading, setIsLoading] = useState(false);
    const [isInvitation, setIsInvitation] = useState(false);
    const [invitationDetails, setInvitationDetails] = useState<any>(null);

    const router = useRouter();
    const { toast } = useToast();
    const supabase = createClientComponentClient<Database>();

    // Check if this is a team invitation
    useEffect(() => {
        if (inviteCode && inviteEmail) {
            setIsInvitation(true);
            checkInvitation();
        }
    }, [inviteCode, inviteEmail]);

    // Fetch invitation details
    const checkInvitation = async () => {
        if (!inviteCode) return;

        try {

            // Use our server API to validate the invitation instead of direct DB access
            const response = await fetch(`/api/team-invite/validate?code=${inviteCode}`);
            const result = await response.json();

            if (!result.valid) {
                toast({
                    title: "Invalid Invitation",
                    description: result.error || "This invitation is invalid or has expired.",
                    variant: "destructive",
                });
                setIsInvitation(false);
                return;
            }

            // Set invitation details
            setInvitationDetails({
                email: result.invite.email,
                teams: { name: result.invite.teamName },
                team_id: result.invite.teamId,
                invite_code: result.invite.inviteCode
            });
        } catch (error) {
            console.error("Error checking invitation:", error);
            toast({
                title: "Error Validating Invitation",
                description: "There was a problem validating your invitation. Please try again.",
                variant: "destructive",
            });
            setIsInvitation(false);
        }
    };
    async function onSubmit(e: React.FormEvent) {
        e.preventDefault();
        setIsLoading(true);

        try {
            // Check for access token in the URL (for team invites coming from email)
            const hashParams = new URLSearchParams(window.location.hash.substring(1));
            const accessToken = hashParams.get('access_token');
            const isTokenPresent = !!accessToken;

            const metadata = isInvitation
                ? {
                    display_name: name,
                    account_type: "team_member",
                    is_team_owner: false,
                    invite_code: inviteCode
                }
                : {
                    display_name: name,
                    account_type: accountType,
                    team_name: accountType === "team" ? teamName : null,
                    is_team_owner: accountType === "team",
                };

            // If we have an access token from the team invite email,
            // we need to use a different flow (the user is already verified)
            if (isTokenPresent && isInvitation) {

                // Extract the session data
                const expiresIn = hashParams.get('expires_in');
                const refreshToken = hashParams.get('refresh_token');
                const tokenType = hashParams.get('token_type');

                if (!refreshToken) {
                    throw new Error("Missing refresh token in invitation link");
                }

                // Set the session using the token from the URL
                const { data: sessionData, error: sessionError } = await supabase.auth.setSession({
                    access_token: accessToken,
                    refresh_token: refreshToken
                });

                if (sessionError) {
                    console.error("[Register] Session error:", sessionError);
                    throw sessionError;
                }

                // Now create a user profile with the team info
                if (sessionData.user) {
                    // Call a server API to create the profile with team data
                    const profileResponse = await fetch('/api/auth/create-profile', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            userId: sessionData.user.id,
                            email: sessionData.user.email,
                            displayName: name,
                            teamId: invitationDetails?.team_id,
                            inviteCode
                        })
                    });

                    if (!profileResponse.ok) {
                        const error = await profileResponse.json();
                        throw new Error(error.message || "Failed to create user profile");
                    }
                }

                // Success, redirect to dashboard
                toast({
                    title: "Account created",
                    description: "Your account has been set up successfully.",
                });

                router.push("/dashboard");
                return;
            }

            // Standard signup flow
            const { data: authData, error: authError } = await supabase.auth.signUp({
                email,
                password,
                options: {
                    emailRedirectTo: `${window.location.origin}/auth/callback`,
                    data: metadata,
                },
            });

            if (authError) {
                console.error("[Register] Auth error:", authError);
                throw authError;
            }

            if (!authData.user) {
                throw new Error("User registration failed");
            }

            if (authData.user && !authData.session) {

                // Force sending a verification email through our API
                try {
                    const verifyResponse = await fetch('/api/auth/verify-email', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ email })
                    });

                    if (!verifyResponse.ok) {
                        console.warn("[Register] Failed to send verification email through API");
                    }
                } catch (verifyError) {
                    console.error("[Register] Error sending verification email:", verifyError);
                }
            }

            // Save the email to localStorage for the verification page
            localStorage.setItem('registered_email', email);

            toast({
                title: "Registration successful",
                description: "Please check your email to verify your account.",
            });

            // Redirect to verification page
            router.push("/verify");
        } catch (error: any) {
            console.error("[Register] Registration error:", error);
            toast({
                title: "Error",
                description: error.message || "Registration failed. Please try again.",
                variant: "destructive",
            });
        } finally {
            setIsLoading(false);
        }
    }

    // Special UI for team invitations
    if (isInvitation && invitationDetails) {
        return (
            <div className="max-w-md mx-auto relative">
                {/* Decorative elements */}
                <div className="absolute -top-6 -right-6 w-24 h-24 bg-gradient-to-br from-blue-400/20 via-teal-300/20 to-indigo-400/20 rounded-full blur-xl"></div>
                <div className="absolute -bottom-6 -left-6 w-32 h-32 bg-gradient-to-tr from-teal-400/20 via-blue-300/20 to-indigo-400/20 rounded-full blur-xl"></div>

                <div className="relative bg-card border border-teal-100/60 dark:border-teal-800/60 rounded-xl overflow-hidden shadow-md px-6 py-8">
                    {/* Top gradient bar */}
                    <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-teal-500 via-blue-500 to-indigo-500"></div>

                    <div className="mb-6 text-center">
                        <div className="inline-flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br from-teal-100 to-blue-100 dark:from-teal-900/40 dark:to-blue-900/40 mb-4">
                            <div className="h-20 w-20 rounded-full flex items-center justify-center bg-gradient-to-br from-teal-500 to-blue-600">
                                <UsersRound className="h-10 w-10 text-white" />
                            </div>
                        </div>
                        <h1 className="text-2xl font-bold tracking-tight">Join {invitationDetails.teams?.name}</h1>
                        <p className="text-sm text-muted-foreground mt-1">
                            You've been invited to join a team on SwiftTasks. Create an account to accept the invitation.
                        </p>
                    </div>

                    <form onSubmit={onSubmit} className="space-y-6">
                        <div className="rounded-md bg-teal-50 dark:bg-teal-900/20 p-4 text-sm border border-teal-100 dark:border-teal-800">
                            <div className="flex items-start gap-2">
                                <UserCheck className="h-5 w-5 text-teal-600 dark:text-teal-400 flex-shrink-0 mt-0.5" />
                                <div>
                                    <p className="text-teal-800 dark:text-teal-300">
                                        An invitation was sent to <strong>{inviteEmail}</strong> to join <strong>{invitationDetails.teams?.name}</strong>.
                                        Complete your registration to join the team.
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div className="relative group">
                                <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-blue-500 dark:text-blue-400">
                                    <User className="h-5 w-5" />
                                </div>
                                <Input
                                    type="text"
                                    placeholder="Your name"
                                    className="pl-10 border-blue-200/70 dark:border-blue-700/50 bg-blue-50/50 dark:bg-blue-900/20 focus:border-blue-400"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    required
                                    disabled={isLoading}
                                />
                            </div>

                            <div className="relative group">
                                <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-teal-500 dark:text-teal-400">
                                    <Mail className="h-5 w-5" />
                                </div>
                                <Input
                                    type="email"
                                    placeholder="Email address"
                                    className="pl-10 border-teal-200/70 dark:border-teal-700/50 bg-teal-50/50 dark:bg-teal-900/20 focus:border-teal-400"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                    disabled={true} // Email is fixed for invitations
                                />
                            </div>

                            <div className="space-y-2">
                                <div className="relative group">
                                    <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-indigo-500 dark:text-indigo-400">
                                        <Lock className="h-5 w-5" />
                                    </div>
                                    <Input
                                        type="password"
                                        placeholder="Password"
                                        className="pl-10 border-indigo-200/70 dark:border-indigo-700/50 bg-indigo-50/50 dark:bg-indigo-900/20 focus:border-indigo-400"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        required
                                        minLength={8}
                                        disabled={isLoading}
                                    />
                                </div>
                                <p className="text-xs text-muted-foreground">
                                    Password must be at least 8 characters long
                                </p>
                            </div>
                        </div>

                        <Button
                            type="submit"
                            className="w-full h-12 font-medium text-white shadow-md hover:shadow-lg transition-all bg-gradient-to-r from-teal-500 to-blue-500 hover:from-teal-600 hover:to-blue-600"
                            disabled={isLoading}
                        >
                            {isLoading ? (
                                <div className="flex items-center">
                                    <svg
                                        className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                                        xmlns="http://www.w3.org/2000/svg"
                                        fill="none"
                                        viewBox="0 0 24 24"
                                    >
                                        <circle
                                            className="opacity-25"
                                            cx="12"
                                            cy="12"
                                            r="10"
                                            stroke="currentColor"
                                            strokeWidth="4"
                                        ></circle>
                                        <path
                                            className="opacity-75"
                                            fill="currentColor"
                                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                                        ></path>
                                    </svg>
                                    Creating account...
                                </div>
                            ) : (
                                <div className="flex items-center justify-center">
                                    Join Team
                                    <ArrowRight className="ml-2 h-4 w-4" />
                                </div>
                            )}
                        </Button>
                    </form>

                    <div className="mt-6 text-center">
                        <p className="text-sm text-muted-foreground">
                            Already have an account?{" "}
                            <Link href="/login" className="font-medium hover:underline text-teal-600 dark:text-teal-400">
                                Sign in
                            </Link>
                        </p>
                    </div>

                    <div className="mt-5 pt-5 text-center border-t border-gray-200 dark:border-gray-700">
                        <p className="text-xs text-muted-foreground">
                            By signing up, you agree to our{" "}
                            <Link href="/terms" className="text-primary hover:underline">Terms of Service</Link>{" "}
                            and{" "}
                            <Link href="/privacy" className="text-primary hover:underline">Privacy Policy</Link>
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    // Regular registration form (unchanged)
    return (
        <div className="max-w-md mx-auto relative">
            {/* Decorative elements inspired by other pages */}
            <div className="absolute -top-6 -right-6 w-24 h-24 bg-gradient-to-br from-teal-400/20 via-blue-300/20 to-indigo-400/20 rounded-full blur-xl"></div>
            <div className="absolute -bottom-6 -left-6 w-32 h-32 bg-gradient-to-tr from-blue-400/20 via-indigo-300/20 to-purple-400/20 rounded-full blur-xl"></div>

            <div className="relative bg-card border border-indigo-100/60 dark:border-indigo-800/60 rounded-xl overflow-hidden shadow-md px-6 py-8">
                {/* Top gradient bar */}
                <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-teal-500 via-blue-500 to-indigo-500"></div>

                <div className="mb-6 text-center">
                    <div className="inline-flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br from-teal-100 to-blue-100 dark:from-teal-900/40 dark:to-blue-900/40 mb-4">
                        <div className="h-20 w-20 rounded-full flex items-center justify-center bg-gradient-to-br from-teal-500 to-blue-600">
                            <UserPlus className="h-10 w-10 text-white" />
                        </div>
                    </div>
                    <h1 className="text-2xl font-bold tracking-tight">Join SwiftTasks</h1>
                    <p className="text-sm text-muted-foreground mt-1">
                        Create an account to start organizing your tasks
                    </p>
                </div>

                <form onSubmit={onSubmit} className="space-y-6">
                    <div className="space-y-1 mb-2">
                        <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">Choose account type</Label>

                        <div className="grid grid-cols-2 gap-4 pt-2">
                            {/* Solo Card */}
                            <div
                                className={`relative overflow-hidden flex flex-col items-center justify-center p-4 rounded-xl cursor-pointer transition-all ${
                                    accountType === "single"
                                        ? "ring-2 ring-blue-500 dark:ring-blue-400 bg-gradient-to-b from-white to-blue-50 dark:from-transparent dark:to-blue-900/20"
                                        : "border border-gray-200 dark:border-gray-700 hover:border-blue-200 dark:hover:border-blue-700 bg-gray-50 dark:bg-gray-800/60"
                                }`}
                                onClick={() => setAccountType("single")}
                            >
                                {accountType === "single" && (
                                    <div className="absolute top-2 right-2">
                                        <div className="h-5 w-5 bg-blue-500 rounded-full flex items-center justify-center">
                                            <CheckCircle2 className="h-4 w-4 text-white" />
                                        </div>
                                    </div>
                                )}

                                <div className={`h-14 w-14 rounded-full flex items-center justify-center mb-2 ${
                                    accountType === "single"
                                        ? "bg-gradient-to-r from-blue-500 to-indigo-500 text-white"
                                        : "bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400"
                                }`}>
                                    <User className="h-7 w-7" />
                                </div>
                                <span className={`text-sm font-medium ${accountType === "single" ? "text-blue-700 dark:text-blue-400" : ""}`}>
                  Solo User
                </span>
                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 text-center">
                                    Personal productivity
                                </p>

                                {/* Decorative corner gradients when selected */}
                                {accountType === "single" && (
                                    <>
                                        <div className="absolute top-0 right-0 w-12 h-12 bg-gradient-to-bl from-blue-500/30 to-transparent"></div>
                                        <div className="absolute bottom-0 left-0 w-12 h-12 bg-gradient-to-tr from-indigo-500/30 to-transparent"></div>
                                    </>
                                )}
                            </div>

                            {/* Team Card */}
                            <div
                                className={`relative overflow-hidden flex flex-col items-center justify-center p-4 rounded-xl cursor-pointer transition-all ${
                                    accountType === "team"
                                        ? "ring-2 ring-teal-500 dark:ring-teal-400 bg-gradient-to-b from-white to-teal-50 dark:from-transparent dark:to-teal-900/20"
                                        : "border border-gray-200 dark:border-gray-700 hover:border-teal-200 dark:hover:border-teal-700 bg-gray-50 dark:bg-gray-800/60"
                                }`}
                                onClick={() => setAccountType("team")}
                            >
                                {accountType === "team" && (
                                    <div className="absolute top-2 right-2">
                                        <div className="h-5 w-5 bg-teal-500 rounded-full flex items-center justify-center">
                                            <CheckCircle2 className="h-4 w-4 text-white" />
                                        </div>
                                    </div>
                                )}

                                <div className={`h-14 w-14 rounded-full flex items-center justify-center mb-2 ${
                                    accountType === "team"
                                        ? "bg-gradient-to-r from-teal-500 to-blue-500 text-white"
                                        : "bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400"
                                }`}>
                                    <Users className="h-7 w-7" />
                                </div>
                                <span className={`text-sm font-medium ${accountType === "team" ? "text-teal-700 dark:text-teal-400" : ""}`}>
                  Team
                </span>
                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 text-center">
                                    Collaborate together
                                </p>

                                {/* Decorative corner gradients when selected */}
                                {accountType === "team" && (
                                    <>
                                        <div className="absolute top-0 right-0 w-12 h-12 bg-gradient-to-bl from-teal-500/30 to-transparent"></div>
                                        <div className="absolute bottom-0 left-0 w-12 h-12 bg-gradient-to-tr from-blue-500/30 to-transparent"></div>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <div className="relative group">
                            <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-blue-500 dark:text-blue-400">
                                <User className="h-5 w-5" />
                            </div>
                            <Input
                                type="text"
                                placeholder="Your name"
                                className="pl-10 border-blue-200/70 dark:border-blue-700/50 bg-blue-50/50 dark:bg-blue-900/20 focus:border-blue-400"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                required
                                disabled={isLoading}
                            />
                        </div>

                        {accountType === "team" && (
                            <div className="relative group">
                                <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-teal-500 dark:text-teal-400">
                                    <Building className="h-5 w-5" />
                                </div>
                                <Input
                                    type="text"
                                    placeholder="Team name"
                                    className="pl-10 border-teal-200/70 dark:border-teal-700/50 bg-teal-50/50 dark:bg-teal-900/20 focus:border-teal-400"
                                    value={teamName}
                                    onChange={(e) => setTeamName(e.target.value)}
                                    required
                                    disabled={isLoading}
                                />
                            </div>
                        )}

                        <div className="relative group">
                            <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-indigo-500 dark:text-indigo-400">
                                <Mail className="h-5 w-5" />
                            </div>
                            <Input
                                type="email"
                                placeholder="Email address"
                                className="pl-10 border-indigo-200/70 dark:border-indigo-700/50 bg-indigo-50/50 dark:bg-indigo-900/20 focus:border-indigo-400"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                                disabled={isLoading}
                            />
                        </div>

                        <div className="space-y-2">
                            <div className="relative group">
                                <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-purple-500 dark:text-purple-400">
                                    <Lock className="h-5 w-5" />
                                </div>
                                <Input
                                    type="password"
                                    placeholder="Password"
                                    className="pl-10 border-purple-200/70 dark:border-purple-700/50 bg-purple-50/50 dark:bg-purple-900/20 focus:border-purple-400"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                    minLength={8}
                                    disabled={isLoading}
                                />
                            </div>
                            <p className="text-xs text-muted-foreground">
                                Password must be at least 8 characters long
                            </p>
                        </div>
                    </div>

                    <Button
                        type="submit"
                        className={`w-full h-12 font-medium text-white shadow-md hover:shadow-lg transition-all ${
                            accountType === "single"
                                ? "bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700"
                                : "bg-gradient-to-r from-teal-500 to-blue-500 hover:from-teal-600 hover:to-blue-600"
                        }`}
                        disabled={isLoading}
                    >
                        {isLoading ? (
                            <div className="flex items-center">
                                <svg
                                    className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                                    xmlns="http://www.w3.org/2000/svg"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                >
                                    <circle
                                        className="opacity-25"
                                        cx="12"
                                        cy="12"
                                        r="10"
                                        stroke="currentColor"
                                        strokeWidth="4"
                                    ></circle>
                                    <path
                                        className="opacity-75"
                                        fill="currentColor"
                                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                                    ></path>
                                </svg>
                                Creating account...
                            </div>
                        ) : (
                            <div className="flex items-center justify-center">
                                {accountType === "single" ? "Create Solo Account" : "Create Team Account"}
                                <ArrowRight className="ml-2 h-4 w-4" />
                            </div>
                        )}
                    </Button>
                </form>

                <div className="mt-6 text-center">
                    <p className="text-sm text-muted-foreground">
                        Already have an account?{" "}
                        <Link href="/login" className={`font-medium hover:underline ${
                            accountType === "single" ? "text-blue-600 dark:text-blue-400" : "text-teal-600 dark:text-teal-400"
                        }`}>
                            Sign in
                        </Link>
                    </p>
                </div>

                <div className="mt-5 pt-5 text-center border-t border-gray-200 dark:border-gray-700">
                    <p className="text-xs text-muted-foreground">
                        By signing up, you agree to our{" "}
                        <Link href="/terms" className="text-primary hover:underline">Terms of Service</Link>{" "}
                        and{" "}
                        <Link href="/privacy" className="text-primary hover:underline">Privacy Policy</Link>
                    </p>
                </div>
            </div>
        </div>
    );
}