# TODO

## Fix E2E recording persistence flow

- [ ] Investigate why `tests/recordings.cjs` cannot find `Delete recording from Day 1` after restarting the temporary server and opening a fresh review page.
- [ ] Confirm the authenticated session is available after the server restart and that `/api/recordings?day=1` returns the saved recording to the new page.
- [ ] Make the recording E2E pass through the restart, deletion, and final media validation assertions.
- [ ] Rerun all browser checks before changing this item to complete:
  - `tests/auth-flow.cjs`
  - `tests/user-flow.cjs`
  - `tests/recordings.cjs`

Current status: authentication and user-flow E2E checks pass; the recording check is blocked at the post-restart deletion step.
