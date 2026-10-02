import content from "../data/content.json"

export type ContentSection = { title: string; body: string }

export function getHolidayContent(slug: string): ContentSection[] {
  return (content as Record<string, ContentSection[]>)[slug] ?? []
}

export function splitSubsections(body: string): ContentSection[] {
  return body
    .split(/^### /m)
    .slice(1)
    .map((section) => {
      const lineBreak = section.indexOf("\n")
      return {
        title: section.slice(0, lineBreak).trim(),
        body: section.slice(lineBreak).trim(),
      }
    })
}
