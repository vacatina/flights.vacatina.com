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
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
      <form
        action={updateBusinessSettingsFormAction}
        className="space-y-5 rounded-md border border-[#dfe4ec] bg-white p-5 shadow-sm md:p-6"
      >
        <div>
          <h2 className="text-lg font-semibold">Business settings</h2>
          <p className="text-sm text-muted-foreground">
            These details appear in manual cancellation support screens.
          </p>
        </div>

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
            className="min-h-28"
          />
        </div>
        <Button
          type="submit"
          size="lg"
          className="h-10 bg-[#1749d8] hover:bg-[#123fc0]"
        >
          Save settings
        </Button>
      </form>

      <section className="space-y-4 rounded-md border border-[#dfe4ec] bg-white p-5 shadow-sm md:p-6">
        <h2 className="text-lg font-semibold">Customer support card</h2>
        <div className="rounded-md bg-[#13357b] p-4 text-white">
          <p className="text-lg font-semibold">{settings.businessName}</p>
          <p className="mt-1 text-sm text-white/75">
            Manual cases and refund questions
          </p>
        </div>
        <PreviewLine label="Email" value={settings.supportEmail} />
        <PreviewLine label="Phone" value={settings.supportPhone} />
        <PreviewLine label="WhatsApp" value={settings.supportWhatsapp} />
        <PreviewLine label="Timezone" value={settings.timezone} />
      </section>
    </div>
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

function PreviewLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-3 border-b border-border pb-3 text-sm last:border-0">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right font-medium">{value}</span>
    </div>
  )
}
