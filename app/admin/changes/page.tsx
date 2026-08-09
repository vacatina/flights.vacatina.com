import { AdminPanelShell } from "@/modules/admin/ui/admin-panel-shell"
import { requireActiveAdmin } from "@/modules/flights/cancellations/server"
import { listAdminChanges } from "@/modules/flights/changes/server"
import { AdminChangeQueue } from "@/modules/flights/changes/ui"
import type { FlightChangeHandlingMode,FlightChangeStatus } from "@/modules/flights/changes/domain"
export default async function Page({searchParams}:{searchParams:Promise<{status?:string;mode?:string}>}){const admin=await requireActiveAdmin(),q=await searchParams,items=await listAdminChanges({status:q.status as FlightChangeStatus|undefined,mode:q.mode as FlightChangeHandlingMode|undefined});return <AdminPanelShell active="changes" title="Flight changes" description="Review automatic, approval, and manual booking changes." adminEmail={admin.email} navigationCounts={{changes:items.filter(i=>!["completed","rejected","expired"].includes(i.status)).length}}><AdminChangeQueue items={items}/></AdminPanelShell>}

