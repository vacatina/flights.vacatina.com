"use client"

import * as React from "react"
import { useState } from "react"
import { searchHotelDestinationsAction, submitHotelSearchAction } from "@/modules/hotels/search/server/actions"
import type { HotelPlaceSuggestion } from "@/modules/hotels/search/server/places"

export function HotelSearch() {
  const [query, setQuery] = useState("")
  const [suggestions, setSuggestions] = useState<HotelPlaceSuggestion[]>([])
  const [selectedDestination, setSelectedDestination] = useState<HotelPlaceSuggestion | null>(null)
  
  const [checkIn, setCheckIn] = useState("")
  const [checkOut, setCheckOut] = useState("")
  const [adults, setAdults] = useState(2)

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedDestination) return

    const result = await submitHotelSearchAction({
      destinationId: selectedDestination.id,
      destinationName: selectedDestination.name,
      checkInDate: checkIn,
      checkOutDate: checkOut,
      guests: {
        adults,
        children: 0,
      },
      rooms: 1
    })

    if (result.ok) {
      console.log("Hotel search command:", result.data.command)
      // window.location.href = `/hotels/results?cityId=${result.data.command.cityId}...`
    } else {
      console.error("Search failed:", result.error)
    }
  }

  return (
    <div className="p-4 bg-white rounded-lg shadow-sm border border-slate-200">
      <h2 className="text-xl font-semibold mb-4">Search Hotels</h2>
      <form onSubmit={handleSearch} className="flex flex-col gap-4">
        <div>
          <label className="block text-sm font-medium mb-1">Destination</label>
          <input 
            type="text" 
            value={query}
            onChange={async (e) => {
              setQuery(e.target.value)
              if (e.target.value.length > 2) {
                const res = await searchHotelDestinationsAction({ query: e.target.value })
                if (res.ok) setSuggestions(res.data)
              }
            }}
            placeholder="City or Hotel Name"
            className="w-full p-2 border rounded"
          />
          {suggestions.length > 0 && !selectedDestination && (
            <ul className="mt-2 border rounded shadow-sm">
              {suggestions.map(s => (
                <li 
                  key={s.id} 
                  className="p-2 hover:bg-slate-50 cursor-pointer"
                  onClick={() => {
                    setSelectedDestination(s)
                    setQuery(s.name)
                    setSuggestions([])
                  }}
                >
                  {s.name} ({s.countryCode})
                </li>
              ))}
            </ul>
          )}
        </div>
        
        <div className="flex gap-4">
          <div className="flex-1">
            <label className="block text-sm font-medium mb-1">Check-in</label>
            <input type="date" value={checkIn} onChange={e => setCheckIn(e.target.value)} className="w-full p-2 border rounded" />
          </div>
          <div className="flex-1">
            <label className="block text-sm font-medium mb-1">Check-out</label>
            <input type="date" value={checkOut} onChange={e => setCheckOut(e.target.value)} className="w-full p-2 border rounded" />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Adults</label>
          <input type="number" min="1" value={adults} onChange={e => setAdults(Number(e.target.value))} className="w-full p-2 border rounded" />
        </div>

        <button type="submit" className="bg-blue-600 text-white p-2 rounded font-medium hover:bg-blue-700">
          Search
        </button>
      </form>
    </div>
  )
}
