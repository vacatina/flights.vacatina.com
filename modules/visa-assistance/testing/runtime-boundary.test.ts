// @vitest-environment node
import { resolve, relative } from "node:path"
import { describe, expect, it } from "vitest"
import { runtimeImportGraph, sourceFiles } from "./runtime-imports"

describe("manual visa runtime boundary", () => {
  it("keeps API and markup modules unreachable from active routes and UI exports", () => {
    const workspace = process.cwd()
    const directories = [
      "app/visa-assistance",
      "app/admin/visa-listings",
      "app/admin/visa-applications",
      "app/admin/visa-pricing",
      "app/(main)/visa-requests",
      "app/api/visa-applications",
    ]
    const roots = directories.flatMap((path) =>
      sourceFiles(resolve(workspace, path))
    )
    roots.push(resolve(workspace, "modules/visa-assistance/ui/index.ts"))
    roots.push(resolve(workspace, "app/layout.tsx"))
    roots.push(resolve(workspace, "app/(main)/layout.tsx"))
    const graph = runtimeImportGraph(roots, workspace).map((path) =>
      relative(workspace, path).replaceAll("\\", "/")
    )
    expect(graph).toContain(
      "modules/visa-assistance/catalog/server/public-catalog.ts"
    )
    expect(graph).toContain(
      "modules/visa-assistance/applications/server/application-service.ts"
    )
    expect(
      graph.filter((path) =>
        /^modules\/visa-assistance\/(server|pricing)\//.test(path)
      )
    ).toEqual([])
  })
})
