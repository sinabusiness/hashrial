"use strict";

const NOTIFY_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes
let notifierRunning = false;

// ── Check for offline workers ────────────────────────────────
async function checkOfflineWorkers(pg) {
    // Workers that went offline in the last poll window (seen online recently, now offline)
    const { rows } = await pg.query(`
        SELECT u.id AS user_id, u.notify_offline, w.worker_name, w.last_seen
        FROM workers w
        JOIN users u ON u.id = w.user_id
        WHERE w.status = 'offline'
          AND w.last_seen > NOW() - INTERVAL '10 minutes'
          AND u.notify_offline = TRUE
    `);

    for (const row of rows) {
        // Dedup: don't insert if we already notified about this worker going offline recently
        const existing = await pg.query(`
            SELECT id FROM notifications
            WHERE user_id = $1
              AND type = 'worker_offline'
              AND message LIKE $2
              AND created_at > NOW() - INTERVAL '1 hour'
        `, [row.user_id, `%${row.worker_name}%`]);

        if (existing.rows.length > 0) continue;

        await pg.query(`
            INSERT INTO notifications (user_id, type, title, message)
            VALUES ($1, 'worker_offline', $2, $3)
        `, [
            row.user_id,
            'Worker Offline',
            `Worker "${row.worker_name}" has gone offline. Last seen: ${new Date(row.last_seen).toUTCString()}.`,
        ]);
        console.log(`[notifier] Worker offline alert → user=${row.user_id} worker=${row.worker_name}`);
    }
}

// ── Check for hashrate drops ─────────────────────────────────
async function checkHashrateDrops(pg) {
    // Compare latest vs previous hashrate snapshot for each user
    const { rows } = await pg.query(`
        SELECT DISTINCT ON (h.user_id)
               h.user_id, h.hs_1h AS current_hs,
               u.notify_hashrate, u.notify_threshold,
               prev.hs_1h AS prev_hs
        FROM hashrate_history h
        JOIN users u ON u.id = h.user_id
        JOIN LATERAL (
            SELECT hs_1h FROM hashrate_history
            WHERE user_id = h.user_id
              AND worker_name IS NULL
              AND ts < h.ts
            ORDER BY ts DESC
            LIMIT 1
        ) prev ON TRUE
        WHERE h.worker_name IS NULL
          AND u.notify_hashrate = TRUE
          AND prev.hs_1h > 0
          AND h.hs_1h > 0
        ORDER BY h.user_id, h.ts DESC
    `);

    for (const row of rows) {
        const threshold = parseFloat(row.notify_threshold || 20);
        const dropPct   = ((row.prev_hs - row.current_hs) / row.prev_hs) * 100;

        if (dropPct < threshold) continue;

        // Dedup: avoid re-notifying within 2 hours
        const existing = await pg.query(`
            SELECT id FROM notifications
            WHERE user_id = $1
              AND type = 'hashrate_drop'
              AND created_at > NOW() - INTERVAL '2 hours'
        `, [row.user_id]);

        if (existing.rows.length > 0) continue;

        await pg.query(`
            INSERT INTO notifications (user_id, type, title, message)
            VALUES ($1, 'hashrate_drop', $2, $3)
        `, [
            row.user_id,
            'Hashrate Drop Detected',
            `Your pool hashrate dropped by ${dropPct.toFixed(1)}% (from ${row.prev_hs.toFixed(2)} to ${row.current_hs.toFixed(2)} TH/s). Check your miners.`,
        ]);
        console.log(`[notifier] Hashrate drop alert → user=${row.user_id} drop=${dropPct.toFixed(1)}%`);
    }
}

// ── Check for workers back online ────────────────────────────
async function checkWorkersOnline(pg) {
    // Workers that came back online (offline notification was sent, now online again)
    const { rows } = await pg.query(`
        SELECT DISTINCT n.user_id, w.worker_name
        FROM notifications n
        JOIN workers w ON w.user_id = n.user_id
          AND n.message LIKE '%' || w.worker_name || '%'
        WHERE n.type = 'worker_offline'
          AND n.created_at > NOW() - INTERVAL '24 hours'
          AND w.status = 'online'
          AND NOT EXISTS (
              SELECT 1 FROM notifications n2
              WHERE n2.user_id = n.user_id
                AND n2.type = 'worker_online'
                AND n2.message LIKE '%' || w.worker_name || '%'
                AND n2.created_at > n.created_at
          )
    `);

    for (const row of rows) {
        await pg.query(`
            INSERT INTO notifications (user_id, type, title, message)
            VALUES ($1, 'worker_online', $2, $3)
        `, [
            row.user_id,
            'Worker Back Online',
            `Worker "${row.worker_name}" is back online and mining normally.`,
        ]);
        console.log(`[notifier] Worker online alert → user=${row.user_id} worker=${row.worker_name}`);
    }
}

// ── Main notifier cycle ──────────────────────────────────────
async function runNotifier(pg) {
    if (notifierRunning) return;
    notifierRunning = true;
    try {
        await checkOfflineWorkers(pg);
        await checkHashrateDrops(pg);
        await checkWorkersOnline(pg);
    } catch (e) {
        console.error("[notifier] Error:", e.message);
    } finally {
        notifierRunning = false;
    }
}

function startNotifier(pg, redis) {
    setTimeout(() => runNotifier(pg), 30000);
    setInterval(() => runNotifier(pg), NOTIFY_INTERVAL_MS);
    console.log(`[notifier] Started — interval ${NOTIFY_INTERVAL_MS / 1000}s`);
}

module.exports = { startNotifier };
