---
slug: "bitcoin-mining-profitability-iran-toman"
lang: "en"
title: "Bitcoin mining profitability in Iran, worked out in toman"
description: "Break-even electricity price for an S19j Pro and an S21 at today's hashprice and the free-market dollar — and which tariff figures you must verify yourself."
date: "2026-07-30"
primaryKeyword: "سود استخراج بیت کوین در ایران"
keywords: ["سود استخراج بیت کوین در ایران", "سود ماینینگ در ایران", "هش ریت", "تعرفه برق ماینینگ", "نقطه سربه‌سر برق ماینر", "S21", "S19j Pro", "محاسبه سود ماینر", "هش‌پرایس", "دلار آزاد تومان", "کارمزد استخر استخراج", "bitcoin mining profitability iran"]
dir: "ltr"
status: "draft"
---

Most Persian-language articles on mining profitability get the answer wrong at step one, and it isn't a subtle error: they convert at the reference dollar rate (around 127,000 toman) or at a rate from several years ago. Your revenue is bitcoin, and you sell bitcoin at the free-market rate. That single choice moves the answer by roughly 50 percent.

What follows is a full calculation with every step shown. It does not end in a headline "mining profit" number, because no such number exists. It ends in a number that is specific to you: **your break-even electricity price, in toman per kilowatt-hour.** If your power costs less than that, run the machine. If it costs more, every hour it runs loses money.

## Assumptions, stated up front

| Input | Value used here | Where to get your own |
|---|---|---|
| BTC price | $110,000 | any live source |
| Free-market USD | 194,000 toman | free-market rate (Wallex / market desks) |
| Network hashrate | ~1,000 EH/s | mempool.space or btc.com |
| Block subsidy | 3.125 BTC | fixed until the next halving (~2028) |
| Pool fee | 2% | depends on your pool |

The first three change by tomorrow. The method is the durable part. For reference, one bitcoin at these inputs is 21,340,000,000 toman.

## Hashprice, derived from first principles

The network finds about 144 blocks a day. 144 × 3.125 = 450 BTC issued daily. Transaction fees have recently added on the order of 1.5 percent, so call it 457 BTC per day.

That 457 BTC is split across the whole network. 1,000 EH/s is one billion TH/s:

```
457 ÷ 1,000,000,000 = 0.00000046 BTC per TH/s per day
× $110,000          = $0.050
× 194,000 toman     = 9,700 toman
less 2% pool fee    = 9,506 toman
```

So **each terahash earns about 9,500 toman net per day.** That is the only figure the rest of the calculation needs. It rises if BTC rises or network hashrate falls, and drops otherwise.

## Break-even, machine by machine

Power draw comes straight off the spec sheet. The useful relation: one TH running for a day consumes `efficiency (J/TH) × 0.024` kWh.

| Machine | Hashrate | Power | Efficiency | Daily kWh | Net daily revenue | Break-even power |
|---|---|---|---|---|---|---|
| S19j Pro | 104 TH/s | 3,068 W | 29.5 J/TH | 73.6 kWh | 988,000 toman | **13,430 toman/kWh** |
| S19 XP | 141 TH/s | 3,010 W | 21.3 J/TH | 72.2 kWh | 1,340,000 toman | **18,550 toman/kWh** |
| S21 | 200 TH/s | 3,500 W | 17.5 J/TH | 84.0 kWh | 1,901,000 toman | **22,630 toman/kWh** |
| S21 Pro | 234 TH/s | 3,510 W | 15.0 J/TH | 84.2 kWh | 2,224,000 toman | **26,400 toman/kWh** |

An S21 mines 0.00008952 BTC net per day and burns 84 kWh doing it. Divide revenue by consumption and you have the highest power price at which it is still worth switching on.

The important thing in that table is not which machine wins, it is the spread: **the S21 Pro tolerates roughly twice the power price the S19j Pro does.** When electricity is cheap, both are profitable and the difference barely matters. When electricity is expensive, the S19 shuts off while the S21 keeps running. Efficiency is your insurance against a tariff increase, not a spec-sheet bragging point.

## Electricity tariffs, and why no published figure is trustworthy

Here is where honesty matters more than confidence: **I cannot tell you today's mining electricity tariff in Iran, and neither can any article.** That is a property of the tariff itself, not a research failure.

The mining tariff is not a fixed price, it is a formula. From the published regulations, as best they can be read:

