"use client"

import { ChevronDownIcon } from "lucide-react"

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"
import type { DisplayCurrencyCode } from "@/modules/currency/domain"
import { useCurrency } from "@/modules/currency/ui/currency-provider"

export function CurrencySelector({
  variant = "navbar",
  className,
}: {
  variant?: "navbar" | "footer"
  className?: string
}) {
  const { currencies, selectedCurrency, setCurrency, preferencePending } =
    useCurrency()

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <button
            type="button"
            className={cn(
              "inline-flex items-center gap-1.5 rounded-sm font-medium outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
              variant === "navbar"
                ? "text-primary-foreground transition-opacity hover:opacity-80 focus-visible:ring-offset-[#1B1464]"
                : "text-foreground underline underline-offset-3",
              className
            )}
            aria-label={`Language English, display currency: ${selectedCurrency}`}
            aria-busy={preferencePending}
          />
        }
      >
        EN · {selectedCurrency}
        <ChevronDownIcon aria-hidden="true" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" sideOffset={10} className="w-72">
        <DropdownMenuGroup>
          <DropdownMenuLabel>Display currency</DropdownMenuLabel>
          <DropdownMenuRadioGroup
            value={selectedCurrency}
            onValueChange={(value) =>
              setCurrency(value as DisplayCurrencyCode)
            }
          >
            {currencies
              .filter((currency) => currency.displayEnabled)
              .sort((left, right) => left.sortOrder - right.sortOrder)
              .map((currency) => (
                <DropdownMenuRadioItem
                  key={currency.code}
                  value={currency.code}
                  className="py-2.5"
                >
                  <span className="w-8 font-semibold">{currency.code}</span>
                  <span className="w-8 text-center text-muted-foreground">
                    {currency.symbol}
                  </span>
                  <span className="truncate">{currency.name}</span>
                </DropdownMenuRadioItem>
              ))}
          </DropdownMenuRadioGroup>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
