"use client"

import { useActionState, useState } from "react"
import { CircleCheckIcon, CircleXIcon, XIcon } from "lucide-react"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { PendingSubmitButton } from "@/components/ui/pending-submit-button"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { CURRENCY_REGISTRY } from "@/modules/currency/domain"
import { CountrySearchField } from "@/modules/visa-assistance/ui/country-search-field"
import {
  createVisaPricingRuleFormAction,
  type VisaPricingActionState,
  updateVisaPricingRuleFormAction,
} from "@/modules/visa-assistance/pricing/server/actions"

const initialVisaPricingActionState: VisaPricingActionState = {
  status: "idle",
  message: null,
}

export interface VisaPricingRuleFormValues {
  id?: string
  name: string
  priority: number
  feeComponent: "processing_fee" | "government_fee"
  adjustmentType: "percent" | "fixed"
  adjustmentValue: string
  adjustmentCurrency: string | null
  nationalityCode: string | null
  destinationCode: string | null
  visaTypeId: string | null
  providerProductId: string | null
  activeFrom: string
  activeTo: string
}

const feeItems = [
  { label: "Visa processing fee", value: "processing_fee" },
  { label: "Government fee", value: "government_fee" },
] as const
const adjustmentItems = [
  { label: "Percentage markup", value: "percent" },
  { label: "Fixed markup", value: "fixed" },
] as const
const currencyItems = CURRENCY_REGISTRY.map((currency) => ({
  label: `${currency.code} — ${currency.name}`,
  value: currency.code,
}))

