export interface AuthenticatedActorContext {
  type: "user"
  clerkUserId: string
  appUserId: string
}

export interface GuestActorContext {
  type: "guest"
  guestId: string
}

export type ActorContext = AuthenticatedActorContext | GuestActorContext

export interface GuestSessionPayload {
  guestId: string
  issuedAt: number
  expiresAt: number
}
