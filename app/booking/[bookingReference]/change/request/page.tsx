import { getActorContext } from "@/modules/auth/server"
import { getChangeBookingContext } from "@/modules/flights/changes/server"
import { ManualChangeRequestForm } from "@/modules/flights/changes/ui"
export default async function Page({params,searchParams}:{params:Promise<{bookingReference:string}>;searchParams:Promise<{type?:string}>}){const [actor,{bookingReference},{type}]=await Promise.all([getActorContext({ensureGuestSession:false}),params,searchParams]);const context=await getChangeBookingContext({bookingReference,actor});return <main className="min-h-svh py-8"><div className="w-full mx-auto max-w-screen-2xl px-4"><ManualChangeRequestForm context={context} type={normalize(type)}/></div></main>}
function normalize(v?:string){return ["remove_passenger","seat_change","remove_service","traveller_details_change","other"].includes(v??"")?v!:"other"}

