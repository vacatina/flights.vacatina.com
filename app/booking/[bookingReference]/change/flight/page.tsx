import { getActorContext } from "@/modules/auth/server"
import { getChangeBookingContext } from "@/modules/flights/changes/server"
import { ChangeFlightFlow } from "@/modules/flights/changes/ui"
export default async function Page({params}:{params:Promise<{bookingReference:string}>}){const [actor,{bookingReference}]=await Promise.all([getActorContext({ensureGuestSession:false}),params]);const context=await getChangeBookingContext({bookingReference,actor});return <main className="min-h-svh py-8"><div className="mx-auto max-w-4xl px-4"><ChangeFlightFlow context={context}/></div></main>}

