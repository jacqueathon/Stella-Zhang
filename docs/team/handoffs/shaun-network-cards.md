# Networking card visual update
Contributor: Shaun / xzacutionar
Branch: shaun/network-cards
Checkpoint: Shaun Version 3 - Improve networking cards and LinkedIn access
Base: 0f6708e536e2db94a3b0cc63d67df329175318db
Commit: see PR/session message.

Added employer marks beside initials, bold 22px desktop names (21px mobile), 15px roles and explicit LinkedIn links on the six priority contact cards. Preserved existing stored URLs and all research/progress behaviour. Added Honda, Hyundai Capital America and Riot Games to the existing domain map. Images use the documented Google favicon service and existing fallback.

Validation: node --check dist/app.mjs; node --test tests/*.test.mjs (9 passed). Browser preview verified six loaded logos, six existing profile URLs and computed 22px / 800 names. Links use a new tab with noopener/noreferrer. Did not contact anyone or reverify their employment/profile contents.

Publication: public ChatGPT Site updated separately; GitHub task branch awaits review/merge. No Vercel deployment, no main merge, no conflicts or unrelated local changes. Current main and all task branch heads checked before allocating Version 3.
