import { existsSync, readFileSync, readdirSync } from "node:fs"
import { dirname, join, resolve } from "node:path"
import ts from "typescript"

export function sourceFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name)
    if (entry.isDirectory()) return sourceFiles(path)
    return /\.tsx?$/.test(path) && !/\.test\./.test(path) ? [path] : []
  })
}

function runtimeSpecifiers(path: string) {
  const source = ts.createSourceFile(
    path,
    readFileSync(path, "utf8"),
    ts.ScriptTarget.Latest,
    true
  )
  const imports: string[] = []
  const visit = (node: ts.Node) => {
    if (ts.isImportDeclaration(node)) {
      const clause = node.importClause
      const bindings = clause?.namedBindings
      const onlyTypes =
        clause?.isTypeOnly ||
        (!clause?.name &&
          bindings &&
          ts.isNamedImports(bindings) &&
          bindings.elements.length > 0 &&
          bindings.elements.every((item) => item.isTypeOnly))
      if (!onlyTypes && ts.isStringLiteral(node.moduleSpecifier)) {
        imports.push(node.moduleSpecifier.text)
      }
    } else if (ts.isExportDeclaration(node) && node.moduleSpecifier) {
      const onlyTypes =
        node.isTypeOnly ||
        (node.exportClause &&
          ts.isNamedExports(node.exportClause) &&
          node.exportClause.elements.length > 0 &&
          node.exportClause.elements.every((item) => item.isTypeOnly))
      if (!onlyTypes && ts.isStringLiteral(node.moduleSpecifier)) {
        imports.push(node.moduleSpecifier.text)
      }
    } else if (ts.isCallExpression(node)) {
      const dynamicImport = node.expression.kind === ts.SyntaxKind.ImportKeyword
      const requireCall =
        ts.isIdentifier(node.expression) && node.expression.text === "require"
      const argument = node.arguments[0]
      if (
        (dynamicImport || requireCall) &&
        argument &&
        ts.isStringLiteral(argument)
      ) {
        imports.push(argument.text)
      }
    }
    ts.forEachChild(node, visit)
  }
  visit(source)
  return imports
}

export function runtimeImportGraph(roots: string[], workspace: string) {
  const visited = new Set<string>()
  const visit = (path: string) => {
    if (visited.has(path)) return
    visited.add(path)
    for (const specifier of runtimeSpecifiers(path)) {
      const base = specifier.startsWith("@/")
        ? resolve(workspace, specifier.slice(2))
        : specifier.startsWith(".")
          ? resolve(dirname(path), specifier)
          : null
      if (!base) continue
      const dependency = [
        base,
        base + ".ts",
        base + ".tsx",
        join(base, "index.ts"),
        join(base, "index.tsx"),
      ].find((candidate) => /\.tsx?$/.test(candidate) && existsSync(candidate))
      if (dependency) visit(dependency)
    }
  }
  roots.forEach(visit)
  return [...visited]
}
