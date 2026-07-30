---
slug: "connect-asic-to-mining-pool-from-iran"
lang: "en"
title: "Connecting an ASIC to a pool from Iran: ports and stales"
description: "Why your miner won't connect, which alternate stratum ports to try, what a proxy actually changes, and how to read accepted vs stale shares to diagnose your own rig."
date: "2026-07-30"
primaryKeyword: "اتصال ماینر به استخر"
keywords: ["اتصال ماینر به استخر", "چرا ماینر به استخر وصل نمیشه", "ریجکت ماینر چیست", "راه حل ریجکت ماینر", "علت ریجکت ماینر", "تنظیمات استخر ماینر", "کانفیگ ماینر", "ورکر ماینر", "استخر استخراج بیت کوین با نت ملی", "ماینر چقدر اینترنت مصرف میکند", "هش ریت ماینر", "کارمزد استخر", "stratum port 3333 blocked", "accepted vs stale shares", "braiins pool worker name"]
dir: "ltr"
status: "published"
---

If the miner is powered, fans are spinning, and no worker appears in the pool dashboard, the cause is almost always one of three things: the address, the port, or the worker name. And if it is connected but showing a high reject rate, the cause is almost never "Iranian internet" — the arithmetic below shows why.

## What Stratum actually is

Stratum v1 is a plain TCP connection carrying line-delimited JSON. The miner opens one socket, sends `mining.subscribe`, then `mining.authorize` with a worker name and password. The pool pushes jobs with `mining.notify`; the miner returns work with `mining.submit`. No encryption, not HTTP, and — the part that matters most — a single long-lived connection that stays open for hours.

Two practical consequences follow. Any middlebox doing payload inspection can read it and identify it as mining, so changing the port alone is not always enough. And anything that kills long-lived connections — NAT timeouts on a consumer router, multi-second link drops, injected resets — hurts mining specifically, even when web browsing on the same line looks flawless.

## Address and worker naming

For Braiins Pool, which uses a single-account model, the three firmware fields are:

| Field | Example | Note |
|---|---|---|
| URL | `stratum+tcp://stratum.braiins.com:3333` | One global URL; the old regional hostnames are deprecated |
| Worker | `username.rig01` | The part before the dot must be *exactly* your account username |
| Password | `x` | Usually ignored; some pools accept `d=8192` to pin difficulty |

Naming rules that earn their keep: ASCII lowercase only, no spaces, under 32 characters, and **never the same name on two machines**. If ten miners are all `worker1`, their statistics merge in the dashboard and you can no longer tell which box is rejecting shares. Encode location instead: `karaj-r2-s19-04`.

That one distinction does half your debugging: **if the worker never appears in the dashboard, authorization or the connection failed; if it appears but shows zero hashrate, authorization succeeded and the problem is elsewhere.**

## Port 3333 and the alternates

High, non-standard ports are the cheapest thing for a filtering middlebox to drop. Braiins publishes three — 3333, 443 and 25 — and their odds are not equal:

- **3333** is the standard stratum port and the first thing blocked.
- **443** looks like HTTPS to a stateless filter and has the best chance. But note that the traffic on 443 is still unencrypted stratum, so inspection that reads *payload* will still recognise it.
- **25** is SMTP, which many ISPs block outbound to limit spam. If it fails, that may have nothing to do with filtering at all.

Stratum V2 is encrypted and changes the traffic fingerprint entirely, but stock Antminer firmware generally does not support it — you need Braiins OS+. Get the current V2 hostname and port from Braiins' own docs, not from an article.

Fill all three Pool 1/2/3 slots with the same account on different ports. But understand that failover is not instant: firmware retries the primary for tens of seconds before moving on. **An unstable primary is worse than a completely dead one**, because the miner keeps going back to it.

## What a proxy or forwarding pool changes

A stratum proxy gives you a locally reachable endpoint and maintains its own connection upstream. What it solves is reachability, not physics: your total latency becomes you-to-proxy plus proxy-to-pool. If the proxy sits inside Iran, the first leg is 5–30 ms and the second is fixed.

Three things change, and you should know them before deciding:

