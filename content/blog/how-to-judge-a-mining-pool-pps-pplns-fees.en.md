---
slug: "how-to-judge-a-mining-pool-pps-pplns-fees"
lang: "en"
title: "How to judge a mining pool: PPS, PPLNS and fees"
description: "A 2% fee versus 4% costs less than a 3% reject rate. The payout-scheme arithmetic, why pool hashrate never matches your miner's display, and what to verify first."
date: "2026-07-30"
primaryKeyword: "کارمزد استخر ماینینگ"
keywords: ["کارمزد استخر ماینینگ", "استخر ماینینگ", "PPS و PPLNS", "FPPS چیست", "هش ریت ماینر چیست", "تفاوت هش ریت استخر با ماینر", "ریجکت ماینر چیست", "راه حل ریجکت ماینر", "تنظیمات استخر ماینر", "استخر استخراج بیت کوین", "سود ماینر به تومان", "شیر ماینینگ چیست"]
dir: "ltr"
status: "draft"
---

## What a pool actually sells

A single 200 TH/s machine, mining alone against an assumed 1,000 EH/s network, needs about **95 years** to find one block on average. The arithmetic: its share of the network is 2 in ten million, roughly 52,560 blocks are mined per year, and the product is about 0.01 blocks per year. A pool converts that into something you can plan around. That is the first and larger half of what you are paying for.

The second half is engineering: building the block template (transaction selection, merkle root), pushing new work with minimum delay after every block, holding the Stratum connection open, counting shares, and batching on-chain payouts so network fees don't come out of your pocket every time.

The pool fee buys those two things. The catch is that the mix differs enormously between pools, and the payout scheme is precisely the statement of which risk the pool absorbed and which one you still hold.

### Assumptions used throughout

| Variable | Value | Status |
|---|---|---|
| Network hashrate | 1,000 EH/s | Round assumption — check today's figure |
| Block subsidy | 3.125 BTC | Actual, post-2024 halving |
| Blocks per day | 144 | Protocol target |
| BTC price | $100,000 | Round assumption |
| Free-market USD | 194,000 toman | Market rate, moves daily |
| Sample machine | 200 TH/s | S21 class |

From these: daily network subsidy is 144 × 3.125 = 450 BTC. Per terahash per day: 450 ÷ 1,000,000,000 = 0.00000045 BTC. A 200 TH/s machine therefore produces **0.00009000 BTC/day** — $9.00, or about 1,746,000 toman — before fees and before electricity. Over a 30-day month, 0.00270000 BTC. Every figure below rests on that one number. Substitute today's real hashprice and today's real USD rate and the method is unchanged.

## Why a small pool is almost forced to offer PPS

A pool with 0.1% of network hashrate (about 1 EH/s) finds 0.144 blocks per day — one every 6.9 days, 4.3 per month. Block discovery is Poisson, so the relative swing in block count is 1 ÷ √N:

| Pool share of network | Blocks per month | Monthly income swing (1σ) |
|---|---|---|
| 0.1% | 4.3 | ±48% |
| 1% | 43 | ±15% |
| 5% | 216 | ±6.8% |
| 15% | 648 | ±3.9% |

Under PPLNS that swing lands directly on your payout. On a 1 EH/s pool, a month at half of expectation is entirely unremarkable — and the next month may run 1.5×. If you have an electricity bill and a rack to pay for, that difference is real.

So when a small pool offers PPS, it is selling insurance: in an unlucky month it pays you out of its own balance. **Which makes the pool's ability to survive a bad month something you can and should investigate.** A new pool advertising pure PPS at a low fee has taken on a risk it may not be capitalised to carry. The useful question is not "what is the fee" but "how many unlucky months has this pool paid through without delay."

## Four payout schemes, described by what lands in your wallet

Strip the jargon and only three things differ: does money arrive in a block-less week, do transaction fees reach you, and what happens when you join or leave?

**Pure PPS** — a fixed amount per accepted share, derived from the block subsidy. If the pool finds nothing for a week your income is unchanged. But **transaction fees inside blocks do not reach you**, and during busy mempool periods that is not a rounding error.

**FPPS** — PPS on the subsidy, plus a transaction-fee component computed from a network average over some window rather than from the blocks this pool actually found. The most predictable option.

**PPS+** — subsidy paid PPS-style (smooth), transaction fees paid PPLNS-style from real blocks (lumpy). Your main income is flat, the fee component is not.

**PPLNS** — everything comes from blocks the pool actually found, divided across a window of the last N shares. Hopping-resistant, and over the long run the highest expected return per unit of fee — at the cost of the variance in the table above. Two practical points that rarely get stated: in your first hours your weight in the window is low and you are underpaid; and when you power down, depending on implementation, your share tail either pays out gradually or is forfeited. **Ask about the tail explicitly before choosing PPLNS.**

### Fee percentages are not comparable across schemes

A pure-PPS pool at 2% pays you 0.98 × subsidy. An FPPS pool at 3% pays 0.97 × (subsidy + transaction fees). Where are they equal?

0.97 × (3.125 + F) = 0.98 × 3.125 → F ≈ 0.032 BTC per block

So as soon as average transaction fees per block exceed roughly **0.032 BTC**, the 3% FPPS pool beats the 2% pure-PPS pool. That threshold is low and is cleared in most periods, but it is not fixed — check current average fees per block on a mempool explorer and redo the line yourself. The general lesson: **before comparing percentages, ask what the percentage is taken from.**

