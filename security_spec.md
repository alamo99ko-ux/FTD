# Security Specification: Pre-Flight FTD Utilization Survey

## 1. Data Invariants
1. **No PII Collection**: `survey_responses` documents MUST NOT contain email addresses, names, phone numbers, or user IDs. Extra ("ghost") fields are rejected via `keys().hasOnly(...)`.
2. **All 7 Questions Required**: Every created document in `/survey_responses/{responseId}` must contain all 7 fields (`trainingStage`, `ftdImpact`, `ftdNecessity`, `ftdOperationMode`, `neededSubjects`, `unnecessaryReasons`, `groundTrainingSuggestions`) plus `createdAt`.
3. **Strict Enum & Length Bounds**: Multiple-choice fields must match exact allowed option values; free-text fields must be non-empty strings `1..2000` chars.
4. **Immutable Submissions & Server Timestamp**: `createdAt` must equal `request.time`. Updates to `survey_responses` are disabled (`allow update: if false`).
5. **Admin-Only Read & Delete**: Only verified admins (`alamo99ko@gmail.com` with `email_verified == true` or listed in `/admins/{uid}`) may read (`get`/`list`) or delete responses. Anonymous respondents can only `create`.

## 2. Adversarial Payloads ("Dirty Dozen")
1. **Ghost PII Field (`email`)**: `{ ..., email: "pilot@example.com" }` -> Rejected by `hasOnly`.
2. **Missing Required Field**: Missing `groundTrainingSuggestions` -> Rejected by `hasAll`.
3. **Invalid Q1 Enum**: `trainingStage: "ATP"` -> Rejected by enum check.
4. **Invalid Q2 Enum**: `ftdImpact: "z"` -> Rejected by enum check.
5. **Invalid Q3 Enum**: `ftdNecessity: "1"` -> Rejected by enum check.
6. **Invalid Q4 Enum**: `ftdOperationMode: "d"` -> Rejected by enum check.
7. **Empty Free-Text**: `neededSubjects: ""` -> Rejected by `size() >= 1`.
8. **Oversized Payload (DoW)**: `neededSubjects: "x".repeat(2001)` -> Rejected by `size() <= 2000`.
9. **Spoofed Timestamp**: `createdAt: "2020-01-01T00:00:00Z"` -> Rejected by `createdAt == request.time`.
10. **ID Poisoning**: Document ID > 128 chars or containing invalid chars -> Rejected by `isValidId(responseId)`.
11. **Unauthenticated List Scraping**: Anonymous `list` on `/survey_responses` -> Rejected (`isAdmin()` false).
12. **Unverified Email Spoof**: Signed-in user with `email == 'alamo99ko@gmail.com'` and `email_verified == false` -> Rejected (`email_verified == true` required).
