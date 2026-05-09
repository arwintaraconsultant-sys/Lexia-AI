# Security Specification for Leksia (Legal AI Indonesia)

## Data Invariants
- A `Chat` must belong to a valid `User` (the creator).
- A `Message` can only exist within a `Chat` that the user owns.
- Users can only read and write their own data.
- System fields like `createdAt` are immutable after creation.
- `role` in `Message` must be either 'user' or 'assistant'.

## The Dirty Dozen Payloads

1. **Identity Spoofing**: Attempt to create a chat with another user's `userId`.
2. **Access Violation**: Attempt to read another user's chat by guessing `chatId`.
3. **Shadow Update**: Attempt to add a `isVerifiedAdmin: true` field to a user profile.
4. **ID Poisoning**: Use a 1MB string as a `chatId`.
5. **Role Escalation**: Attempt to send a message with `role: 'assistant'` from the client.
6. **Orphaned Writes**: Attempt to create a message in a non-existent chat.
7. **PII Leak**: Attempt to list all users in the `/users` collection.
8. **Resource Exhaustion**: Send a message with 1MB of content.
9. **Terminal State Break**: Attempt to change the `userId` of an existing chat.
10. **Timestamp Manipulation**: Provide a future/past `createdAt` instead of using `request.time`.
11. **Malicious Query**: Query all chats without filtering by `userId`.
12. **Shadow Field Injection**: Create a document with extra unvetted fields.

## The Test Plan
Verify that all the above payloads return `PERMISSION_DENIED`.
