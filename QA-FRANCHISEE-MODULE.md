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

## Royalty (`/salon/:id`, `/royalty-approvals`)

> **Endpoint paths and response shape confirmed against FMSBE backend source directly**
> (this module predates the Postman collection). `src/lib/royaltyApi.ts` maps the
> response 1:1 — no defensive field-name fallbacks remain for the royalty-request
> shape itself.
>
> **`Salon.currentRoyaltyPercentage` is not on the wire at all** — confirmed absent
> from `SalonResponse` on every salon GET/list/create/update endpoint. The entity
> column exists (`Salon.currentRoyaltyPercentage`, `current_royalty_percentage`) but
> is only ever written internally by `RoyaltyChangeRequestService` when the Admin
> approves (the final, sequential step); nothing reads it back out via the Salon API. Rather than guess at a
> field name that provably doesn't exist, the frontend derives "current royalty %" on
> Salon Detail from the salon's own `/royalty-history`: the `newPercentage` of the most
> recently resolved `APPROVED` entry (`currentRoyaltyPercentage` memo in
> `SalonDetail.tsx`), "Not set" if there's no approved entry yet. This is correct by
> construction — the salon's real percentage only ever changes when an entry there
> resolves APPROVED — but ask backend to add the field to `SalonResponse` if a cheaper
> single-field read is ever wanted instead of pulling full history for this display.
>
> Client-side display-name resolution (below) is also still needed, since the
> royalty-request response is IDs-only.

Endpoints: `POST /royalty-requests`, `GET /salons/{salonId}/royalty-history`,
`GET /royalty-requests/pending` (**not** under `/admin/**` — it must also serve
`STATE_HEAD` callers, who are blocked from `/admin/**`), `GET /royalty-requests/{id}`,
`POST /royalty-requests/{id}/state-head-decision`, `POST /royalty-requests/{id}/admin-decision`.

**Approval model:** sequential, State-Head-first — not two independent parallel
decisions. `overallStatus` is a 4-state pipeline: `PENDING` (awaiting State Head
only) → State Head approves → `PENDING_ADMIN` (awaiting Admin only; Admin never sees
raw `PENDING` requests, and the `/royalty-requests/pending` queue is pre-filtered
server-side per role) → Admin approves → `APPROVED` (final; only here does the
salon's actual `currentRoyaltyPercentage` update — the UI never shows the new % as
live before that). A rejection at either stage closes the request as `REJECTED`
immediately and is final; Admin never acts on a request the State Head rejected. When
a State Head rejection closes the request, `adminDecision` still literally reads
`"PENDING"` on the wire even though Admin never got a turn — the UI (`SalonDetail.tsx`
history, `RoyaltyApprovals.tsx`) must omit the Admin stage entirely in that case
rather than rendering it as an outstanding decision. Acting on a request that's no
longer at the caller's stage (already decided, or not there yet) is a 409
(`isAlreadyClosedError` in `RoyaltyApprovals.tsx`).

