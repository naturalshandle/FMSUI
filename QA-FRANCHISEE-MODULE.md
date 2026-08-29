# QA — Franchisee Module

## Add Franchisee wizard (`/admin/franchisees/new`)

> **Backend contract not verified.** No backend repository was available in this
> environment, so the endpoints below (`POST /admin/franchisees`, `POST /admin/firms`,
> `POST /admin/firms/{firmId}/salons`, `GET /admin/franchisees/{id}/completion`,
> `POST /documents`) and their request/response field names are best guesses taken
> from the feature prompt, not confirmed DTOs. Reconcile against real backend source
> before treating this journey as verified end-to-end. Also note: no `FileUpload`
/ `POST /documents` pattern existed anywhere in this codebase prior to this change —
> a new `FileUpload` component was built for it.

### Journey 1 — Single owner, single business, single salon (happy path)

1. From Admin Home, click **Add Franchisee** (also reachable from the sidebar nav).
2. **Step 1 — Franchisee Details**: fill Full Name, Contact, PAN (required fields);
   leave optional fields blank. Click **Save Owner**.
   - Expect: success toast, the owner appears under "What I've added so far", the
     step's summary tile shows a checkmark, "Continue to Business" becomes enabled.
3. Click **Continue to Business**.
4. **Step 2 — Business Details**: fill Legal Name and Company Type. In the owner
   selector, check the one owner created in Step 1 — it should auto-become Primary.
   Click **Save Business**.
   - Expect: success toast, business appears in the summary panel, "Continue to
     Salons" becomes enabled.
5. Click **Continue to Salons**.
6. **Step 3 — Salon Details**: since only one business exists, no business selector
   is shown. Fill Salon Name (required). Leave the "Add agreement details" section
   collapsed. Click **Save Salon**.
   - Expect: success toast, salon appears in the summary panel, "Finish" becomes
     enabled.
7. Click **Finish**.
   - Expect: success screen showing "1 Owner(s), 1 Business(es), 1 Salon(s)", the
     completion percentage (if the completion endpoint responded), and a **View
     Franchisee Record** button.
8. Click **View Franchisee Record**.
   - Expect: navigation to `/franchisee/{id}` and the record loads without a 404 /
     "not found" empty state.

### Journey 2 — Multi-owner firm: exactly one Primary badge

1. Complete Step 1 for **Owner A**, click **Add Another Owner** (not Continue).
2. Complete Step 1 again for **Owner B**. Both owners should now be listed under
   "What I've added so far" in the summary panel.
3. Continue to Step 2. In the owner selector, check **both** Owner A and Owner B.
   - Expect: a Primary radio option appears next to each checked owner; only one
     can be selected at a time.
4. Select Owner B as Primary. Attempt to submit with neither selected as primary
   first (uncheck B, leave none selected) — expect a validation error blocking
   submit ("Mark exactly one selected owner as Primary").
5. Re-select Owner B as Primary and click **Save Business**.
   - Expect: success toast, business created with both owners linked.
6. Finish the wizard (add a salon under Step 3 first) and open the resulting
   Franchisee Detail view.
   - **Expect: all owners for the firm display correctly, and exactly one — Owner
     B — shows the "Primary" badge.** (This assertion targets the Detail View
     redesign's Franchisee Owner(s) section; if that section hasn't shipped yet,
     confirm instead that the wizard's own summary panel and the "Finish" screen
     counts reflect both owners under one business.)

### Journey 3 — Multiple businesses, multiple salons

1. Add one owner (Step 1).
2. Add **Business 1** (Step 2), then click **Add Another Business** and add
   **Business 2** — both should appear in the summary panel, and the owner
   selector should still offer the same owner(s) for each.
3. Continue to Step 3. Because more than one business exists, a **Business**
   selector should appear — confirm it lists both businesses.
4. Add a salon under Business 1, click **Add Another Salon**, switch the business
   selector to Business 2, and add a second salon.
   - Expect: both salons appear in the summary panel, each correctly associated
     with its business (spot-check via the eventual Firm/Salon detail views).
5. Finish and confirm the summary screen reads "1 Owner(s), 2 Business(es),
   2 Salon(s)".

### Journey 4 — Optional documents and agreement details

1. On Step 1, attach a file to "PAN / Aadhaar proof" before saving the owner.
   - Expect: the owner still saves even if the document upload fails in the
     background (error toast for the upload failure only, not blocking the step).
2. On Step 2, leave the GST certificate upload empty — confirm the business still
   saves with no error (the control is clearly labeled optional).
3. On Step 3, expand **"+ Add agreement details (optional)"**, fill in Valid From
   and Royalty Terms only (leave the rest blank), attach an Agreement PDF, and
   save the salon.
   - Expect: the salon saves; the agreement sub-object is only sent because at
     least one agreement field was filled in.
4. Repeat with the agreement section left collapsed entirely.
   - Expect: the salon saves with no agreement data sent.

### Journey 5 — Completion meter behavior

1. Before any owner is saved, confirm no completion percentage is shown (the
   endpoint requires a franchisee id, which doesn't exist yet).
2. After the first owner save, confirm a completion ring appears in the summary
   panel and updates after each subsequent save (business, salon).
3. If the completion endpoint call fails (e.g. backend down), confirm the wizard
   does not block or show an error — the ring simply stays hidden/stale, since
   completion is explicitly a nice-to-have indicator, not a blocking dependency.

### Known gaps / explicitly out of scope for this pass

- The "Agreement details" section on the Franchisee Detail view redesign is a
  separate, not-yet-built piece — the Agreements backend module has no
  service/controller yet per the prompt. This QA doc's Journey 2 note above
  reflects that dependency.
- The Directory/search screen does not exist yet; the only way back to a record
  created via this wizard is the **View Franchisee Record** link on the Finish
  screen, or navigating there directly by URL.
