# Telemetry Architecture

ThaiOML uses PostHog for client and server telemetry. Telemetry must not interrupt the primary workflow or expose sensitive medical content, credentials, tokens, or identifiable patient data.

## Client telemetry

- `webapp/src/components/PostHogProvider.tsx` initializes `posthog-js` from public environment configuration.
- Client capture defaults to disabled unless the `cookie_consent` cookie is `granted`.
- `CookieBanner` and privacy settings call PostHog's opt-in and opt-out methods when consent changes.
- Consent is shared through a cookie in production. Do not introduce a competing local-storage value.
- New client events must remain behind the same consent decision.

## Server telemetry

- `backend/src/backend/api/routes.py` initializes the Python PostHog client from `POSTHOG_API_KEY` and `POSTHOG_HOST`.
- The client is disabled when the API key is absent.
- Authenticated events use the verified Clerk `sub` as `distinct_id`.
- Server telemetry failures must not change the endpoint's functional result.

## Event taxonomy

Reuse an existing event when it represents the same user action. Current cross-service names include:

| Event | Producer |
| --- | --- |
| `ask_library_query_submitted` | Webapp and FastAPI query flow |
| `ask_library_chat_submitted` | FastAPI chat flow |
| `title_check_performed` | SNOMED suggestion endpoint |
| `auto_link_used` | Automatic terminology linker |

Keep event meanings and property types stable. Prefer counts, booleans, identifiers, and coarse operational metadata over raw prompts, article text, search content, or clinical data.

## Verification

For client changes, test first visit, acceptance, refusal, and later revocation. For server changes, test configured and disabled clients plus success and failure paths. Confirm that event producers use the same name and compatible properties.
