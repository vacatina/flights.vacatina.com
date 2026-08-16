"use client"
import { useFormStatus } from "react-dom"
import { LoaderCircleIcon } from "lucide-react"
import type { ComponentProps, ReactNode } from "react"
import type { VariantProps } from "class-variance-authority"
import { Button, type buttonVariants } from "@/components/ui/button"

export interface PendingSubmitButtonProps extends VariantProps<typeof buttonVariants>, Omit<ComponentProps<typeof Button>, "children"|"variant"|"size"> { children:ReactNode; pendingLabel?:string }
export function PendingSubmitButton({children,pendingLabel="Working...",className,disabled=false,variant="default",size="default",...props}:PendingSubmitButtonProps){const {pending}=useFormStatus();return <Button {...props} type="submit" variant={variant} size={size} className={className} disabled={disabled||pending} aria-disabled={disabled||pending}>{pending?<><LoaderCircleIcon className="size-4 animate-spin"/>{pendingLabel}</>:children}</Button>}
