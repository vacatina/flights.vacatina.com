import { Fragment } from "react"

function InlineText({ text }: { text: string }) {
  return text
    .split(/(\*\*.*?\*\*)/g)
    .map((part, index) =>
      part.startsWith("**") ? (
        <strong key={index}>{part.slice(2, -2)}</strong>
      ) : (
        <Fragment key={index}>{part}</Fragment>
      )
    )
}

/** Renders the seed's paragraph, list, heading and emphasis subset without raw HTML. */
export function HolidayRichText({ body }: { body: string }) {
  return (
    <div className="flex flex-col gap-4 text-sm leading-relaxed text-muted-foreground md:text-base">
      {body
        .split(/\n\s*\n/)
        .filter(Boolean)
        .map((block, index) => {
          if (block.startsWith("### "))
            return (
              <h3
                key={index}
                className="font-heading text-lg font-medium text-foreground"
              >
                {block.slice(4)}
              </h3>
            )
          if (block.startsWith("- "))
            return (
              <ul key={index} className="flex list-disc flex-col gap-1 pl-5">
                {block.split("\n").map((line, item) => (
                  <li key={item}>
                    <InlineText text={line.replace(/^- /, "")} />
                  </li>
                ))}
              </ul>
            )
          return (
            <p key={index}>
              <InlineText text={block} />
            </p>
          )
        })}
    </div>
  )
}
