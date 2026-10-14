import { redirect } from "next/navigation";
import { Suspense } from "react";
import { getCurrentProfile } from "@/lib/supabase/profile";
import { OnboardingForm } from "./onboarding-form";

async function Guard() {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");
  if (profile.username) redirect("/");
  return <OnboardingForm />;
}

export default function OnboardingPage() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-6 p-8">
      <h1 className="text-2xl font-semibold">블로그 아이디 만들기</h1>
      <Suspense>
        <Guard />
      </Suspense>
    </main>
  );
}
