# 17 — Endpoint / Action Catalog

Full action list from `routes/web.php`. Stack-agnostic: recreate as REST/RPC as you like; keep **behavior**.

Middleware baseline for logged-in groups: `auth` + `session.timeout`, then `role:*`.

---

## Public / utility

| Method             | Path                    | Name                   | Handler                             | Auth                |
| ------------------ | ----------------------- | ---------------------- | ----------------------------------- | ------------------- |
| GET                | `/language/{locale}`    | `language.switch`      | LanguageController@switchLanguage   | public              |
| GET                | `/`                     | `home`                 | PublicController@home               | public              |
| GET                | `/services`             | `services`             | PublicController@service            | public              |
| GET                | `/about`                | `about`                | PublicController@about              | public              |
| GET                | `/faq`                  | `faq`                  | PublicController@faq                | public              |
| GET                | `/contact`              | `contact`              | PublicController@contact            | public              |
| GET                | `/terms`                | `terms`                | PublicController@terms              | public              |
| GET                | `/privacy-policy`       | `privacy-policy`       | PublicController@privacyPolicy      | public              |
| GET                | `/refunds-policy`       | `refunds-policy`       | PublicController@refundPolicy       | public              |
| GET                | `/payment`              | `payment`              | PublicController@payment            | public              |
| GET                | `/invoice`              | `invoice`              | PublicController@invoice            | public              |
| POST               | `/create-lead`          | `create-lead`          | LeadController@createLead           | public              |
| POST               | `/create-lead-home`     | `create-lead-home`     | PublicController@createLeadHome     | public              |
| POST               | `/stay-updated`         | `stay-updated`         | CommonController@stayUpdated        | public              |
| POST               | `/create-stay-updated`  | `create-stay-updated`  | CommonController@createStayUpdated  | public              |
| POST               | `/contact-message`      | `contact-message`      | CommonController@contactMessage     | public              |
| POST               | `/send-contact-message` | `send-contact-message` | CommonController@sendContactMessage | public              |
| GET                | `/clear-cache`          | _(unnamed)_            | Artisan optimize:clear              | **Skip — insecure** |
| POST               | `/montypay-callback`    | `montypay.callback`    | MontyPayController@montyCallback    | no auth/CSRF        |
| POST               | `/chatbot/message`      | _(unnamed)_            | ChatbotController@sendMessage       | public              |
| GET                | `/convert`              | _(unnamed)_            | CurrencyConverterController@convert | public              |
| ~~GET `/pricing`~~ | `pricing`               | commented out          | —                                   |

---

## Auth

| Method   | Path                    | Name                    | Handler                                | Notes              |
| -------- | ----------------------- | ----------------------- | -------------------------------------- | ------------------ |
| GET      | `/login`                | `login`                 | UnifiedAuthController@login            |                    |
| POST     | `/login`                | `unified.show.login`    | UnifiedAuthController@showlogin        | `login.rate.limit` |
| GET      | `/register`             | `unified.register`      | UnifiedAuthController@register         |                    |
| POST     | `/register`             | `unified.show.register` | UnifiedAuthController@showregister     |                    |
| POST     | `/logout`               | `unified.logout`        | UnifiedAuthController@logout           |                    |
| GET      | `/verification`         | `unified.verification`  | UnifiedAuthController@showVerification |                    |
| POST     | `/verification`         | `unified.verify.code`   | UnifiedAuthController@verifyCode       |                    |
| POST     | `/resend-code`          | `unified.resend.code`   | UnifiedAuthController@resendCode       |                    |
| GET      | `forgot-password`       | `password.request`      | PasswordResetLinkController@create     |                    |
| POST     | `forgot-password`       | `password.email`        | PasswordResetLinkController@store      |                    |
| GET/POST | `password-reset/verify` | `password.reset.verify` | PasswordResetLinkController            |                    |
| GET/POST | `password-reset/update` | `password.reset.update` | PasswordResetLinkController            |                    |
| POST     | `password-reset/resend` | `password.reset.resend` | PasswordResetLinkController@resendCode |                    |

---

## Admin (`role:admin`)

