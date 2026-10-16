# 18 — Form Validation Catalog

Field-level rules from controllers. **No Form Request classes** in the old app — all inline. Use as the validation source for the new stack.

Tighten where notes say “no validate” (add rules in rebuild).

---

## Auth

### Login — `UnifiedAuthController@showlogin`
| Field | Rules |
|-------|-------|
| email | required, email |
| password | required |

### Register — `showregister`
| Field | Rules |
|-------|-------|
| name | required, string, max:255 |
| email | required, email, max:255, unique:users |
| password | required, min:8, confirmed |
| terms | required, accepted |

### OTP verify — `verifyCode`
| Field | Rules |
|-------|-------|
| verification_code | required, string, size:6 |

### Password reset request — `PasswordResetLinkController@store`
| Field | Rules |
|-------|-------|
| email | required, email, exists:users,email |

### Password reset verify
| Field | Rules |
|-------|-------|
| verification_code | required, string, size:6 |

### Password reset update
| Field | Rules |
|-------|-------|
| password | required, string, min:8, confirmed |

---

## Public marketing

### Lead (popup) — `LeadController@createLead`
| Field | Rules |
|-------|-------|
| firstname | required, string, max:255 |
| lastname | required, string, max:255 |
| phone | required, string, max:255 |
| country | required, string, max:255 |
| zipcode | required, string, max:255 |
| email | nullable, email, max:255 |

### Lead (home) — `PublicController@createLeadHome`
| Field | Rules |
|-------|-------|
| phone | required, string, max:255 |
| country | required, string, max:255 |
| zipcode | required, string, max:255 |

### Stay updated — `stayUpdated` / `createStayUpdated`
| Field | Rules |
|-------|-------|
| email | required, email, unique:stay_updated,email |

### Contact — `contactMessage`
| Field | Rules |
|-------|-------|
| name | required, max:255 |
| email | required, email, **unique:contact_messages,email** *(odd — rebuild: drop unique)* |
| subject | required, max:255 |
| message | required, max:255 |

### Contact — `sendContactMessage`
| Field | Rules |
|-------|-------|
| name | required, max:255 |
| email | required, email |
| subject | required, max:255 |
| message | required, max:255 |

### Chatbot — `ChatbotController@sendMessage`
| Field | Rules |
|-------|-------|
| message | **no validate** — add required, string, max:2000 |

---

## Client

### Send task request — `sendTaskRequest`
| Field | Rules |
|-------|-------|
| topic | required, max:255 |
| type | required, in: assignment, tutoring, research, editing |
| category | required |
| desc | required |
| deadline | required, date, after:now |
| files | optional files; **manual** total size ≤ 10MB on create path |

### Update task — `updateTask`
Same as create for topic/type/category/desc/deadline.

### Submit feedback — `submitFeedback`
| Field | Rules |
|-------|-------|
| task_id, rating, comments, suggestions | **no validate** — add: task_id exists; rating integer 1–5; comments nullable string |

### Change password — `changePassword`
| Field | Rules |
|-------|-------|
| current_password | required |
| new_password | required, min:8, confirmed |

### Pay for task — `MontyPayController@clientPay`
| Field | Rules |
|-------|-------|
| amount | required, numeric, min:0.01 |
| currency | required, max:3 |

### Profile personal info — `updateProfilePersonalInformation`
| Field | Rules |
|-------|-------|
| name | required, max:255 |
| email | required, email |
| phone | updated without strict rule — add nullable, max:20 |

### Profile password — `updateProfilePassword`
| Field | Rules |
|-------|-------|
| password | required, min:8, confirmed |

---

## Tutor

### Submit / cancel task / revision
**No request body validation** — path id + status checks only.  
Rebuild: ensure actor owns assignment; optional confirm flag.

---

## Coordinator / Admin — tasks & revisions

### Create task — `createTask`
**No validate** — raw assign of client_id, tutor_id, coordinator_id, topic, type, desc, status, deadline, price, payment_status, category.  
**Rebuild:** mirror client create rules + optional tutor/price/status.

