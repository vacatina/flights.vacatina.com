"use client"

import { useState, useEffect } from "react"
import type React from "react"
import Image from "next/image"

import { cn } from "@/lib/utils"

export default function HowItWorks() {
  const [activeCard, setActiveCard] = useState(0)
  const [animationKey, setAnimationKey] = useState(0)

  const cards = [
    {
      title: "Assess Your Eligibility",
      description:
        "Answer quick questions about your destination\nand purpose to determine visa requirements.",
      image: "/img/visa-img/1visa.png",
    },
    {
      title: "Submit Your Documents",
      description:
        "Upload required documents securely through\nour platform with real-time verification.",
      image: "/img/visa-img/2visa.png",
    },
    {
      title: "Expert Review & Processing",
      description:
        "Our visa specialists review your application\nand handle all communications with embassies.",
      image: "/img/visa-img/3visa.png",
    },
    {
      title: "Receive Your Visa",
      description:
        "Get your approved visa delivered with\nclear instructions for your travel.",
      image: "/img/visa-img/4visa.png",
    },
  ]

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveCard((prev) => (prev + 1) % cards.length)
      setAnimationKey((prev) => prev + 1)
    }, 5000)

    return () => clearInterval(interval)
  }, [cards.length])

  const handleCardClick = (index: number) => {
    setActiveCard(index)
    setAnimationKey((prev) => prev + 1)
  }

  return (
    <>
      {/* Content Section */}
      <div className="flex w-full items-center justify-start overflow-hidden px-4 md:px-9">
        <div className="flex w-full flex-col items-start justify-start gap-6 py-8 md:grid md:grid-cols-2 md:items-center md:gap-8 md:py-11 lg:grid-cols-6">
          {/* Left Column - Feature Cards */}
          <div className="flex h-full w-full flex-col items-center justify-between gap-3 md:col-span-1 md:gap-4 lg:col-span-3">
            {cards.map((card, index) => {
              const isActive = index === activeCard

              return (
                <div
                  key={index}
                  onClick={() => handleCardClick(index)}
                  className={cn(
                    "flex w-full cursor-pointer flex-col items-start justify-start overflow-hidden rounded-sm transition-all duration-300",
                    isActive
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-foreground"
                  )}
                >
                  <div
                    className={cn(
                      "h-0.5 w-full overflow-hidden bg-primary-foreground/20",
                      isActive ? "opacity-100" : "opacity-0"
                    )}
                  >
                    <div
                      key={animationKey}
                      className="!h-2 animate-[progressBar_5s_linear_forwards] bg-primary-foreground will-change-transform"
                    />
                  </div>
                  <div className="relative flex w-full gap-4 !px-5 !py-4 md:gap-6 md:!px-6 md:!py-5 lg:gap-10">
                    <div className="flex aspect-square h-12 w-12 flex-shrink-0 items-center justify-center rounded-full border font-sans text-xl font-medium sm:h-14 sm:w-14 sm:text-2xl md:h-24 md:w-24 md:text-4xl">
                      0{index + 1}
                    </div>
                    <div className="flex min-w-0 flex-1 flex-col justify-between py-4">
                      <div className="font-sans text-base leading-tight font-semibold sm:text-lg md:text-xl md:leading-6">
                        {card.title}
                      </div>
                      <div className="font-sans text-xs leading-[18px] font-normal whitespace-pre-line sm:text-sm sm:leading-[22px]">
                        {card.description}
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
          {/* Right Column - Image (shown first on mobile) */}
          <div className="w-full md:col-span-1 lg:col-span-3">
            <div className="relative flex aspect-square w-full flex-col items-start justify-start overflow-hidden rounded-sm bg-background md:aspect-video lg:aspect-square">
              <Image
                src={cards[activeCard].image}
                alt={cards[activeCard].title}
                fill
                className="object-cover transition-all duration-500"
              />
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes progressBar {
          0% {
            transform: translateX(-100%);
          }
          100% {
            transform: translateX(0%);
          }
        }
      `}</style>
    </>
  )
}
