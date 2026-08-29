# QA — Franchisee Module

> **Response shapes not verified live.** This pass integrated against
> `docs/FMSBE_postman_collection.json`, which is the confirmed source of truth for
> every request URL/method/body below. It does **not** document response shapes —
> those were implemented defensively (multiple fallback field names, graceful `—`
> display) rather than guessed at as exact. Run each journey below against a live
> backend and fix any adapter in `src/lib/*Api.ts` whose fallback guess turns out
> wrong (search for the endpoint's name in that file — each has a comment noting
> what's confirmed vs. assumed).

## Add Franchisee wizard (`/admin/franchisees/new`)

Endpoints: `POST /admin/franchisees`, `POST /admin/firms`, `POST /admin/salons`,
`GET /admin/franchisees/{id}/completion`, `POST /documents`. Request shapes are
confirmed against the Postman collection; response shapes fall back to the
submitted input for any field the response omits.

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

---

## Officials CRUD (`/officials`)

Endpoints: `GET/POST /admin/officials`, `GET/PATCH/DELETE /admin/officials/{id}`,
`POST /admin/officials/{id}/link-user`.

1. Open **Officials** from the sidebar. Confirm the table loads (empty state if none
   exist yet) with columns Name, Type, Region, Contact, Linked User.
2. Click **Add Official**, fill Type (Cluster Manager / Regional Manager / State
   Head), Name, Contact; leave Email/Region blank. Save.
   - Expect: success toast, new row appears, "Linked User" shows "Not linked".
3. Click **Link User** on that row, enter a numeric User ID, confirm.
   - Expect: success toast, row now shows "Linked (User #N)" and the Link User
     action disappears (link is one-directional per the API — no unlink endpoint).
4. Click the edit (pencil) icon, change Region, save.
   - Expect: success toast, row reflects the new region.
5. Filter by Type and by Region (text field) — confirm the list narrows to matches
   for each filter independently and in combination.
6. **Delete-blocked case**: attempt to delete an official currently referenced by a
   salon's Cluster/Regional/State Head field (see Salon Officials assignment below).
   - Expect: a 409 is caught and the modal shows the specific salon count blocking
     deletion (e.g. "assigned to 2 salons"), not a generic failure message. The
     Delete button stays disabled until you close and retry after reassigning.
7. Delete an official with no salon assignments.
   - Expect: success toast, row removed from the table.

## Multi-owner Firm (Company) management (`/firms`, `/firm/:id`)

Endpoints: `GET /admin/firms`, `GET/PATCH /firms/{id}`, `POST /admin/firms` (create,
with `owners[]`), `POST /firms/{id}/owners`, `DELETE /firms/{id}/owners/{franchiseeId}`,
`POST /firms/{id}/owners/{franchiseeId}/make-primary`.

1. Open **Companies** from the sidebar — confirm the directory loads all firms with
   Legal Name, Type, GST, Primary Owner, Owner count, Salon count columns, and that
   search + company-type filter both narrow the list.
2. Open a firm's detail page. Confirm the **Owners** card lists every owner with
   exactly one showing the "Primary" star badge.
3. Click **Add Owner**, pick a franchisee not already an owner, optionally check
   "Make this the primary owner", give a reason, confirm.
   - Expect: success toast, new owner appears in the list; if marked primary, the
     star badge moves to them and the previous primary loses it.
4. Click **Make Primary** on a non-primary owner, give a reason, confirm.
   - Expect: success toast, the star badge moves to that owner.
5. Click **Remove** on a non-primary owner, give a reason, confirm.
   - Expect: success toast, owner disappears from the list.
6. **Blocked-removal case**: attempt to remove the current primary owner while at
   least one other owner remains.
   - Expect: the request's 409 is caught and a specific message is shown — "make
     another owner Primary first, then remove this one" — not a generic error.
7. In the **Add Franchisee** wizard's Business step, select two or more owners and
   confirm the Primary radio only allows one selection at a time, and that the
   created firm's `owners` array in the request carries `isPrimary: true` for
   exactly the one selected (verify via network inspector against
   `POST /admin/firms`).

## Salon Officials assignment (`/salon/:id`, Add Franchisee wizard Step 3)

Endpoints: salons carry `clusterHeadId`/`regionalHeadId`/`stateHeadId` referencing
`GET /admin/officials`.

1. In the Add Franchisee wizard's Salon step, confirm Cluster Head / Regional Head /
   State Head are searchable dropdowns sourced from the Officials directory, each
   filtered to the matching `officialType` (a Regional Manager cannot be picked as
   Cluster Head).
2. Save a salon with all three assigned. Open the resulting Salon Detail page and
   confirm the "Officials Assigned" card resolves each id to the official's name
   (not just the raw id).
3. With no officials created yet, confirm the dropdowns show as empty (not broken)
   and the salon can still be saved with those fields blank.

## Agreement lifecycle (`/salon/:id`)

Endpoints: `POST/GET /admin/salons/{salonId}/agreements`, `PATCH /admin/agreements/{id}`,
`POST /admin/agreements/{id}/renew`, `POST /admin/agreements/{id}/terminate`.

1. Open a salon with no agreement yet — confirm the placeholder is gone and instead
   an empty state with a **Create Agreement** button is shown.
2. Create an agreement with Valid From, Valid Till, Contract Year, Renewal Year,
   Royalty Terms.
   - Expect: success toast, the agreement now shows as "Current Agreement" with all
     fields displayed and a status badge.
3. Click **Edit** — confirm Valid Till is shown read-only (or absent) since the
   backend's update DTO intentionally excludes it; edit Contract Year/Royalty Terms
   and save.
   - Expect: success toast, current agreement reflects the change; Valid Till
     unchanged.
4. Click **Renew** (not Edit) with a new Valid From/Valid Till range.
   - Expect: success toast noting the previous agreement is now superseded; the new
     record becomes "Current Agreement"; the old one appears collapsed under
     "Agreement History" with a non-ACTIVE status badge.
5. Expand **Agreement History** — confirm every superseded agreement is listed with
   its date range, collapsed by default.
6. Click **Terminate** on the current agreement, provide a reason, confirm.
   - Expect: info toast, agreement status updates to reflect termination.
7. Confirm no action lets you change Valid Till without going through Renew.
