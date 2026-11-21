// Custom ESM loader: stubs out "server-only" and resolves @/ path aliases.
import { createRequire } from "node:module";
import { fileURLToPath, pathToFileURL } from "node:url";
import { resolve as resolvePath } from "node:path";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const root = resolvePath(__dirname, "../../");

export async function resolve(specifier, context, nextResolve) {
  if (specifier === "server-only") {
    return { shortCircuit: true, url: "data:text/javascript,export {}" };
  }
  // Resolve @/ path aliases to src/
  if (specifier.startsWith("@/")) {
    const rel = specifier.slice(2); // strip "@/"
    const abs = resolvePath(root, "src", rel);
    // Try .ts extension first, then as-is
    const url = pathToFileURL(abs + ".ts").href;
    return nextResolve(url, context);
  }
  return nextResolve(specifier, context);
}

export async function load(url, context, nextLoad) {
  if (url === "data:text/javascript,export {}") {
    return { shortCircuit: true, format: "module", source: "export {}" };
  }
  return nextLoad(url, context);
}
