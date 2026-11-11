# bumperail-sandbox
Test repository for Bumperail merge gating (probe P2). Holds test PRs only.

`npm run check:dev` syntax-checks every `.mjs`/`.js`/`.cjs` file under `src`, `test` and `scripts`, and runs `node --test`, failing on zero, skipped or failing tests.
