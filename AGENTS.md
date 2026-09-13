# RMS Pro repository instructions

- Never read, print, or transfer the complete reconstructed v405 source in one tool call.
- Use `rg` to locate symbols and inspect only the ranges needed for the current task.
- Treat `fix/tech-cards-v405-preview` commit `195e87bf` as the verified v405 Preview baseline.
- Perform modularization only on `refactor/modularize-v405`, one extraction stage and one commit at a time.
- Preserve behavior, design, Supabase calls, RLS assumptions, permissions, and business calculations during extraction.
- Run `npm run build` and inspect the staged diff before every commit.
- Never modify `main`, promote a deployment, or touch Production without explicit user approval.
- Follow `docs/RMS_MODULARIZATION_PLAN.md` for extraction order and regression gates.
