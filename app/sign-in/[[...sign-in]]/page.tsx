import { SignIn } from "@clerk/nextjs"

export default function SignInPage() {
  return (
    <main className="min-h-svh bg-muted/30 px-4 py-10">
      <div className="mx-auto flex w-full max-w-md justify-center">
        <SignIn path="/sign-in" routing="path" signUpUrl="/sign-up" />
      </div>
    </main>
  )
}
