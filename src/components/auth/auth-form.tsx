"use client";

import Link from "next/link";
import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { signIn, signUp, signInWithGoogle, type AuthState } from "@/app/(auth)/actions";

type Props = { mode: "login" | "signup"; next: string; initialError?: string };

export function AuthForm({ mode, next, initialError }: Props) {
  const action = mode === "login" ? signIn : signUp;
  const [state, formAction, pending] = useActionState<AuthState, FormData>(action, { error: initialError });
  const title = mode === "login" ? "Log in" : "Create your account";

  return (
    <div className="w-full max-w-sm space-y-6">
      <div className="space-y-1 text-center">
        <h1 className="text-lg font-semibold">{title}</h1>
        <p className="text-sm text-text-muted">
          {mode === "login" ? "Welcome back to Taskraft." : "A workspace for your team, in a minute."}
        </p>
      </div>

      {state.message ? (
        <p role="status" className="rounded-md bg-success-soft px-3 py-2 text-sm text-success">{state.message}</p>
      ) : null}

      <form action={formAction} className="space-y-4" noValidate>
        <input type="hidden" name="next" value={next} />
        {mode === "signup" ? (
          <div className="space-y-1.5">
            <Label htmlFor="name">Your name</Label>
            <Input id="name" name="name" autoComplete="name" required maxLength={120} />
          </div>
        ) : null}
        <div className="space-y-1.5">
          <Label htmlFor="email">Email</Label>
          <Input id="email" name="email" type="email" autoComplete="email" required inputMode="email" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="password">Password</Label>
          <Input id="password" name="password" type="password" autoComplete={mode === "login" ? "current-password" : "new-password"} required minLength={6} aria-describedby={state.error ? "auth-error" : undefined} aria-invalid={Boolean(state.error) || undefined} />
        </div>
        {state.error ? (
          <p id="auth-error" role="alert" className="text-sm text-danger">{state.error}</p>
        ) : null}
        <Button type="submit" className="w-full" disabled={pending} aria-busy={pending}>
          {pending ? <Spinner className="text-on-brand" /> : null}
          {mode === "login" ? "Log in" : "Sign up"}
        </Button>
      </form>

      <div className="flex items-center gap-3 text-xs text-text-muted">
        <span className="h-px flex-1 bg-border" /> or <span className="h-px flex-1 bg-border" />
      </div>

      <form action={signInWithGoogle}>
        <input type="hidden" name="next" value={next} />
        <Button type="submit" variant="outline" className="w-full">
          Continue with Google
        </Button>
      </form>

      <p className="text-center text-sm text-text-muted">
        {mode === "login" ? (
          <>No account yet? <Link className="font-medium text-brand-text" href={`/signup?next=${encodeURIComponent(next)}`}>Sign up</Link></>
        ) : (
          <>Already have an account? <Link className="font-medium text-brand-text" href={`/login?next=${encodeURIComponent(next)}`}>Log in</Link></>
        )}
      </p>
    </div>
  );
}
