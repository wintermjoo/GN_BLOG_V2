import { GoogleSignInButton } from "@/components/google-sign-in-button";

export default function LoginPage() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-6 p-8">
      <h1 className="text-2xl font-semibold">로그인</h1>
      <GoogleSignInButton />
    </main>
  );
}
