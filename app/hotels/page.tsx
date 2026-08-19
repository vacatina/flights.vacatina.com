import { HotelSearch } from "@/modules/hotels/search/ui/hotel-search"

export default function HotelsPage() {
  return (
    <div className="container mx-auto p-4 md:p-8">
      <div className="max-w-4xl mx-auto space-y-8">
        <div className="text-center space-y-4">
          <h1 className="text-4xl font-bold tracking-tight">Find Your Perfect Stay</h1>
          <p className="text-lg text-slate-500">Search thousands of hotels and book with ease.</p>
        </div>
        <HotelSearch />
      </div>
    </div>
  )
}
