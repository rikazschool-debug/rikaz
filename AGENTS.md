# Architecture

- Keep the Expo mobile app in this repository; VPS platform changes are reviewed overlays under docs, not deployments, because platform writes require separate approval.
- Read authentication, database, and web origins separately; mobile uses only the VPS public key, because cloud sessions and VPS sessions are not interchangeable.
- Keep identity proof and account issuance in existing server-side login helpers; expose bounded JSON handlers instead of calling internal server-function URLs.
- Treat VPS overlays as deployment source rather than Expo modules; exclude them from mobile type resolution and exercise their browser-safe HTTP boundary with Jest's TypeScript transformer.
