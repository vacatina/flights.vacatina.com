import { readdir, readFile, writeFile } from "node:fs/promises"
import { fileURLToPath } from "node:url"
import path from "node:path"

const root = fileURLToPath(new URL("../modules/holidays/", import.meta.url))
const directory = path.join(root, "content/holidays")
const content = {}

for (const filename of (await readdir(directory)).sort()) {
  if (!filename.endsWith(".md")) continue
  const markdown = await readFile(path.join(directory, filename), "utf8")
  content[filename.replace(/\.md$/, "")] = markdown
    .split(/^## /m)
    .slice(1)
    .map((block) => {
      const lineBreak = block.indexOf("\n")
      return {
        title: block.slice(0, lineBreak).trim(),
        body: block.slice(lineBreak).trim(),
      }
    })
}

await writeFile(
  path.join(root, "data/content.json"),
  JSON.stringify(content, null, 2) + "\n"
)
console.log(
  `Prepared long-form content for ${Object.keys(content).length} holidays.`
)