1. **Your worker name is rewritten upstream.** In an aggregate-account model all hashrate lands under one account, so you will not find your worker in the upstream pool's dashboard. Accounting moves to the operator's ledger. That is the real trade: you are trusting someone else's share counter. The minimum you should demand is per-worker accepted and stale counts, not just a balance. (Hashrial uses this model and takes its 2% on the share stream, keeping per-user share records on its own side.)
2. **Fees stack** — upstream pool fee plus the intermediary's.
3. **You add a failure point.** If the proxy goes down, your miner idles even though the pool is perfectly healthy. If an international pool is reachable at all, keep it in slot 3.

## Is it the network or the pool?

From a laptop on the same switch, in this order:

1. **DNS:** `nslookup stratum.braiins.com`. If it resolves to one of the `10.10.34.x` addresses, you are being filtered at DNS and never reached the destination.
2. **TCP:** `nc -vz stratum.braiins.com 3333` (on Windows, `Test-NetConnection -ComputerName stratum.braiins.com -Port 3333`). A SYN with no reply means packets are being dropped; an immediate RST means an injected reset.
3. **A real stratum handshake:** `printf '{"id":1,"method":"mining.subscribe","params":["t"]}\n' | nc stratum.braiins.com 3333`. Getting a JSON line back is the only test that proves the path is clear at the payload level. Step 2 can pass while this fails — that gap is exactly where content inspection lives.
4. **Line quality over ten minutes:** `ping -c 600`. Read the loss percentage and mdev, not the average.

Then this table, which is the most useful thing here:

| Symptom | Usually means |
|---|---|
| Worker never appears in the dashboard | Account/worker name, or a blocked port |
| Appears, zero hashrate | Auth fine; submits blocked or hashboards down |
| Reconnects every few minutes | NAT timeout, link flap, or injected reset |
| All miners, same instant, across two separate sites | The pool or an upstream route |
| One miner out of ten | That machine: board, fan, cable, PSU |

Always check correlation across machines first. One bad miner out of ten is never a pool problem.

## Reading accepted vs stale

An accepted share is valid work for the current job. A stale share arrived for a job that was no longer current. Healthy is under 1%, and typically under 0.5% on a sound machine.

Now the substance. Assume 120 ms round-trip to Europe, and a vulnerable window after each block — block propagation to the pool, new job construction, `mining.notify` reaching you — of roughly 0.4 seconds. Blocks arrive every 600 seconds on average. The fraction of your shares caught in that window:

```
0.4 ÷ 600 ≈ 0.07%
```

Even at a generous one-second window you reach 0.17%. **Geographic latency cannot produce a 3% reject rate.** If yours is 3%, look here instead:

- **`low difficulty share`** — a share below target. Almost always local: overclocking, heat, a failing board, PSU voltage sag.
- **`duplicate share`** — proxy misconfiguration or an extranonce collision.
- **`unauthorized`** — worker naming.
- **`job not found` / genuine stales** — a lost packet and a retransmit. Look at packet loss and jitter, not mean ping. A line with 3% loss can generate stales while its average latency looks excellent.

Two traps when reading these numbers. **Hardware (HW) errors are a separate column and always local** — a machine at 2% HW error is losing 2% of revenue regardless of which pool it uses. And if your share count halves while hashrate is unchanged, the pool raised your vardiff. That is not a fault.

## Bandwidth, with the arithmetic

A 100 TH/s machine at difficulty 65536 submits `10^14 ÷ (65536 × 2^32) ≈ 0.36` shares per second — about 21 per minute. Each submit plus its response is roughly 260 bytes; add job pushes (a few KB every 30 seconds) and TCP/IP header overhead and you land near **250 bytes per second, about 22 MB per day, comfortably under 1 GB per month**. That is an estimate and sensitive to the difficulty the pool assigns, but the order of magnitude holds — and the widely repeated "32 KB/s" figure is more than a hundred times higher.

The operational takeaway: bandwidth is never the constraint. Stability is. A 1 Mbps line at 0.2% loss beats a 50 Mbps line at 3% loss for mining.

## What to verify yourself

Do not accept any figure about licensing, mining electricity tariffs, or prohibited hours — from this article or any other — as the current state. Iran's mining tariff is a formula that is re-set quarterly and carries time-of-use multipliers; any article that prints it as a fixed number is wrong the following quarter. The authority is the official Tavanir announcement, your regional distribution company, and your own bill. The legal position on reaching pools by alternate routes is also unsettled; decide for yourself, and distrust anyone who speaks about it with certainty.

One last thing worth doing: log every miner from day one — date, port, stale percentage, HW percentage. Three weeks later, when "is it the pool or is it me?" comes up, the answer is in that file.
