# Fact-check before publishing: how-to-judge-a-mining-pool-pps-pplns-fees

Status is `draft` in both language files. Change to `published`
only after working through the list below.

MUST FACT-CHECK BEFORE PUBLISHING.

1. Assumption block — deliberately round, but replace with live figures at publish time and keep the two versions in sync: network hashrate (I used 1,000 EH/s), BTC price ($100,000), free-market USD/toman (194,000 per the brief, sourced from Wallex/صراف). Every derived number cascades from these three. If you swap them, regenerate: per-TH/day, the 200 TH/s daily/monthly BTC, the four fee rows, the toman columns, and the 3%-reject figure. The arithmetic script is reproducible — all figures were computed, none estimated by feel.

2. Verified-correct as written: block subsidy 3.125 BTC (post-April-2024 halving), 144 blocks/day protocol target, 2^32 hashes per difficulty-1 share, 1/√N Poisson relative error. The 95-year solo figure, the 6.9-day block interval for a 1 EH/s pool, the share-count/error table, the variance table, and the 0.032 BTC FPPS-vs-pure-PPS crossover are all direct consequences of the assumption block.

3. UNVERIFIED and worth a second look: the claim that average transaction fees per block usually exceed 0.032 BTC. This is my recollection of typical recent ranges, not a measurement. Either check a mempool explorer and state a current figure, or leave the text as it stands (it already tells the reader to check for themselves and does not assert a number).

4. Item 5 of the checklist alludes to large pools failing while owing account holders money. My research input cited Poolin Technology filing Chapter 11 on 22 July 2026 (District of New Jersey), ~11,700 wallet holders owed $163.7M. I deliberately did NOT put that specific claim, those figures, or the pool's name in the article because I could not verify them myself. If you can verify the filing, naming it with a link would strengthen the section considerably — it is the single most useful warning for this audience. Do not publish the figures unverified.

5. Iranian electricity tariff and legal status: no numbers are stated anywhere in either version, by design. The closing section only says the tariff is a periodically-revised formula with time-of-use multipliers and tells the reader to check the official schedule and their own licence terms. Do not let anyone "improve" this by inserting a rial-per-kWh figure — the research found those figures trace to a 1400-era announcement and reset quarterly.

6. Hashrial is mentioned exactly twice per version: once in the assumptions block (hashprice/toman source) and once in checklist item 6, where the aggregate-upstream-account model is named as the thing the reader should scrutinise rather than as a selling point. That framing is intentional; softening it into a pitch will hurt both trust and conversion.

7. Braiins is not named in either version. The keyword research found zero Persian search demand for the brand in any transliteration, so there is nothing to gain and the mention would read as promotional.

8. Persian typography: Persian-Indic digits throughout with correct separators (٫ decimal, ٬ thousands), ZWNJ in compounds, هش‌ریت never written unspaced as هشریت (per the research, that collides with an unrelated Arabic-root word), Stratum left in Latin script rather than transliterated as استراتوم (which autocompletes to dermatology). Please do not normalise these away in the CMS.

9. Slug is ASCII and shared across all language versions, per the technical SEO spec. Note that spec's finding that hashrial.com currently serves an empty SPA shell with a hardcoded canonical pointing at the root — until per-route prerendered heads exist, publishing this article will not get it indexed at any URL. That is a blocker upstream of this deliverable.

## NUMERALS — spotted while proofing the rendered page

The article mixes Persian and Latin digits in the same piece: the fee table uses
Persian (۵۲٬۳۸۰٬۰۰۰) while the paragraph below it uses Latin (1,571,400).
Pick one and apply it throughout before publishing.

Recommendation: Persian numerals for prose and tables in the Farsi version —
that is what a Persian reader expects — but keep hashrate figures, stratum URLs
and worker names in Latin, because those are read against the miner's own web
interface, which is Latin.
