import {
  getAdminCancellationDetail,
  requireActiveAdmin,
} from "@/modules/flights/cancellations/server"
import { AdminCancellationDetail } from "@/modules/flights/cancellations/ui"

interface AdminCancellationDetailPageProps {
  params: Promise<{ requestId: string }>
}

export default async function AdminCancellationDetailPage({
  params,
}: AdminCancellationDetailPageProps) {
  await requireActiveAdmin()
  const { requestId } = await params
  const detail = await getAdminCancellationDetail(requestId)

  return (
    <main className="min-h-svh bg-background py-6 md:py-8">
      <div className="mx-auto w-full max-w-7xl px-4 md:px-6 xl:px-8">
        <AdminCancellationDetail detail={detail} />
      </div>
    </main>
  )
}
