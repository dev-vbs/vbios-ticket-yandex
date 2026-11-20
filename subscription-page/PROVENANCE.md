# Imported component and local modifications

Source: user-provided `subscription-page-main.zip`, Remnawave Subscription Page 8.0.1.
Upstream: https://github.com/remnawave/subscription-page
License: AGPL-3.0-only; full text preserved in LICENCE.

vBios changes (2026-11-20): shared light/dark appearance, theme switch, cabinet link from server environment, connection introduction, responsive layout, graceful load failure, UTF-8 payload decoding, no-referrer policy, request logs without subscription paths, updated dependencies and reproducible frontend/backend Docker stages. Original subscription response routing remains in the upstream backend.

Deployment and standalone Compose: ../docs/SUBSCRIPTION-PAGE-RU.md.
Modified corresponding source: https://github.com/dev-vbs/vbios-ticket-yandex/tree/main/subscription-page