| Method | Path                                         | Name                                        | Handler                                           |
| ------ | -------------------------------------------- | ------------------------------------------- | ------------------------------------------------- |
| GET    | `/admin-dashboard`                           | `admin-dashboard`                           | AdminController@adminDashboard                    |
| GET    | `/admin-profile`                             | `admin-profile`                             | AdminController@profile                           |
| POST   | `/admin-send-custom-email`                   | `admin.send-custom-email`                   | AdminController@sendCustomEmail                   |
| POST   | `/admin-store-coordinator`                   | `admin.store-coordinator`                   | AdminController@AddCoordinator                    |
| POST   | `/admin-store-tutor`                         | `admin.store-tutor`                         | AdminController@AddTutor                          |
| POST   | `/admin-store-client`                        | `admin.store-client`                        | AdminController@AddClient                         |
| POST   | `/admin-change-user-permissions`             | `admin.change-user-permissions`             | AdminController@changeUserPermissions             |
| POST   | `/admin-deactivate-user/{id}`                | `admin.deactivate-user`                     | AdminController@deactivateUser                    |
| POST   | `/admin-activate-user/{id}`                  | `admin.activate-user`                       | AdminController@activateUser                      |
| PUT    | `/admin-update-user/{id}`                    | `admin.update-user`                         | AdminController@updateUser                        |
| DELETE | `/admin-delete-user/{id}`                    | `admin.delete-user`                         | AdminController@deleteUser                        |
| POST   | `/admin-approve-user/{id}`                   | `admin.approve-user`                        | AdminController@approveUser                       |
| GET    | `/admin-search-users`                        | `admin.search-users`                        | AdminController@searchUsers                       |
| GET    | `/admin-view-leads-table`                    | `admin.view-leads-table`                    | AdminController@viewLeadsTable                    |
| GET    | `/admin-view-stay-updated`                   | `admin.view-stay-updated`                   | CommonController@viewStayUpdated                  |
| GET    | `/admin-view-contact-message`                | `admin.view-contact-message`                | CommonController@viewContactMessage               |
| DELETE | `/admin-delete-lead/{id}`                    | `admin.delete-lead`                         | AdminController@deleteLead                        |
| DELETE | `/admin-delete-stay-updated/{id}`            | `admin.delete-stay-updated`                 | AdminController@deleteStayUpdated                 |
| DELETE | `/admin-delete-contact-message/{id}`         | `admin.delete-contact-message`              | AdminController@deleteContactMessage              |
| DELETE | `/admin-delete-feedback/{id}`                | `admin.delete-feedback`                     | AdminController@deleteFeedback                    |
| PATCH  | `/admin-change-coordinator-of-task/{id}`     | `admin.change-coordinator-of-task`          | AdminController@changeCoordinatorOfTask           |
| GET    | `/admin-filter-tutors`                       | `admin.filter-tutors`                       | AdminController@filterTutors                      |
| GET    | `/admin-filter-clients`                      | `admin.filter-clients`                      | AdminController@filterClients                     |
| GET    | `/admin-filter-tasks`                        | `admin.filter-tasks`                        | AdminController@filterTasks                       |
| POST   | `/admin-create-payment`                      | `admin.create-payment`                      | AdminController@createPayment                     |
| POST   | `/admin-create-refund`                       | `admin.create-refund`                       | AdminController@createRefund                      |
| DELETE | `/admin-delete-payment/{id}`                 | `admin.delete-payment`                      | AdminController@deletePayment                     |
| DELETE | `/admin-delete-refund/{id}`                  | `admin.delete-refund`                       | AdminController@deleteRefund                      |
| GET    | `/admin-download-invoice/{id}`               | `admin.download-invoice`                    | AdminController@downloadInvoice                   |
| POST   | `/admin-change-access-to-task/{id}`          | `admin.change-access-to-task`               | AdminController@changeAccessToTask                |
| PATCH  | `/admin-update-profile-personal-information` | `admin.update-profile-personal-information` | CommonController@updateProfilePersonalInformation |
| PATCH  | `/admin-update-profile-password`             | `admin.update-profile-password`             | CommonController@updateProfilePassword            |

