# Fact-check before publishing: connect-asic-to-mining-pool-from-iran

Status is `draft` in both language files. Change to `published`
only after working through the list below.

Verify before publishing:

1. BRAIINS SPECIFICS — I took `stratum.braiins.com:3333` plus alternates 443 and 25 from the repo's own CLAUDE.md, not from Braiins' docs. Confirm all three ports are still published, and confirm the worker-name format is `username.workername` (the article states the prefix must exactly match the account username). Also confirm the claim that stock Antminer firmware cannot do Stratum V2 and that V2 needs Braiins OS+ — I deliberately did not name a V2 hostname or port, and that omission should stay unless someone checks the current docs.

2. THE 10.10.34.x DNS TELL — widely reported as Iran's filtering response addresses, but I did not verify it against a current Iranian resolver. Someone on an Iranian connection should run `nslookup stratum.braiins.com` and confirm the behaviour before we print a specific IP range as a diagnostic. If it no longer holds, soften to "resolves to an address that is obviously not the pool."

3. THE TWO ARITHMETIC BLOCKS ARE MINE, NOT SOURCED. Both are computed and both are labelled as estimates in the text; the assumptions are stated inline so a reader can check them.
   - Bandwidth: 100 TH/s at difficulty 65536 → 0.355 shares/s → ~250 B/s → ~22 MB/day. Sensitive to the vardiff the pool assigns; if Hashrial's proxy assigns a materially different difficulty, the number moves and we should quote our own measured figure instead. THIS IS THE BIGGEST OPPORTUNITY IN THE ARTICLE: the proxy already sees real bytes/sec per device model. Replacing the estimate with measured per-model figures would displace the unsourced "32 KB/s" figure that every competing Farsi page repeats. Recommend doing that before publishing, or in a follow-up.
   - Stale rate: 0.4 s vulnerable window ÷ 600 s block interval → 0.07%. The 0.4 s window (block propagation + job rebuild + notify) is my estimate. Worth sanity-checking against actual stale percentages in the proxy's own data — if real Iranian miners on Hashrial run at, say, 0.3%, publish that number, it is far stronger than my derivation.

4. LEGAL/TARIFF — the article deliberately states no tariff number and no legal conclusion. It says the tariff is a quarterly-reset formula with time-of-use multipliers and points readers to Tavanir, their regional distribution company, and their own bill. Do not let anyone "improve" this by inserting a specific rials/kWh figure; the research showed the circulating numbers trace to a 1400-era announcement. The sentence acknowledging that the legal position on alternate routing is unsettled is intentional — no circumvention instructions are given anywhere in the piece.

5. HASHRIAL MENTIONS — exactly one per language version, inside the proxy trade-offs section, stating the 2% fee and the per-user share records. No stratum endpoint for Hashrial is given anywhere, because I have no verified hostname/port. If the domestic endpoint is stable and public, adding it to that paragraph is the single highest-value edit; if it is not, leave it out rather than invent one.

6. The 6-language rule in CLAUDE.md applies to UI strings, not article bodies. This ships fa + en only; zh/ru/es/pt translations are a separate decision, and the hreflang manifest must record which translations actually exist rather than assuming all six.