### Update task details — `updateTaskDetails` (when validated)
| Field | Rules |
|-------|-------|
| topic | string, max:255 |
| type | in: assignment, tutoring, research, editing |
| category | max:100 |
| deadline | nullable, date |
| desc | nullable, string |
| status | in: pending, in-progress, waiting_coordinator_approval, completed, cancelled |
| client_id / tutor_id / coordinator_id | nullable, exists:users,id |
| price | nullable, numeric, min:0 |
| payment_status | in: unpaid, pending, paid, refunded *(normalize to unpaid/paid/refund_pending)* |
| feedback | nullable, string |

### Edit price — `editPrice`
| Field | Rules |
|-------|-------|
| price | required, numeric, min:0 |

### Create revision — `createRevisionSession`
| Field | Rules |
|-------|-------|
| task_id | required, exists:tasks,id |
| title | required, string, max:255 |
| description | nullable, string, max:65535 |

### Update revision — `updateRevisionSession`
| Field | Rules |
|-------|-------|
| title | nullable, max:255 |
| start_date, deadline | nullable, date |
| status | nullable, in: in-revision, completed, cancelled |
| description | nullable, max:65535 |

### Evaluate tutor — `evaluateTutor`
**No validate** — punctuality, quality, perfection, avgratingstar.  
**Rebuild:** required numeric 0–5 (or 1–5).

### Admin/coord refund pay — `adminPayRefund`
| Field | Rules |
|-------|-------|
| amount | numeric, min:0.01 |
| currency | max:3 |
| refund_reason | required, max:255 |

---

## Admin — users & money

### Change permissions — `changeUserPermissions`
| Field | Rules |
|-------|-------|
| user_id | required, exists:users,id |
| new_role | required, in: admin, coordinator, tutor, client |

### Add coordinator — `AddCoordinator`
| Field | Rules |
|-------|-------|
| name | required |
| email | required, unique:users |
| password | required, min:8, confirmed |
| phone | max:20 |
| start_date | date |

### Add tutor — `AddTutor`
Same as coordinator (specializations may be on update, not create).

### Add client — `AddClient`
| Field | Rules |
|-------|-------|
| name, email, password, phone | as above (no start_date) |

### Update user (admin) — `updateUser`
| Field | Rules |
|-------|-------|
| name | required |
| email | required, unique except self |
| phone | nullable |
| password | optional, confirmed |
| specializations | for tutors: array min:1 (enum subjects in code) |

### Update user (common manage profile) — `CommonController@updateUser`
| Field | Rules |
|-------|-------|
| name | required |
| email | required, unique except self |
| phone | nullable, max:20 |
| is_active | nullable, boolean |
| password | optional, min:8 |
| tutor metrics | nbDone, punctuality, quality, perfection, avgratingstar |

### Custom email — `sendCustomEmail`
| Field | Rules |
|-------|-------|
| recipient_email | required, email |
| subject | required, max:255 |
| message | required, string |

### Manual create payment — `createPayment`
| Field | Rules |
|-------|-------|
| task_id | exists:tasks |
| user_id | exists:users |
| amount | numeric, min:0 (+ ≤2 decimal places check) |
| currency | max:3 |
| payment_method | max:255 |

### Manual create refund — `createRefund`
| Field | Rules |
|-------|-------|
| task_id | required |
| amount | numeric (+ 2 decimals) |
| currency | |
| payment_method | |
| refund_reason | |

### Change coordinator / allow_view
**No validate** — body `coordinator_id` / toggle only. Add exists:users for coordinator.

---

## Files — `StorageController`

### Upload documents — `uploadDocumentFileToR2`
| Field | Rules |
|-------|-------|
| files[] | extensions: pdf,doc,docx,txt,zip,jpg,jpeg,png,gif,bmp,tiff,ico,webp,excel,csv,ppt,pptx |
| | total batch size ≤ **500MB** (manual) |

### Upload solutions — `uploadSolutionFileToR2`
| Field | Rules |
|-------|-------|
| solution_files[] | same extensions; total ≤ **500MB** |

**Rebuild decision:** unify 10MB create-task vs 500MB storage limits — pick one product rule.

---

## Recommended new-app defaults (stricter)

1. All money amounts: `decimal` with 2 places, `min 0.01` for gateway.  
2. Feedback rating: `integer 1–5`.  
3. Contact email: **not** unique globally.  
4. Create task (admin): always validate like client + role checks.  
5. File: max **25MB/file**, **100MB/task** (example — document your choice).  
6. Chatbot message: required, max length, rate limited.