### Admin exports

| Method | Path                                             | Name                                            |
| ------ | ------------------------------------------------ | ----------------------------------------------- |
| GET    | `/admin-export-leads-pdf`                        | `admin.export-leads-pdf`                        |
| GET    | `/admin-export-leads-excel`                      | `admin.export-leads-excel`                      |
| GET    | `/admin-export-stay-updated-pdf`                 | `admin.export-stay-updated-pdf`                 |
| GET    | `/admin-export-stay-updated-excel`               | `admin.export-stay-updated-excel`               |
| GET    | `/admin-export-users-excel`                      | `admin.export-users-excel`                      |
| GET    | `/admin-export-tasks-excel`                      | `admin.export-tasks-excel`                      |
| GET    | `/admin-export-solutions-excel`                  | `admin.export-solutions-excel`                  |
| GET    | `/admin-export-revision-sessions-excel`          | `admin.export-revision-sessions-excel`          |
| GET    | `/admin-export-revision-session-solutions-excel` | `admin.export-revision-session-solutions-excel` |
| GET    | `/admin-export-login-attempts-excel`             | `admin.export-login-attempts-excel`             |
| GET    | `/admin-export-contact-messages-excel`           | `admin.export-contact-messages-excel`           |
| GET    | `/admin-export-login-verifications-excel`        | `admin.export-login-verifications-excel`        |
| GET    | `/admin-export-payments-excel`                   | `admin.export-payments-excel`                   |
| GET    | `/admin-export-messages-excel`                   | `admin.export-messages-excel`                   |
| GET    | `/admin-export-feedback-excel`                   | `admin.export-feedback-excel`                   |
| GET    | `/admin-export-assignment-transactions-excel`    | `admin.export-assignment-transactions-excel`    |
| GET    | `/admin-export-files-excel`                      | `admin.export-files-excel`                      |
| GET    | `/admin-export-specializations-excel`            | `admin.export-specializations-excel`            |
| GET    | `/admin-export-refunds-excel`                    | `admin.export-refunds-excel`                    |
| GET    | `/admin-export-payment-logs-excel`               | `admin.export-payment-logs-excel`               |

Handlers: `ExcelController@*`.

---

## Coordinator (`role:coordinator`)

| Method | Path                                               | Name                                              | Handler                                    |
| ------ | -------------------------------------------------- | ------------------------------------------------- | ------------------------------------------ |
| GET    | `/coordinator-dashboard`                           | `coordinator-dashboard`                           | CoordinatorController@coordinatorDashboard |
| GET    | `/coordinator-profile`                             | `coordinator-profile`                             | CoordinatorController@profile              |
| DELETE | `/coordinator-delete-user/{id}`                    | `coordinator.delete-user`                         | CoordinatorController@deleteUser           |
| POST   | `/coordinator-change-password`                     | `coordinator-change-password`                     | CoordinatorController@changePassword       |
| PATCH  | `/coordinator-update-profile-personal-information` | `coordinator.update-profile-personal-information` | CommonController@…                         |
| PATCH  | `/coordinator-update-profile-password`             | `coordinator.update-profile-password`             | CommonController@…                         |

---

## Tutor (`role:tutor`)

| Method | Path                                         | Name                                        | Handler                                  |
| ------ | -------------------------------------------- | ------------------------------------------- | ---------------------------------------- |
| GET    | `/tutor-dashboard`                           | `tutor-dashboard`                           | TutorController@tutorDashboard           |
| GET    | `/tutor-profile`                             | `tutor-profile`                             | TutorController@profile                  |
| GET    | `/tutor-view-task-details/{id}`              | `tutor-view-task-details`                   | TutorController@viewTaskDetails          |
| GET    | `/tutor-download-files/{fileid}`             | `tutor-download-files`                      | TutorController@downloadFileFromR2       |
| POST   | `/tutor-submit-task/{taskid}`                | `tutor-submit-task`                         | TutorController@submitTask               |
| POST   | `/tutor-cancel-submit-task/{taskid}`         | `tutor-cancel-submit-task`                  | TutorController@cancelSubmitTask         |
| POST   | `/tutor-submit-revision/{taskid}`            | `tutor-submit-revision`                     | TutorController@submitRevision           |
| POST   | `/tutor-cancel-revision-submission/{taskid}` | `tutor-cancel-revision-submission`          | TutorController@cancelRevisionSubmission |
| PATCH  | `/tutor-update-profile-personal-information` | `tutor.update-profile-personal-information` | CommonController@…                       |
| PATCH  | `/tutor-update-profile-password`             | `tutor.update-profile-password`             | CommonController@…                       |

