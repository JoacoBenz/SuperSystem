// Balance the General Ledger by plugging the seeded opening-balance imbalance into
// an "Opening Balance Equity" account (code 3900) per tenant, so the Balance Sheet
// ties out (Assets = Liabilities + Equity + Net Income). Idempotent: re-running only
// adjusts by the residual, so a balanced ledger is left untouched.
//
//   node prisma/setup-opening-balance.js
//
require('dotenv').config();
const { Client } = require('pg');

async function main() {
  const c = new Client({ connectionString: process.env.DIRECT_URL || process.env.DATABASE_URL });
  await c.connect();

  const tenants = (await c.query(`SELECT DISTINCT tenant_id FROM chart_of_accounts`)).rows.map(r => r.tenant_id);
  for (const tid of tenants) {
    const rows = (await c.query(
      `SELECT type, COALESCE(SUM(balance),0)::float8 AS total FROM chart_of_accounts WHERE tenant_id=$1 GROUP BY type`,
      [tid],
    )).rows;
    const t = Object.fromEntries(rows.map(r => [r.type, Number(r.total)]));
    const assets = t.asset || 0, liab = t.liability || 0, equity = t.equity || 0, rev = t.revenue || 0, exp = t.expense || 0;
    const netIncome = rev - exp;
    // Same identity computeStatements() checks: difference = Assets − Liabilities − (Equity + Net Income).
    const difference = Math.round((assets - liab - equity - netIncome) * 100) / 100;

    if (Math.abs(difference) < 0.01) { console.log(`tenant ${tid}: already balanced`); continue; }

    const user = (await c.query(`SELECT id FROM users WHERE tenant_id=$1 ORDER BY id ASC LIMIT 1`, [tid])).rows[0];
    const createdBy = user ? user.id : 1;
    // Adding `difference` to an equity account drives the difference to zero.
    const existing = (await c.query(`SELECT id FROM chart_of_accounts WHERE tenant_id=$1 AND code='3900'`, [tid])).rows[0];
    if (existing) {
      await c.query(`UPDATE chart_of_accounts SET balance = balance + $2, updated_at=CURRENT_TIMESTAMP WHERE id=$1`, [existing.id, difference]);
    } else {
      await c.query(
        `INSERT INTO chart_of_accounts (tenant_id, code, name, type, balance, is_active, created_by)
         VALUES ($1,'3900','Opening Balance Equity','equity',$2,true,$3)`,
        [tid, difference, createdBy],
      );
    }
    console.log(`tenant ${tid}: plugged ${difference} into 3900 Opening Balance Equity`);
  }
  await c.end();
}

main().catch(e => { console.error(e); process.exit(1); });