- The base rate is **pegged to the average electricity export price and an FX conversion rate, and is re-set quarterly.**
- It carries time-of-use multipliers: mining is **prohibited outright in critical-peak hours**, charged at roughly **×2 in restricted hours** and **×0.5 in normal hours**.
- Voltage discounts apply: about 20% at 400/230 kV, about 12% at 132/66/63 kV.

Two farms with the same licence and the same machine can therefore have all-in power costs that differ by **a factor of four**, purely on which time band they run in.

### A worked example of why the old rial figure is meaningless

The most-repeated number in Persian articles is a base rate around 16,574 rials/kWh, which traces to a 1400 (2021) announcement. That is 1,657 toman. Read the same figure at two dollar rates:

- At the 2021 rate (~27,000 toman/$): **6.1 US cents/kWh** — a real, coherent tariff.
- At today's free-market rate (194,000 toman/$): **0.85 cents/kWh** — a price no grid on earth sells power at.

That arithmetic alone proves the rial figure has necessarily been revised. Any article quoting the 2021 number as current will overstate your profit by a large multiple.

**What to actually do:** take the number from your own bill or your hosting contract, not from an article. If you hold a licence, the current quarterly notice from Tavanir and your regional distribution company is the authority. If you are in a hosting facility, ask whether the price is per kWh or per machine per month, and whether the time-of-use multiplier is passed through to you. And a serious warning: mining on a residential or agricultural connection is not merely a tariff question — it is a legal exposure, and the consequence is not limited to a large bill. Check that with a lawyer, not a blog post.

## Monthly profit across three power prices

Rather than guess the tariff, here are three prices; locate yourself among them. 30-day month, full uptime:

| Power price | S19j Pro (73.6 kWh/day) | S21 (84 kWh/day) |
|---|---|---|
| 2,000 toman/kWh | +25,240,000 toman | +51,996,000 toman |
| 5,000 toman/kWh | +18,613,000 toman | +44,436,000 toman |
| 10,000 toman/kWh | +7,569,000 toman | +31,836,000 toman |
| 13,430 toman/kWh | zero | +25,000,000 toman |
| 22,630 toman/kWh | heavy loss | zero |

Now apply the time-of-use multiplier. If your normal-hours rate is 5,000 toman, restricted hours (×2 on base, i.e. four times the normal-hours rate) put you at 20,000 toman. In those hours the S19j Pro is firmly loss-making and the S21 is running at roughly break-even. **For older-generation hardware, shutting down during restricted hours is an economic decision, not just a regulatory one.**

## The costs that beat the pool fee

On one S21, per day, in toman:

- 2% pool fee: **38,800**
- 4% downtime (about one hour a day — entirely normal with grid interruptions and restarts): **76,000**
- 1% rejected shares: **19,000**

One hour of downtime a day costs twice the entire pool fee. When you choose between a 2% pool and a 1% pool you are negotiating over 19,000 toman a day, while a bad network path or an unstable link can quietly take several times that. Order your priorities accordingly: uptime first, reject rate second, fee third. (Hashrial displays hashprice in toman at the live free-market rate, which saves doing this conversion by hand.)

## Payback, and the trap in it

Suppose an S21 landed at 850 million toman all-in — replace that with your own invoice, since retail prices move daily. At 5,000 toman/kWh and 44.4 million toman monthly profit:

```
850 ÷ 44.4 = about 19 months of running
```

But 19 months of *running* is not 19 *calendar* months. If summer curtailment leaves you with eight working months a year, that becomes roughly 29 calendar months. More importantly, the sum assumes hashprice holds, and it does not. Network hashrate trends upward and the revenue per terahash trends down.

Run the sensitivity. If hashprice falls 25 percent — unremarkable over a year:

| | New break-even | Monthly profit at 5,000 toman/kWh |
|---|---|---|
| S19j Pro | 10,070 toman/kWh | 11,199,000 toman |
| S21 | 16,975 toman/kWh | 30,177,000 toman |

The S19j Pro loses over 40 percent of its profit. **Any payback calculation longer than about twelve months that assumes constant hashprice is optimistic.** The conservative version: cut today's figure by 25 to 30 percent, then decide.

## Five numbers to have before you decide

1. **Your electricity price in toman per kWh** — from the bill or the contract, with the time-of-use multiplier, not from an article.
2. **Your machine's real hashrate and wall power** — read the panel, not the datasheet. Used hardware and undervolted firmware behave differently.
3. **Today's hashprice in toman at the free-market rate** — not the reference rate.
4. **Last month's actual uptime** — not a hypothetical 100 percent.
5. **How many months a year you can genuinely run** — for payback.

With those five, "should I switch it on tonight" is one division. Without them, any profit figure handed to you is a guess.
