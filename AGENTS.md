# Architecture

- Keep the Expo mobile app in this repository; VPS platform changes are reviewed overlays under docs, not deployments, because platform writes require separate approval.
- Read authentication, database, and web origins separately; mobile uses only the VPS public key, because cloud sessions and VPS sessions are not interchangeable.
- Keep identity proof and account issuance in existing server-side login helpers; expose bounded JSON handlers instead of calling internal server-function URLs.
- Treat VPS overlays as deployment source rather than Expo modules; exclude them from mobile type resolution and exercise their browser-safe HTTP boundary with Jest's TypeScript transformer.
- Keep account-entry presentation in a shared native selector and derive selectable contexts from actual server memberships; choosing an entry is not a permission grant.
- Home sections per role live in `src/lib/sections.ts`, mirroring the platform's NAV_BY_ROLE and permission gating; keep it in sync with the platform instead of inventing role menus.
- Shared motion rules live in `src/lib/motion.ts` and `useReducedMotion`; every animation or press scale must go through them so the system "reduce motion" setting disables it.
- Sign-in starts on `WelcomeScreen` (role cards); choosing a role opens the tabbed sign-in form and back returns to welcome — keeps the approved login design flow in one place.
- Students get a five-tab shell (`StudentShell` in App.tsx, screens in src/screens/student/); schedule, homework/tests, results and attendance read the same platform sources as the web student page (family_child, student_homework, grade_results, family_attendance_range) via `src/api/student.ts`, with display rules mirrored in `src/lib/studentData.ts`; other sections still open on the web rather than showing placeholder data.
