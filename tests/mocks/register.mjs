// Node loader hook — intercepts "server-only" and returns an empty module.
// Usage: node --import ./tests/mocks/register.mjs ...
import { register } from "node:module";

register(new URL("./loader.mjs", import.meta.url));
