# Phase 5: Dashboard — Member Overview - Discussion Log

**Session date:** 2026-04-06
**Participants:** Admin (user), Claude
**Areas discussed:** Enhancement target, Pagination mechanism

---

## Area: Enhancement Target

**Q:** Should Phase 5 enhance the existing /dashboard/members page (add counters + new columns there), or replace the /dashboard welcome page with the member overview?

**Options presented:**
- Enhance /dashboard/members — Add counters above the existing table, change columns to 'Dias sem aparecer' + 'Nível de risco'. /dashboard stays as-is or redirects there.
- Turn /dashboard into overview — Replace the welcome placeholder with the full member overview.

**Selected:** Enhance /dashboard/members

---

## Area: Pagination Mechanism

**Q:** How should check-in history pagination work on the member detail page?

**Options presented:**
- Server-side URL params — Link to ?page=2 re-fetches via Server Component. Works without JS, consistent with no-useEffect rule. Simple and predictable.
- Client Component + router.push — Pagination buttons call router.push('?page=2'). Client Component wrapper, no useEffect fetch.

**Selected:** Server-side URL params

---

*Generated: 2026-04-06*