export function VisaPricingRuleForm({
  mode,
  initialValues,
}: {
  mode: "create" | "edit"
  initialValues?: VisaPricingRuleFormValues
}) {
  const action =
    mode === "create"
      ? createVisaPricingRuleFormAction
      : updateVisaPricingRuleFormAction
  const [state, formAction, isPending] = useActionState(
    action,
    initialVisaPricingActionState
  )
  const [adjustmentType, setAdjustmentType] = useState<"percent" | "fixed">(
    initialValues?.adjustmentType ?? "percent"
  )
  const [nationalityCode, setNationalityCode] = useState(
    initialValues?.nationalityCode ?? ""
  )
  const [destinationCode, setDestinationCode] = useState(
    initialValues?.destinationCode ?? ""
  )

  return (
    <form
      action={formAction}
      className="flex flex-col gap-6"
      aria-busy={isPending}
    >
      {initialValues?.id ? (
        <input type="hidden" name="id" value={initialValues.id} />
      ) : null}
      <input type="hidden" name="nationalityCode" value={nationalityCode} />
      <input type="hidden" name="destinationCode" value={destinationCode} />

      {state.message ? (
        <Alert variant={state.status === "error" ? "destructive" : "default"}>
          {state.status === "error" ? <CircleXIcon /> : <CircleCheckIcon />}
          <AlertTitle>
            {state.status === "error" ? "Could not save" : "Saved"}
          </AlertTitle>
          <AlertDescription>{state.message}</AlertDescription>
        </Alert>
      ) : null}

      <fieldset
        disabled={isPending}
        className="flex min-w-0 flex-col gap-6 border-0 p-0"
      >
        <FieldGroup>
          <div className="grid gap-5 md:grid-cols-2">
            <Field>
              <FieldLabel htmlFor="name">Rule name</FieldLabel>
              <Input
                id="name"
                name="name"
                defaultValue={initialValues?.name}
                maxLength={120}
                required
              />
              <FieldDescription>
                Use a name operators can recognize later.
              </FieldDescription>
            </Field>

            <Field>
              <FieldLabel htmlFor="priority">Priority</FieldLabel>
              <Input
                id="priority"
                name="priority"
                type="number"
                min={0}
                max={1000}
                step={1}
                defaultValue={initialValues?.priority ?? 0}
                required
              />
              <FieldDescription>
                Higher priority wins when scope is equally specific.
              </FieldDescription>
            </Field>
          </div>

          <div className="grid gap-5 md:grid-cols-2">
            <Field>
              <FieldLabel>Fee component</FieldLabel>
              <Select
                name="feeComponent"
                items={feeItems}
                defaultValue={initialValues?.feeComponent ?? "processing_fee"}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent alignItemWithTrigger={false}>
                  <SelectGroup>
                    {feeItems.map((item) => (
                      <SelectItem key={item.value} value={item.value}>
                        {item.label}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
              <FieldDescription>
                Processing markup is the recommended business default.
              </FieldDescription>
            </Field>

            <Field>
              <FieldLabel>Adjustment type</FieldLabel>
              <Select
                name="adjustmentType"
                items={adjustmentItems}
                value={adjustmentType}
                onValueChange={(value) =>
                  setAdjustmentType(value as "percent" | "fixed")
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent alignItemWithTrigger={false}>
                  <SelectGroup>
                    {adjustmentItems.map((item) => (
                      <SelectItem key={item.value} value={item.value}>
                        {item.label}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </Field>
          </div>

          <div className="grid gap-5 md:grid-cols-2">
            <Field>
              <FieldLabel htmlFor="adjustmentValue">
                {adjustmentType === "percent"
                  ? "Markup percentage"
                  : "Fixed amount"}
              </FieldLabel>
              <Input
                id="adjustmentValue"
                name="adjustmentValue"
                type="number"
                min={0}
                max={adjustmentType === "percent" ? 500 : undefined}
                step="0.0001"
                defaultValue={initialValues?.adjustmentValue ?? "10"}
                required
              />
            </Field>

            {adjustmentType === "fixed" ? (
              <Field>
                <FieldLabel>Fixed amount currency</FieldLabel>
                <Select
                  name="adjustmentCurrency"
                  items={currencyItems}
                  defaultValue={initialValues?.adjustmentCurrency ?? "USD"}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent alignItemWithTrigger={false}>
                    <SelectGroup>
                      {currencyItems.map((item) => (
                        <SelectItem key={item.value} value={item.value}>
                          {item.label}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
                <FieldDescription>
                  The rule applies only to supplier fees in this currency.
                </FieldDescription>
              </Field>
            ) : null}
          </div>

          <div className="grid gap-5 md:grid-cols-2">
            <CountryScopeField
              label="Passport country"
              value={nationalityCode}
              onChange={setNationalityCode}
            />
            <CountryScopeField
              label="Destination country"
              value={destinationCode}
              onChange={setDestinationCode}
            />
          </div>

          <div className="grid gap-5 md:grid-cols-2">
            <Field>
              <FieldLabel htmlFor="visaTypeId">Visa type ID</FieldLabel>
              <Input
                id="visaTypeId"
                name="visaTypeId"
                defaultValue={initialValues?.visaTypeId ?? ""}
              />
              <FieldDescription>
                Optional exact visa-type scope.
              </FieldDescription>
            </Field>
            <Field>
              <FieldLabel htmlFor="providerProductId">
                Supplier product ID
              </FieldLabel>
              <Input
                id="providerProductId"
                name="providerProductId"
                defaultValue={initialValues?.providerProductId ?? ""}
              />
              <FieldDescription>
                Internal only; never exposed on public pages.
              </FieldDescription>
            </Field>
          </div>

          <div className="grid gap-5 md:grid-cols-2">
            <Field>
              <FieldLabel htmlFor="activeFrom">Active from (UTC)</FieldLabel>
              <Input
                id="activeFrom"
                name="activeFrom"
                type="datetime-local"
                defaultValue={initialValues?.activeFrom}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="activeTo">Active until (UTC)</FieldLabel>
              <Input
                id="activeTo"
                name="activeTo"
                type="datetime-local"
                defaultValue={initialValues?.activeTo}
              />
            </Field>
          </div>

          <Field>
            <FieldLabel htmlFor="reason">Change reason</FieldLabel>
            <Textarea
              id="reason"
              name="reason"
              rows={3}
              placeholder="Why is this pricing rule being added or changed?"
            />
            <FieldDescription>Stored in the audit history.</FieldDescription>
            {state.status === "error" ? (
              <FieldError>{state.message}</FieldError>
            ) : null}
          </Field>
        </FieldGroup>

        <div className="flex justify-end">
          <PendingSubmitButton
            size="lg"
            pendingLabel={
              mode === "create" ? "Creating rule..." : "Saving changes..."
            }
          >
            {mode === "create" ? "Create pricing rule" : "Save pricing rule"}
          </PendingSubmitButton>
        </div>
      </fieldset>
    </form>
  )
}

function CountryScopeField({
  label,
  value,
  onChange,
}: {
  label: string
  value: string
  onChange: (value: string) => void
}) {
  return (
    <Field>
      <div className="flex items-center justify-between gap-3">
        <FieldLabel>{label}</FieldLabel>
        {value ? (
          <Button
            type="button"
            variant="ghost"
            size="xs"
            onClick={() => onChange("")}
          >
            <XIcon data-icon="inline-start" /> Clear
          </Button>
        ) : null}
      </div>
      <CountrySearchField
        value={value}
        onChange={onChange}
        placeholder={`Any ${label.toLowerCase()}`}
      />
      <FieldDescription>Leave empty to match every country.</FieldDescription>
    </Field>
  )
}
