import { SignIn } from "@clerk/react";

export default function SignInPage() {
  return (
    <div className="min-h-screen flex items-center justify-center px-6 py-16 bg-background">
      <div className="w-full max-w-sm">
        <SignIn routing="hash" />
      </div>
    </div>
  );
}
