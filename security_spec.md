# P2UWM Security Specification (Zero-Trust & ABAC)

## 1. Data Invariants

1. **Default-Deny Catch-All**: Every undefined collection or subcollection is strictly denied (`allow read, write: if false`).
2. **Verified Authentication & Anti-Spoofing**: Every write across the database mandates `request.auth != null && request.auth.token.email_verified == true`. Bootstrapped admin recognition (`adryanbejo@gmail.com`) strictly requires `request.auth.token.email_verified == true` to defeat unverified email spoofing.
3. **RBAC Privilege Isolation**: Non-bootstrapped users can NEVER write to `/admins/{adminUid}`. Additional administrators exist solely as verified documents in `/admins/{uid}` created by the bootstrapped super administrator.
4. **PII Split-Collection & Atomic Write Invariant**: Sensitive contact details (`email`, `phone`, `memberIdCode`) are isolated inside `/aspirations_pii/{aspirationId}` and forbidden in `/aspirations/{aspirationId}`. Creating an aspiration requires an atomic batch write where both `/aspirations/{id}` and `/aspirations_pii/{id}` exist simultaneously via `existsAfter()`.
5. **PII Read Confidentiality**: `/aspirations_pii/{aspirationId}` forbids `list` queries completely (`allow list: if false`) and restricts `get` strictly to the verified `authorId` owner or `isAdmin()`.
6. **Terminal State Locking**: Once an `/aspirations/{aspirationId}` document reaches terminal status `'Selesai'`, non-admin updates are permanently rejected; only `isAdmin()` can modify or transition statuses.
7. **Temporal & Identity Immutability**: `createdAt` and `updatedAt` must equal `request.time` on creation, `updatedAt == request.time` on updates, and `createdAt` + `authorId` can never be mutated during updates.
8. **Cost-Optimized Secure List Queries**: Zero `get()` or `exists()` lookups appear inside `allow list` rules. Public `list` rules explicitly validate `resource.data.status == 'published'`, while private `list` rules validate `resource.data.authorId == request.auth.uid` or verified bootstrapped admin scope.
9. **Immutable Security Audit Trail**: `/audit_logs/{logId}` is strictly append-only (`allow update, delete: if false`) and restricted to verified administrators.
10. **Whitelisted Registered Accounts Only (`/registered_accounts/{emailKey}`)**: Only the bootstrapped super administrator (`adryanbejo@gmail.com`) or accounts explicitly registered with `active == true` in `/registered_accounts/{emailLower}` (or legacy `/admins/{uid}`) pass `isRegisteredUser()`. Unregistered Google accounts are barred from client login and rejected on all database write and private read operations. Non-admin users can only `get` their own exact `emailKey` document and can never `list` `/registered_accounts`.

## 2. The "Dirty Dozen" Adversarial Payloads

1. **Payload 01 — Self-Assigned Admin Escalation**: Regular user `uid_attacker` writes `{ uid: "uid_attacker", email: "attacker@test.com", name: "Attacker", roleTitle: "Ketua", addedBy: "uid_attacker", createdAt: SERVER_TIME }` to `/admins/uid_attacker` -> `PERMISSION_DENIED`.
2. **Payload 02 — Unverified Email Spoofing**: User with `email: "adryanbejo@gmail.com"` and `email_verified: false` attempts to create `/articles/art_1` -> `PERMISSION_DENIED`.
3. **Payload 03 — Shadow / Ghost Field Injection**: Admin or user submits `/aspirations/asp_1` with an undeclared field `{ ..., isVerifiedAdmin: true }` -> `PERMISSION_DENIED` via `hasOnly()`.
4. **Payload 04 — Identity Spoofing on Aspiration**: Verified user `uid_a` creates `/aspirations/asp_1` with `authorId: "uid_b"` -> `PERMISSION_DENIED`.
5. **Payload 05 — Orphaned Aspiration Without Atomic PII Vault**: Verified user creates `/aspirations/asp_solo` without writing `/aspirations_pii/asp_solo` in the same batch -> `PERMISSION_DENIED` via `existsAfter()`.
6. **Payload 06 — PII Vault Lateral Read**: Verified user `uid_other` calls `get` on `/aspirations_pii/asp_owned_by_victim` -> `PERMISSION_DENIED`.
7. **Payload 07 — PII Bulk Enumeration**: Any user or admin calls `list` on `/aspirations_pii` -> `PERMISSION_DENIED`.
8. **Payload 08 — ID Poisoning / Resource Exhaustion**: Attacker targets `/aspirations/bad$id!with spaces` or >128 char ID -> `PERMISSION_DENIED` via `isValidId()`.
9. **Payload 09 — Client-Forged Timestamp**: Verified user creates `/aspirations/asp_time` with past/future `createdAt` != `request.time` -> `PERMISSION_DENIED`.
10. **Payload 10 — Self-Approving Aspiration Status**: Verified user creates `/aspirations/asp_skip` with `status: "Selesai"` instead of `"Diajukan"`, or updates own aspiration's `status` -> `PERMISSION_DENIED`.
11. **Payload 11 — Value Poisoning on CMS Update**: Admin updates `/programs/prog_1` setting `progressPercent: 999` or 10KB `summary` -> `PERMISSION_DENIED` via `isValidWorkProgram(incoming())`.
12. **Payload 12 — Audit Log Tampering**: Admin attempts `update` or `delete` on `/audit_logs/log_1` to erase trace -> `PERMISSION_DENIED`.