---

## Client (`role:client`)

| Method | Path                                          | Name                                         | Handler                             |
| ------ | --------------------------------------------- | -------------------------------------------- | ----------------------------------- |
| GET    | `/client-dashboard`                           | `client-dashboard`                           | ClientController@clientDashboard    |
| GET    | `/client-view-task-details/{id}`              | `view-task-details`                          | ClientController@viewTaskDetails    |
| GET    | `/client-profile`                             | `client-profile`                             | ClientController@profile            |
| POST   | `/client-submit-feedback`                     | `client.submit-feedback`                     | ClientController@submitFeedback     |
| POST   | `/send-task-request`                          | `send-task-request`                          | ClientController@sendTaskRequest    |
| GET    | `/client-billing`                             | `client-billing`                             | ClientController@billingPage        |
| GET    | `/client-download-files/{fileid}`             | `client-download-files`                      | ClientController@downloadFileFromR2 |
| PUT    | `/update-task/{taskid}`                       | `client-update-task`                         | ClientController@updateTask         |
| DELETE | `/client-delete-task/{id}`                    | `client-delete-task`                         | ClientController@deleteTask         |
| POST   | `/client-change-password`                     | `client-change-password`                     | ClientController@changePassword     |
| PATCH  | `/client-update-profile-personal-information` | `client.update-profile-personal-information` | CommonController@…                  |
| PATCH  | `/client-update-profile-password`             | `client.update-profile-password`             | CommonController@…                  |
| DELETE | `/client-delete-account`                      | `client-delete-account`                      | ClientController@deleteAccount      |
| GET    | `/client-view-task-payments/{id}`             | `client-view-task-payments`                  | ClientController@viewTaskPayments   |
| POST   | `/client-pay-for-task/{taskid}`               | `client-pay-for-task`                        | MontyPayController@clientPay        |

---

## Shared Admin + Coordinator (`role:coordinator,admin`)

