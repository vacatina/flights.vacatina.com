"use client"

import { BracesIcon, DatabaseIcon } from "lucide-react"

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { Badge } from "@/components/ui/badge"

interface ApiDataAccordionProps {
  requirements: Record<string, unknown>
  products: Record<string, unknown>
}

export function ApiDataAccordion({
  requirements,
  products,
}: ApiDataAccordionProps) {
  return (
    <Accordion multiple className="rounded-xl border bg-card px-5 md:px-6">
      <AccordionItem value="requirements">
        <AccordionTrigger className="py-5 hover:no-underline">
          <span className="flex items-center gap-3">
            <span className="flex size-9 items-center justify-center rounded-lg bg-muted">
              <DatabaseIcon />
            </span>
            <span>
              Destination requirements response
              <span className="mt-0.5 block text-xs font-normal text-muted-foreground">
                Complete response from the requirements endpoint
              </span>
            </span>
          </span>
          <Badge variant="outline" className="mr-2 hidden sm:inline-flex">
            JSON
          </Badge>
        </AccordionTrigger>
        <AccordionContent>
          <pre className="max-h-[34rem] overflow-auto rounded-lg bg-muted p-4 font-mono text-xs leading-relaxed">
            {JSON.stringify(requirements, null, 2)}
          </pre>
        </AccordionContent>
      </AccordionItem>

      <AccordionItem value="products">
        <AccordionTrigger className="py-5 hover:no-underline">
          <span className="flex items-center gap-3">
            <span className="flex size-9 items-center justify-center rounded-lg bg-muted">
              <BracesIcon />
            </span>
            <span>
              Product details response
              <span className="mt-0.5 block text-xs font-normal text-muted-foreground">
                Complete response including all product and pricing fields
              </span>
            </span>
          </span>
          <Badge variant="outline" className="mr-2 hidden sm:inline-flex">
            JSON
          </Badge>
        </AccordionTrigger>
        <AccordionContent>
          <pre className="max-h-[34rem] overflow-auto rounded-lg bg-muted p-4 font-mono text-xs leading-relaxed">
            {JSON.stringify(products, null, 2)}
          </pre>
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  )
}
