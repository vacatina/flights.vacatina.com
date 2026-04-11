# Next.js template

This is a Next.js template with shadcn/ui.

## Adding components

To add components to your app, run the following command:

```bash
npx shadcn@latest add button
```

This will place the ui components in the `components` directory.

## Using components

To use the components in your app, import them as follows:

```tsx
import { Button } from "@/components/ui/button";
```

## Authentication (Clerk)

Set the following environment variables before using hosted sign-in/sign-up:

```bash
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
CLERK_WEBHOOK_SECRET=whsec_...
AUTH_GUEST_SESSION_SECRET=change-me
```

Optional:

```bash
AUTH_GUEST_SESSION_COOKIE_NAME=guest_session
AUTH_GUEST_SESSION_TTL_MS=2592000000
```