**Display names:** the response has no `salonName`/`franchiseeName`/`requestedByName` —
IDs only. `SalonDetail.tsx` resolves franchisee names from the current firm's already-
loaded owners and resolves user ids (`requestedBy`, `*DecidedBy`) against the Officials
list (matching `Official.userId`), falling back to `User #<id>` for Admin users (who
aren't Officials). `RoyaltyApprovals.tsx` does the same but must first resolve salon →
firm per unique salon in the queue (`getSalon` then `getFirm`), since it spans multiple
salons. Worth a manual check: this means Admins reviewing many different salons will
see a burst of small requests on page load — fine for a page-sized queue (default 20),
but flag to the backend if a `salonName`/`franchiseeName` projection would be cheaper
than N+1 client-side lookups at higher volumes.

### Journey 1 — RM/CM submits a royalty change request (happy path)

1. Open a salon as the assigned RM/CM. Confirm **Current Royalty** shows either a
   percentage or "Not set" (never "0%" or blank) near the top of the page.
2. Click **Request Royalty Change**.
   - If the owning firm has exactly one owner, confirm **Franchisee** is shown
     read-only. If it has multiple owners, confirm a dropdown lists all current owners.
   - Confirm **Salon** and **Current %** are read-only and cannot be edited.
3. Enter a **New %** and a **Why** (reason); optionally fill **Instructed by**. Submit.
   - Expect: success toast, modal closes, the new request appears at the top of
     **Royalty History** with the "Awaiting State Head" pill (`overallStatus: PENDING`).
4. Log in as the salon's assigned State Head and open **Royalty Approvals**.
   - Expect: the new request appears in the queue. Log in as an Admin (`SUPER_ADMIN`/
     `CORPORATE_ADMIN`) instead and open **Royalty Approvals** — expect it does
     **not** appear there yet (Admin only sees `PENDING_ADMIN` requests).

### Journey 2 — RM/CM submits as the wrong official (403)

1. As a user who is **not** the assigned RM/CM for a given salon, open that salon and
   submit a royalty change request.
   - Expect: a clear error explaining the caller isn't the assigned Relationship/Cluster
     Manager for this salon — not a generic "request failed" message.

### Journey 3 — State Head approves

1. Log in as a State Head with a pending royalty request assigned to them. Confirm
   **Royalty Approvals** appears in the nav (and does *not* appear for a Regional
   Manager / Cluster Manager without that role).
2. Open **Royalty Approvals** — confirm the pending request shows salon, franchisee,
   current → new %, reason, instructed by, requested by, and date, with a single
   Approve/Reject action (no "other party's decision is still pending" messaging).
3. Click **Approve**.
   - Expect: success toast, the item drops out of the State Head's pending list.
   - Confirm the salon's **Current Royalty** on Salon Detail is still unchanged.
   - Confirm the request now shows the "Awaiting Admin" pill (`overallStatus:
     PENDING_ADMIN`) on Royalty History, and now appears in an **Admin's** Royalty
     Approvals queue (it did not before this step).

### Journey 4 — State Head rejects

1. From **Royalty Approvals** (as State Head), click **Reject** on a pending request.
   - Expect: a reason is required to submit (matching the Agreement-termination /
     Firm-owner-removal reason-modal pattern) — the Reject button stays disabled until
     text is entered.
2. Submit with a reason.
   - Expect: info toast, item drops out of the pending list, and Royalty History shows
     overall status "Rejected" with the State Head's reason visible.
   - Confirm the detail/history view shows **no Admin stage at all** for this request
     (not an "Admin: Pending" row) — Admin never got a turn.
   - Confirm the request never appears in any Admin's Royalty Approvals queue.

### Journey 5 — Admin approves / rejects

1. Take a request that's already `PENDING_ADMIN` (State Head approved it in Journey 3).
   Log in as a `SUPER_ADMIN` or `CORPORATE_ADMIN` user and open **Royalty Approvals**.
   - Expect: the request appears with a single Approve/Reject action; the app calls
     the admin-decision endpoint (verify via network tab).
2. Click **Approve**.
   - Expect: success toast, `overallStatus` becomes `APPROVED`, and — only at this
     step — the salon's **Current Royalty** on Salon Detail updates to the new
     percentage.
3. Repeat with a different `PENDING_ADMIN` request and click **Reject** (reason
   required) instead.
   - Expect: info toast, `overallStatus` becomes `REJECTED`, salon percentage
     unchanged, Admin's reason visible in history alongside the State Head's earlier
     approval.

### Journey 6 — Wrong-stage actions are rejected with a clear message

1. As an Admin, confirm a raw `PENDING` request (State Head hasn't acted yet) never
   appears in the Admin's Royalty Approvals queue at all — there is no way to reach
   it from that screen.
2. Get a `PENDING_ADMIN` request. Have the Admin approve/reject it, then — before
   refreshing another Admin's still-stale queue — attempt to decide the same request
   again from that stale queue (or retry the same decision twice quickly).
   - Expect: HTTP 409 surfaces as "This request is no longer awaiting your decision,"
     not a generic failure and not "resolved by the other approver."
3. Confirm neither screen ever shows both a State Head action and an Admin action as
   simultaneously available on the same request — only one decision-maker is ever
   active at a time.

### Journey 7 — History shows a mix of resolved requests, with resolved names

1. On a salon with several past royalty requests in different end states (approved,
   rejected, still pending), confirm **Royalty History** lists all of them, newest
   first, and does **not** hide rejected ones.
2. Confirm each history row shows old % → new %, the overall status pill (using the
   friendly label — "Awaiting State Head" / "Awaiting Admin" / "Approved" /
   "Rejected", not the raw enum), the franchisee's resolved name (not just an id),
   requested-by resolved to a name where the requester is a known Official, and the
   decision sequence rendered as a timeline (submitted → State Head decision →
   Admin decision only if the State Head approved) with each stage's reason and the
   deciding user's resolved name — never a placeholder "Admin: Pending" row for a
   request the State Head rejected.

### Journey 8 — Current Royalty derived from history, not SalonResponse

1. On a salon with **no** approved royalty request yet, confirm **Current Royalty**
   and the request modal's read-only **Current %** both show "Not set".
2. Get one request through to `overallStatus === 'APPROVED'` (State Head approves,
   then Admin approves). Reload Salon Detail.
   - Expect: **Current Royalty** now shows that request's `newPercentage`, sourced
     from Royalty History, not from any field on the Salon record itself.
3. Submit and approve a second, different percentage afterward.
   - Expect: **Current Royalty** updates to the newer approved value (most recently
     resolved wins, not just "any approved entry").

### Known gaps to verify / flag back to backend

- Consider asking backend to add `currentRoyaltyPercentage` to `SalonResponse`
  (the entity field already exists — see the note above) if a single-field read ever
  matters more than deriving it from `/royalty-history` on every Salon Detail load.
- Display-name resolution is entirely client-side (see above) since the response is
  IDs-only — an Admin user's name will always show as `User #<id>` (Admins aren't in
  the Officials list); confirm that's an acceptable gap or ask backend for a
  name-inclusive projection if it's not.
- `RoyaltyApprovals.tsx`'s per-salon `getSalon`→`getFirm` lookups are N+1 against the
  pending-queue page size — fine at a page size of 20, worth flagging if that page size
  grows materially.

## Franchisee Detail — PAN / Address field-name fix (`/franchisee/:id`)

> Confirmed live against `GET /api/v1/franchisees/{id}`: the response field is `pan`
> (the adapter was reading a nonexistent `panNumber`) and `address` is a single flat
> string (the adapter was reading nonexistent `addressLine1`/`addressLine2`/`city`/
> `state`/`pincode`). Fixed in `adaptFranchisee` (`src/lib/api.ts`), the `Franchisee`
> type (`src/types/index.ts`), and the Address `InfoRow` in `FranchiseeDetail.tsx`.
> There is no full Aadhaar on the wire, only `aadhaarLast4` — not currently displayed
> anywhere; don't add a full-Aadhaar field if asked to show it later, only the last 4.

1. Open a franchisee record known to have both PAN and address saved.
   - Expect: the **PAN** row shows the actual PAN (previously always showed "—" or
     blank because the adapter read the wrong key), and **Address** shows the single
     saved address string.
2. Open a franchisee record with no PAN/address saved.
   - Expect: both rows show "—", not an empty string or "undefined".

## My Salons (`/my-salons`, `/my-salons/:id`) — RM / CM / State Head

> New endpoints, confirmed live: `GET /api/v1/officials/me/salons` and
> `GET /api/v1/officials/me/salons/{salonId}`. Response is a **deliberately different,
> smaller, owner-redacted shape** (`SalonForOfficial` in `src/types/index.ts`) than the
> `Salon` type used by `/admin/salons/*` and `/salons/*` — nested `firm`/`owners`
> instead of raw `*HeadId` fields, and `owners[]` carries only `fullName`/`isPrimary`.
> **No PAN, Aadhaar, DOB, address, or contact for the owner exists on this endpoint by
> design** — don't add those fields to `SalonForOfficial` or try to backfill them from
> another endpoint; that's a product decision to raise with backend, not a frontend fix.

Nav item **My Salons** is visible only to `REGIONAL_MANAGER`, `CLUSTER_MANAGER`,
`STATE_HEAD` roles (same role-filtering mechanism as Royalty Approvals in
`AppLayout.tsx`).

1. Log in as an RM/CM/State Head who is linked to an `Official` record with at least
   one assigned salon. Confirm **My Salons** appears in the nav (and does not appear
   for a plain Admin without one of those three roles).
2. Open **My Salons** — confirm it lists only salons assigned to this user (matched on
   their own `officialType`'s head-id field), each showing salon name, firm, district/
   state, current royalty %, and operational status.
3. Click into one salon — confirm the detail view shows salon details plus firm name
   and owner names (with a Primary tag), and confirms **no** PAN/Aadhaar/DOB/address/
   contact is rendered anywhere from the owners list.
4. Log in as a user with **no** Official record at all (e.g. a plain Admin who somehow
   has this nav item, or hit the endpoint directly).
   - Expect: an empty "No assigned salons" state, not an error — the backend returns
     `[]`, not a failure, for a caller with no Official link.
5. As an official assigned to at least one salon, manually navigate to
   `/my-salons/{someOtherSalonId}` for a salon you're confirmed NOT assigned to.
   - Expect: a clear "Not your assigned salon" state (403), not a crash or a silent
     wrong-salon render.
