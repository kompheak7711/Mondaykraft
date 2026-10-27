import type { Metadata } from "next";
import { AuthForm } from "@/components/auth/auth-form";

export const metadata: Metadata = { title: "Log in" };

const errors: Record<string, string> = {
  link: "That link has expired or was already used. Log in to continue.",
  google: "Google sign-in isn't available right now. Use your email and password.",
};

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string; error?: string }> }) {
  const { next = "/", error } = await searchParams;
  return <AuthForm mode="login" next={next} initialError={error ? errors[error] ?? errors.link : undefined} />;
}
