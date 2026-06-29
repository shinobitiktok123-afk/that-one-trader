# Solana AI Trading Platform Security Specification

## Data Invariants
1. A Wallet must always be associated with a valid User UID.
2. A Trade must always reference a valid User UID and a Wallet Address owned by that user.
3. User Profiles can only be created/updated by the owner.
4. Roles (admin/user) cannot be modified by the user themselves.
5. AI Signals are read-only for users and can only be created/updated by the system (Admin/Server).

## The Dirty Dozen Payloads
1. **Identity Spoofing**: Attempt to create a user profile for a different UID.
2. **Privilege Escalation**: Attempt to update `role` to 'admin' in user settings.
3. **Wallet Hijacking**: Attempt to read another user's wallet document.
4. **Trade Injection**: Attempt to create a trade record for another user's account.
5. **ID Poisoning**: Attempt to use a 2MB string as a document ID for a wallet.
6. **State Shortcutting**: Attempt to update a trade status from 'pending' to 'completed' without a txHash.
7. **Timestamp Fraud**: Attempt to set `createdAt` to a future date.
8. **Orphaned Wallets**: Attempt to create a wallet without a corresponding user document.
9. **Bulk Scrape**: Attempt to list all user profiles without specific filtering.
10. **Signal Tampering**: Attempt to modify a global AI signal.
11. **Resource Exhaustion**: Attempt to write a massive JSON object into a wallet's `settings`.
12. **Unverified Access**: Attempt to write data as a user with an unverified email.

## Next Steps
- Implement `firestore.rules` with strict schema validation.
- Enforce `request.auth.token.email_verified == true`.
