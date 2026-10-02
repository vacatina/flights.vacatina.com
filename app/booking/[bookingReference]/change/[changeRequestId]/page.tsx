import { getActorContext } from "@/modules/auth/server"
import { getChangeStatus } from "@/modules/flights/changes/server"
import { ChangeStatusPanel } from "@/modules/flights/changes/ui"
export default async function Page({params}:{params:Promise<{changeRequestId:string}>}){const [actor,{changeRequestId}]=await Promise.all([getActorContext({ensureGuestSession:false}),params]);const detail=await getChangeStatus({requestId:changeRequestId,actor});return <main className="min-h-svh py-8"><div className="w-full mx-auto max-w-screen-2xl px-4"><ChangeStatusPanel detail={detail}/></div></main>}

