# Selfie / face verification — backup taken 2026-07-30

Snapshot before splitting face verification into its own wizard step, replacing
the UI with a circular progress ring, and adding QR hand-off to a phone.

| File | What it is |
|---|---|
| `FaceLiveness.jsx` | working copy at time of backup |
| `FaceLiveness.ORIGINAL-committed.jsx` | last committed version (git HEAD) |
| `FaceSection.jsx` | wrapper at time of backup |

To restore:
    cp _backup/selfie-verification-2026-07-30/FaceLiveness.jsx components/common/
    cp _backup/selfie-verification-2026-07-30/FaceSection.jsx  components/auth/

The liveness logic itself (face-api.js, the 5-step head-turn sequence, capture)
is unchanged by the rework — only presentation and where it sits in the flow.
