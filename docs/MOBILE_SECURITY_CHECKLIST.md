# Mobile security checklist (audit #17)

Pass/fail checklist for the Expo / React Native app. Complements `docs/SECURITY_THREAT_MODEL.md`.

## Must pass

| Check | Evidence | Status |
|-------|----------|--------|
| Auth tokens in SecureStore on native | `mobile/src/utils/authStorage.ts` uses `expo-secure-store` when `Platform.OS !== 'web'` | Pass |
| Sign-out clears stored auth | `mobile/src/utils/signOut.ts` | Pass |
| iOS ATS does not allow arbitrary loads | `Info.plist` `NSAllowsArbitraryLoads=false` | Pass |
| No API keys committed in app source | Grep CI / code review; keys stay on VPS | Pass |
| Production API uses HTTPS | `EXPO_PUBLIC_API_URL` / release config | Pass (ops) |

## Documented findings (remediation backlog)

| Finding | Location | Risk | Plan |
|---------|----------|------|------|
| `usesCleartextTraffic="true"` | `mobile/android/.../AndroidManifest.xml` | Medium — allows HTTP on device | Keep for Expo/metro debug; disable for Play release build via network security config before store submit |
| `android:allowBackup="true"` | same manifest | Low–medium — backup may include app data | Prefer `false` for release; tracked here until Play build pipeline hardens |
| No certificate pinning | — | Medium for targeted MITM | Deferred — known #17 non-goal |
| No jailbreak/root detect | — | Low for fan-intel app | Deferred — known #17 non-goal |
| Web uses AsyncStorage for tokens | `authStorage.ts` | Expected for web | Acceptable; native path is SecureStore |

## Manual test (device / emulator)

1. Install release or staging build.
2. Sign in → kill app → relaunch → session restored.
3. Sign out → relaunch → must prompt for login.
4. Confirm traffic to API is HTTPS (Charles / Proxyman optional).
5. Android: confirm cleartext finding still documented before Play upload.

## Automated needles

```bash
bash scripts/verify_security_scaffold.sh
cd mobile && npm test -- --testPathPattern=authStorage --no-coverage
```

## Related

- `docs/SECURITY_THREAT_MODEL.md`
- `docs/RESTORE_DRILL.md`
