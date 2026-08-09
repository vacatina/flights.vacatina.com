"use client"

import { PayPalOneTimePaymentButton, PayPalProvider } from "@paypal/react-paypal-js/sdk-v6"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { startFlightChangePayPalPaymentAction, captureFlightChangePayPalPaymentAction } from "@/modules/flights/changes/server/actions"

export function FlightChangePayPalPayment({requestId,bookingReference,amount,currency}:{requestId:string;bookingReference:string;amount:number;currency:string}){
  const clientId=process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID?.trim(),router=useRouter(),[error,setError]=useState<string|null>(null),[processing,setProcessing]=useState(false)
  if(!clientId)return <Alert variant="destructive"><AlertTitle>Payments are unavailable</AlertTitle><AlertDescription>PayPal is not configured for this booking.</AlertDescription></Alert>
  return <div className="space-y-3 rounded-xl border bg-card p-4"><div><p className="font-medium">Pay {new Intl.NumberFormat("en-GB",{style:"currency",currency}).format(amount)}</p><p className="text-sm text-muted-foreground">The airline quote is checked again immediately before PayPal opens.</p></div>{error?<p className="text-sm text-destructive">{error}</p>:null}<PayPalProvider clientId={clientId} environment={process.env.NEXT_PUBLIC_PAYPAL_ENVIRONMENT==="live"?"live":"sandbox"} components={["paypal-payments"]} pageType="checkout"><PayButton disabled={processing} onCreate={async()=>{setError(null);const payment=await startFlightChangePayPalPaymentAction({requestId});return payment.paypalOrderId}} onApprove={async paypalOrderId=>{setProcessing(true);try{await captureFlightChangePayPalPaymentAction({requestId,paypalOrderId,bookingReference});router.refresh()}catch(cause){setError(cause instanceof Error?cause.message:"Payment could not be captured.")}finally{setProcessing(false)}}} onError={cause=>setError(cause instanceof Error?cause.message:"PayPal could not start payment.")}/></PayPalProvider></div>
}
function PayButton({disabled,onCreate,onApprove,onError}:{disabled:boolean;onCreate:()=>Promise<string>;onApprove:(orderId:string)=>Promise<void>;onError:(error:unknown)=>void}){return <PayPalOneTimePaymentButton type="pay" disabled={disabled} createOrder={async()=>({orderId:await onCreate()})} onApprove={async approval=>onApprove(approval.orderId)} onError={onError}/>}
