import type { BusinessSettingsRow } from "@/lib/db"
import { updateBusinessSettingsFormAction } from "@/modules/flights/cancellations/server/actions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"

interface BusinessSettingsFormProps {
  settings: BusinessSettingsRow
}

export function BusinessSettingsForm({ settings }: BusinessSettingsFormProps) {
  return (
    <form action={updateBusinessSettingsFormAction} className="max-w-3xl space-y-5">
      <div className="grid gap-4 md:grid-cols-2">
        <Field
          label="Business name"
          name="businessName"
          defaultValue={settings.businessName}
        />
        <Field
          label="Support email"
          name="supportEmail"
          defaultValue={settings.supportEmail}
        />
        <Field
          label="Support phone"
          name="supportPhone"
          defaultValue={settings.supportPhone}
        />
        <Field
          label="Support WhatsApp"
          name="supportWhatsapp"
          defaultValue={settings.supportWhatsapp}
        />
        <Field
          label="Timezone"
          name="timezone"
          defaultValue={settings.timezone}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="address">Address</Label>
        <Textarea
          id="address"
          name="address"
          defaultValue={settings.address}
          className="min-h-24"
        />
      </div>
      <Button type="submit">Save settings</Button>
    </form>
  )
}

function Field({
  label,
  name,
  defaultValue,
}: {
  label: string
  name: string
  defaultValue: string
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={name}>{label}</Label>
      <Input id={name} name={name} defaultValue={defaultValue} />
    </div>
  )
}
