"use client"

import { useState } from "react"
import Image from "next/image"
import { ArrowLeft, ArrowRight, Expand } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import type { HolidayMediaItem } from "../domain/types"
import { holidayImage } from "../domain/catalog"

export function HolidayGallery({
  images,
  title,
}: {
  images: HolidayMediaItem[]
  title: string
}) {
  const [selected, setSelected] = useState<number | null>(null)
  if (!images.length) return null
  const current = selected === null ? null : images[selected]
  return (
    <>
      <div className="flex flex-col gap-3">
        {images.map((photo, index) => (
          <button
            type="button"
            key={photo.file}
            className="group relative aspect-[1.7] overflow-hidden rounded-2xl outline-none focus-visible:ring-3 focus-visible:ring-ring"
            onClick={() => setSelected(index)}
            aria-label={`View ${photo.alt}`}
          >
            <Image
              src={holidayImage(photo.file)!}
              alt={photo.alt}
              fill
              sizes="(min-width: 1024px) 530px, 90vw"
              className="object-cover"
            />
            <span
              className="absolute right-4 bottom-4 rounded-full bg-primary p-3 text-primary-foreground opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100"
              aria-hidden="true"
            >
              <Expand className="size-4" />
            </span>
          </button>
        ))}
      </div>
      <Dialog
        open={selected !== null}
        onOpenChange={(open) => {
          if (!open) setSelected(null)
        }}
      >
        <DialogContent className="sm:max-w-4xl">
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{current?.alt}</DialogDescription>
          {current && (
            <div className="relative aspect-[1.6]">
              <Image
                src={holidayImage(current.file)!}
                alt={current.alt}
                fill
                sizes="90vw"
                className="object-contain"
              />
            </div>
          )}
          <div className="flex items-center justify-between">
            <Button
              size="icon"
              variant="outline"
              aria-label="Previous photo"
              onClick={() =>
                setSelected(
                  ((selected ?? 0) - 1 + images.length) % images.length
                )
              }
            >
              <ArrowLeft />
            </Button>
            <p className="text-sm text-muted-foreground">
              {(selected ?? 0) + 1} / {images.length}
            </p>
            <Button
              size="icon"
              variant="outline"
              aria-label="Next photo"
              onClick={() => setSelected(((selected ?? 0) + 1) % images.length)}
            >
              <ArrowRight />
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
