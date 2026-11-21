// Mock for the `server-only` package — throws in non-Next.js environments.
// This loader registers a module that does nothing, satisfying the import
// without throwing "This module cannot be imported from a Client Component".
export {};
