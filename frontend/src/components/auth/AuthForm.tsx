"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useLoginMutation } from "@/hooks/auth/useLoginMutation";
import { useRegisterMutation } from "@/hooks/auth/useRegisterMutation";
import { getApiErrorMessage } from "@/lib/apiError";

import { OAuthButtonGroup } from "./OAuthButtonGroup";

interface AuthFormProps {
  mode: "login" | "register";
}

export function AuthForm({ mode }: AuthFormProps) {
  const router = useRouter();
  const loginMutation = useLoginMutation();
  const registerMutation = useRegisterMutation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const mutation = mode === "login" ? loginMutation : registerMutation;
  const isPending = mutation.isPending;

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage("");

    try {
      if (mode === "login") {
        await loginMutation.mutateAsync({
          email,
          password,
        });
      } else {
        await registerMutation.mutateAsync({
          email,
          password,
          display_name: displayName || null,
        });
      }

      router.replace("/auth/callback?provider=email");
    } catch (error) {
      setErrorMessage(
        getApiErrorMessage(
          error,
          mode === "login"
            ? "Unable to sign in with email."
            : "Unable to create your account.",
        ),
      );
    }
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(245,158,11,0.18),_transparent_28%),radial-gradient(circle_at_bottom_right,_rgba(14,165,233,0.14),_transparent_28%),linear-gradient(180deg,_#fffaf3_0%,_#f8fafc_48%,_#eef2ff_100%)] px-4 py-12">
      <div className="mx-auto flex min-h-[calc(100vh-6rem)] max-w-6xl items-center justify-center">
        <Card className="grid w-full max-w-5xl overflow-hidden border-white/70 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="hidden bg-[linear-gradient(160deg,rgba(15,23,42,0.98),rgba(30,41,59,0.92))] p-10 text-white lg:flex lg:flex-col lg:justify-between">
            <div className="space-y-6">
              <p className="text-xs uppercase tracking-[0.35em] text-amber-200/70">
                ERD Toolkit
              </p>
              <h1 className="max-w-md text-4xl font-semibold leading-tight">
                Design your database before code gets complicated.
              </h1>
              <p className="max-w-md text-sm leading-7 text-slate-300">
                ERD Toolkit gives you visual schema planning, field-level
                detail, relationship mapping, and SQL export—everything to
                architect data clearly.
              </p>
            </div>

            <div className="grid gap-4 rounded-[2rem] border border-white/10 bg-white/5 p-6 text-sm text-slate-200">
              <div>
                <p className="font-semibold text-white">Two powerful views</p>
                <p className="mt-1 text-slate-300">
                  ERD view for architecture. Data Dictionary view for
                  field-level clarity. Switch between them as your planning
                  deepens.
                </p>
              </div>
              <div>
                <p className="font-semibold text-white">From design to code</p>
                <p className="mt-1 text-slate-300">
                  Export to SQL, document relationships, organize fields. Move
                  schema thinking directly into development.
                </p>
              </div>
            </div>
          </div>

          <div className="p-6 sm:p-10">
            <CardHeader className="px-0 pt-0">
              <CardTitle>
                {mode === "login" ? "Welcome back" : "Create your account"}
              </CardTitle>
              <CardDescription>
                {mode === "login"
                  ? "Access your saved ERD projects and continue planning where you left off."
                  : "Create an account to save, organize, and share your database designs."}
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-6 px-0 pb-0">
              {errorMessage ? (
                <Alert className="border-rose-200 bg-rose-50 text-rose-900">
                  <AlertTitle>Authentication error</AlertTitle>
                  <AlertDescription>{errorMessage}</AlertDescription>
                </Alert>
              ) : null}

              <OAuthButtonGroup />

              <div className="flex items-center gap-3 text-xs uppercase tracking-[0.25em] text-muted-foreground">
                <div className="h-px flex-1 bg-border" />
                <span>or continue with email</span>
                <div className="h-px flex-1 bg-border" />
              </div>

              <form className="space-y-4" onSubmit={handleSubmit}>
                {mode === "register" ? (
                  <div className="space-y-2">
                    <Label htmlFor="displayName">Display name</Label>
                    <Input
                      id="displayName"
                      onChange={(event) => setDisplayName(event.target.value)}
                      placeholder="Your name (optional)"
                      value={displayName}
                    />
                  </div>
                ) : null}

                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    autoComplete="email"
                    id="email"
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="you@example.com"
                    required
                    type="email"
                    value={email}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    autoComplete={
                      mode === "login" ? "current-password" : "new-password"
                    }
                    id="password"
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder={
                      mode === "login"
                        ? "Enter your password"
                        : "At least 10 chars, upper/lower/number"
                    }
                    required
                    type="password"
                    value={password}
                  />
                </div>

                <Button className="w-full" disabled={isPending} type="submit">
                  {isPending
                    ? mode === "login"
                      ? "Signing in..."
                      : "Creating account..."
                    : mode === "login"
                      ? "Sign In"
                      : "Create Account"}
                </Button>
              </form>

              <p className="text-sm text-muted-foreground">
                {mode === "login" ? "Need an account?" : "Already registered?"}{" "}
                <Link
                  className="font-semibold text-primary underline-offset-4 hover:underline"
                  href={mode === "login" ? "/auth/register" : "/auth/login"}
                >
                  {mode === "login" ? "Create one" : "Sign in"}
                </Link>
              </p>

              <Link
                className="inline-flex text-sm font-medium text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
                href="/"
              >
                Back to home
              </Link>
            </CardContent>
          </div>
        </Card>
      </div>
    </div>
  );
}
