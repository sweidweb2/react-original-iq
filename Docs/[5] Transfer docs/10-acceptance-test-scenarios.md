# 10 — Acceptance Test Scenarios

Use as rebuild parity checklist. Mark each PASS/FAIL.

## A. Auth & users

| ID | Scenario | Expected |
|----|----------|----------|
| A1 | Register new client | User created role=client, can login |
| A2 | Register with weak password | Rejected |
| A3 | Login inactive user | Rejected |
| A4 | 3+ failed logins | Progressive lockout engages |
| A5 | Password reset happy path | Password changes; old login fails |
| A6 | Admin OTP (if enabled) | Login incomplete until valid 6-digit code within 10m |
| A7 | Expired OTP | Rejected |
| A8 | Client cannot open admin routes | 403 / redirect |

## B. Task lifecycle

| ID | Scenario | Expected |
|----|----------|----------|
| B1 | Client creates task | status=pending, unpaid, price=0, coordinator auto-assigned, files stored |
| B2 | Coordinator assigns tutor | tutor set; status→in-progress |
| B3 | Assign second tutor without remove | Rejected |
| B4 | Tutor submits | status→waiting_coordinator_approval |
| B5 | Tutor cancel submit | status→in-progress |
| B6 | Coordinator approves | status→completed; tutor.nbDone +1 |
| B7 | Coordinator disapproves | status→in-progress |
| B8 | Cancel task | status→cancelled |
| B9 | Activate cancelled with tutor | →in-progress |
| B10 | Activate cancelled without tutor | →pending |
| B11 | Remove tutor while in-progress | tutor null; status→pending |
| B12 | Client deletes unpaid task | Deleted + storage cleaned |
| B13 | Client deletes task with payments | Blocked |
| B14 | Edit price after partial pay | payment_status recomputed |

## C. Revisions

| ID | Scenario | Expected |
|----|----------|----------|
| C1 | Create revision | status=in-revision; start_date set |
| C2 | Create second open revision | Blocked |
| C3 | Tutor submit revision | →waiting_coordinator_approval |
| C4 | Tutor cancel revision submit | →in-revision |
| C5 | Approve revision | →completed; submit_date set |
| C6 | Reject revision | →in-revision |
| C7 | Cancel session | →cancelled |
| C8 | Revision solutions link Solution ids only | No File ids in join table |
| C9 | Complete task with open revision | Blocked (or documented exception) |

## D. Payments & refunds

| ID | Scenario | Expected |
|----|----------|----------|
| D1 | Client pays exact remaining | Payment paid; payment_status=paid; invoice created |
| D2 | Partial pay then second pay | net accumulates; paid when net==price |
| D3 | Pay when already paid | Blocked |
| D4 | Webhook replay same tx id | Single payment row |
| D5 | Invalid webhook hash | No mutation |
| D6 | Admin manual payment | paid + invoice; gateway No Gateway |
| D7 | Price drop causing overpay | payment_status=refund_pending |
| D8 | Refund down to price | payment_status=paid |
| D9 | Refund beyond cap | Blocked |
| D10 | Invoice email failure | invoice_status=failed; PDF retained |

## E. Files & allow_view

| ID | Scenario | Expected |
|----|----------|----------|
| E1 | Client uploads allowed types | File rows + objects |
| E2 | Disallowed type / oversize | Rejected |
| E3 | Tutor downloads docs on assigned task | Success |
| E4 | Client downloads solutions with allow_view=false | Denied |
| E5 | Admin enables allow_view | Client can download |
| E6 | Delete file | DB + object gone |
| E7 | Bulk download | Valid zip of authorized files |

## F. Feedback & scoring

| ID | Scenario | Expected |
|----|----------|----------|
| F1 | Client submits feedback | Feedback row with task/client/tutor |
| F2 | Evaluate tutor metrics | Running average updated on tutor user |

## G. Marketing intake

| ID | Scenario | Expected |
|----|----------|----------|
| G1 | Create lead | Lead stored |
| G2 | Contact form | ContactMessage stored |
| G3 | Stay updated duplicate email | Rejected / unique enforced |
| G4 | Admin export leads CSV/PDF | File downloads |

## H. i18n smoke

| ID | Scenario | Expected |
|----|----------|----------|
| H1 | Switch to AR | RTL layout; strings Arabic where translated |
| H2 | Switch to EN | LTR restored |

## I. Role isolation

| ID | Scenario | Expected |
|----|----------|----------|
| I1 | Tutor cannot view unassigned task | Denied |
| I2 | Client cannot approve task | Denied |
| I3 | Coordinator cannot run global admin exports (if restricted) | Denied |
| I4 | Admin can toggle allow_view | Success |