## Price the fee in your own currency, not in percent

Same 200 TH/s machine, 30-day month:

| Fee | Monthly BTC | USD | Toman |
|---|---|---|---|
| 0% | 0.00270000 | 270.0 | 52,380,000 |
| 2% | 0.00264600 | 264.6 | 51,332,400 |
| 2.5% | 0.00263250 | 263.3 | 51,070,500 |
| 4% | 0.00259200 | 259.2 | 50,284,800 |

The gap between 2% and 4% is $5.40 a month — about 1,047,600 toman on one machine. Not nothing. But remember its size, because the next section undercuts it.

## A 3% reject rate costs more than two percentage points of fee

A rejected or stale share is work your machine did and was not paid for. It behaves exactly like a fee, except nobody writes it down.

A 3% reject rate on the same machine costs 0.00008100 BTC/month = $8.10 ≈ **1,571,400 toman** — **more than the entire 2%-versus-4% fee difference.** If one pool has a lower fee and the other a more stable connection, the stable one almost always wins.

Now separate the causes numerically, because the folklore here is wrong:

- **Latency.** A block takes ~600 seconds on average. If new work reaches your machine t seconds late, roughly t ÷ 600 of your work is wasted. 1 second = 0.17%. 3 seconds = 0.5%. **Latency, at second scale, is not your main source of rejects.**
- **Drops and reconnects.** 90 seconds of downtime, 8 times a day, is 720 s out of 86,400: 0.83%. Ten times worse than latency. **This is where the money goes.**
- **Unstable overclock or bad firmware.** A reject rate that moves when you change the power profile is not the pool's fault.

Debug in that order: disconnect logs first, device profile second, latency last.

## Why pool hashrate never matches the number on your miner

Every pool gets asked this several times a day, and the correct answer is statistical rather than technical.

Your machine computes hashrate from the nonce rate inside its chips: enormous sample count, effectively zero noise. The pool estimates the same quantity from **accepted shares within a time window** — a statistical estimate with relative error 1 ÷ √N.

Suppose share difficulty is set to 65,536. Each share represents 65,536 × 2³² ≈ 281 TH of work, so a 200 TH/s machine submits one every 1.4 seconds:

| Reporting window | Shares | Relative error (1σ) |
|---|---|---|
| 5 minutes | ~213 | 6.9% |
| 10 minutes | ~426 | 4.8% |
| 1 hour | ~2,560 | 2.0% |
| 24 hours | ~61,400 | 0.4% |

What follows is the whole practical answer:

- A 10-minute figure swinging ±10% around your device number is **normal** — that is two sigma. Nothing is broken.
- A 24-hour figure sitting 4% below your device is **not noise** — it is ten standard deviations. Four percent of your work genuinely was not credited. Go look for rejects and drops.
- Never compare the miner's 5-second reading to the pool's 10-minute reading. Compare equal windows, preferably 24-hour.
- If a pool raises share difficulty to save bandwidth, share count falls and short windows get noisier. At difficulty 262,144 the same 10-minute window carries 9.7% error. A jumpy dashboard is not automatically a broken pool.

The same arithmetic corrects a common myth. At ~61,000 shares a day and Stratum messages of a few hundred bytes, a miner's traffic is on the order of 200 bytes per second — roughly half a gigabyte a month, and several times less if share difficulty is raised. That is an estimate from message sizes rather than a measurement on the wire, but it shows why "1 Mbps is plenty" is true: bandwidth was never the constraint. **Stability and latency are.**

## Seven things to check before you commit hashrate

1. **Get the scheme name in writing, and ask whether transaction fees are included.** "PPS" without that clarification tells you nothing.
2. **Make one small withdrawal in week one.** Note the minimum payout, who pays the on-chain fee, and how long it actually took. At 0.00009 BTC/day, a 0.001 BTC minimum means 11 days of accrual for a single machine.
3. **The dashboard must show accepted versus rejected separately, per worker, across several windows.** A pool that shows one aggregate number has given you no diagnostic tool.
4. **Test reconnect behaviour.** Pull the cable for two minutes and watch how quickly shares resume. Fill all three pool slots in the miner (primary plus alternate ports).
5. **Treat an unpaid balance as a receivable, not savings.** Set the minimum payout low and withdraw often. Large pools have failed owing money to account holders; this is not a theoretical risk.
6. **Ask how the accounting can be checked.** A pool that finds blocks directly has a found-blocks page and a coinbase tag. Pools that aggregate hashrate onto a single upstream account — the model Hashrial uses — have neither, and owe you an exportable share history instead. In that model **the accuracy of that database is the entire thing you are trusting.** Ask about it directly.
7. **Do the fee arithmetic on your own numbers.** Build the currency table above once, with your hashrate and today's rates. The decision usually becomes obvious.

## What this article does not settle

Everything above prices the revenue side only. Electricity cost in Iran is not a fixed number: the mining tariff is a formula that is revised periodically and carries time-of-use multipliers that differ sharply between peak and off-peak bands. Any article — this one included — that hands you a single fixed rate will be wrong next quarter. Take the current tariff from the official schedule and from the terms of your own licence.

The legal treatment of holding and converting bitcoin in Iran is likewise unsettled, and nothing here is legal or financial advice. What is here is arithmetic: payout scheme, fee, reject rate, reporting window. Those four you can measure yourself — and should, before sending months of hashrate somewhere whose accounting you have never inspected.
