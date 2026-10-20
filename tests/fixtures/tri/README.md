# Trilingual fixture (synthetic)

Two fictional sites used by `tests/trilingual.test.js`: `tri.test` publishes French (root), Arabic (`/ar/`) and English
(`/en/`) with independent page sets (DECISIONS D-H: no mirroring), `other.test` is a dark-theme French + Arabic site that
reuses a translation_key to prove hreflang never crosses domains. Facts are synthetic; one lives in
`data/facts/extra/` to test the registry merge.