| Method | Path                                                               | Name                                                     | Handler                                        |
| ------ | ------------------------------------------------------------------ | -------------------------------------------------------- | ---------------------------------------------- |
| GET    | `/admin-coordinator-view-task-details/{id}`                        | `admin-coordinator-view-task-details`                    | CommonController@adminCorViewTaskDetails       |
| GET    | `/admin-coordinator-manage-user-profile/{id}`                      | `admin-coordinator-manage-user-profile`                  | CommonController@manage_user_profile           |
| PATCH  | `/admin-coordinator-update-task/{id}`                              | `admin-coor-update-task`                                 | CommonController@updateTaskDetails             |
| PUT    | `/common-update-user/{id}`                                         | `common.update-user`                                     | CommonController@updateUser                    |
| GET    | `/admin-coordinator-download-document-files/{fileid}`              | `admin-coordinator-download-document-files`              | CommonController@downloadDocumentFileFromR2    |
| GET    | `/admin-coordinator-download-all-solutions-for-task/{taskid}`      | `admin-coordinator-download-all-solutions-for-task`      | CommonController@…                             |
| GET    | `/admin-coordinator-download-all-document-files-for-task/{taskid}` | `admin-coordinator-download-all-document-files-for-task` | CommonController@…                             |
| POST   | `/admin-coordinator-cancel-task/{id}`                              | `admin-coordinator-cancel-task`                          | CommonController@cancelTask                    |
| POST   | `/admin-coordinator-activate-task/{id}`                            | `admin-coordinator-activate-task`                        | CommonController@activateTask                  |
| POST   | `/admin-coordinator-remove-tutor-from-task/{id}`                   | `admin-coordinator-remove-tutor-from-task`               | CommonController@removeTutorFromTask           |
| POST   | `/admin-coordinator-assign-tutor-to-task/{id}`                     | `admin-coordinator-assign-tutor-to-task`                 | CommonController@assignTutorToTask             |
| POST   | `/admin-coordinator-approve-task/{id}`                             | `admin-coordinator-approve-task`                         | CommonController@approveTask                   |
| DELETE | `/admin-coordinator-delete-task/{id}`                              | `admin-coordinator-delete-task`                          | CommonController@deleteTask                    |
| POST   | `/admin-coordinator-disapprove-task/{id}`                          | `admin-coordinator-disapprove-task`                      | CommonController@disapproveTask                |
| POST   | `/admin-coordinator-create-task`                                   | `admin-coordinator-create-task`                          | CommonController@createTask                    |
| POST   | `/admin-coordinator-create-revision-session`                       | `admin-coordinator-create-revision-session`              | CommonController@createRevisionSession         |
| POST   | `/admin-coordinator-cancel-revision/{id}`                          | `admin-coordinator-cancel-revision`                      | CommonController@cancelRevisionSession         |
| POST   | `/admin-coordinator-approve-revision/{id}`                         | `admin-coordinator-approve-revision`                     | CommonController@approveRevisionSession        |
| POST   | `/admin-coordinator-reject-revision/{id}`                          | `admin-coordinator-reject-revision`                      | CommonController@rejectRevisionSession         |
| GET    | `/admin-coordinator-view-revision-details/{revisionSessionId}`     | `admin-coordinator-view-revision-details`                | CommonController@getAllRevisionSessionsForTask |
| PUT    | `/admin-coordinator-update-revision/{id}`                          | `admin-coordinator-update-revision`                      | CommonController@updateRevisionSession         |
| PUT    | `/admin-coordinator-edit-price/{id}`                               | `admin-coordinator-edit-price`                           | CommonController@editPrice                     |
| GET    | `/admin-coordinator-view-task-payments/{id}`                       | `admin-coordinator-view-task-payments`                   | CommonController@viewTaskPayments              |
| POST   | `/admin-coordinator-pay-refund-for-task/{taskid}`                  | `admin-coordinator-pay-refund-for-task`                  | MontyPayController@adminPayRefund              |

---

## Shared file / evaluate routes

### `role:admin,coordinator,tutor`

| Method | Path                                     | Name                              |
| ------ | ---------------------------------------- | --------------------------------- |
| POST   | `/common-delete-solutions-from-r2/{id}`  | `common-delete-solutions-from-r2` |
| POST   | `/common-upload-solution-files/{taskid}` | `common-upload-solution-files`    |

### `role:admin,coordinator,client`

| Method | Path                                     | Name                           |
| ------ | ---------------------------------------- | ------------------------------ |
| POST   | `/common-evaluate-tutor/{id}`            | `common-evaluate-tutor`        |
| POST   | `/common-delete-files-from-r2/{id}`      | `common-delete-files-from-r2`  |
| POST   | `/common-upload-document-files/{taskid}` | `common-upload-document-files` |

### `role:admin,coordinator,tutor,client`

| Method | Path                                                    | Name                                          |
| ------ | ------------------------------------------------------- | --------------------------------------------- |
| GET    | `/common-download-solution-files/{fileid}`              | `common-download-solution-files`              |
| GET    | `/common-download-document-files/{fileid}`              | `common-download-document-files`              |
| GET    | `/common-download-all-solutions-for-task/{taskid}`      | `common-download-all-solutions-for-task`      |
| GET    | `/common-download-all-document-files-for-task/{taskid}` | `common-download-all-document-files-for-task` |

---

## Rebuild notes

1. Prefer a clean REST shape (`/api/tasks/{id}/approve`) — map from this catalog.
2. Keep MontyPay callback **public + verified**.
3. Do not recreate `/clear-cache` as a public GET.
4. Consolidate duplicate lead/contact/stay-updated POSTs.
