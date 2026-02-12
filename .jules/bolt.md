## 2025-02-12 - [Route-Based Code Splitting]
**Learning:** Static imports in `App.tsx` were bundling all 15+ page components into a single chunk, causing unnecessary download for users visiting simple routes like Landing or Login.
**Action:** Implemented `React.lazy` and `Suspense` for all top-level routes. Reduced main bundle size by ~48% (from 500kB to 260kB). Always verify bundle analysis for large React apps.
