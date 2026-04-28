'use client'

import * as NProgress from 'nprogress'
import NextTopLoader from 'nextjs-toploader'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { Suspense, useEffect } from 'react'

export function TopLoader() {
  return (
    <>
      <NextTopLoader showSpinner={false} height={3.5} color="#3554D1" />
      <Suspense fallback={null}>
        <FinishingLoader />
      </Suspense>
    </>
  )
}

function FinishingLoader() {
  const pathname = usePathname()
  const router = useRouter()
  const searchParams = useSearchParams()
  useEffect(() => {
    NProgress.done()
  }, [pathname, router, searchParams])
  return null
}
