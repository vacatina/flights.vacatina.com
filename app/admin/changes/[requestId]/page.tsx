import { notFound } from "next/navigation"
import { AdminPanelShell } from "@/modules/admin/ui/admin-panel-shell"
import { requireActiveAdmin } from "@/modules/flights/cancellations/server"
import { getAdminChangeDetail,listAdminChanges } from "@/modules/flights/changes/server"
import { AdminChangeDetail } from "@/modules/flights/changes/ui"
export default async function Page({params}:{params:Promise<{requestId:string}>}){const admin=await requireActiveAdmin(),{requestId}=await params;const [detail,items]=await Promise.all([getAdminChangeDetail(requestId),listAdminChanges()]);if(!detail)notFound();return <AdminPanelShell active="changes" title={detail.booking.reference} description="Flight change request detail and audit trail." adminEmail={admin.email} navigationCounts={{changes:items.filter(i=>!["completed","rejected","expired"].includes(i.status)).length}}><AdminChangeDetail detail={detail}/></AdminPanelShell>}
