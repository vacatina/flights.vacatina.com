import { SignUp } from "@clerk/nextjs"

export default function SignUpPage() {
  return (
    <main className="min-h-svh bg-muted/30 px-4 py-10">
      <div className="mx-auto flex w-full max-w-md justify-center">
        <SignUp path="/sign-up" routing="path" signInUrl="/sign-in" />
      </div>
    </main>
  )
}
