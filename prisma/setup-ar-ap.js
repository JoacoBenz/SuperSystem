// Provision the Phase 1 AR/AP permissions and attach them to the relevant roles.
// Mirrors the existing prisma/setup-*.js + grant-*.ts seeding pattern. Idempotent.
//
//   node prisma/setup-ar-ap.js
//
require('dotenv').config();
const { Client } = require('pg');

const PERMS = [
  ['sales', 'invoice', 'read', 'View customer (AR) invoices'],
  ['sales', 'invoice', 'manage', 'Create, issue and collect AR invoices'],
  ['procurement', 'invoice', 'read', 'View vendor (AP) invoices'],
  ['procurement', 'invoice', 'manage', 'Create, approve and pay AP invoices'],
];

// Canonical role → permission grants, matching the RoleDefinitions in code.
const ROLE_GRANTS = {
  'sales.admin': ['sales.invoice.read', 'sales.invoice.manage'],
  'sales.rep': ['sales.invoice.read', 'sales.invoice.manage'],
  'sales.viewer': ['sales.invoice.read'],
  'buyer': ['procurement.invoice.read', 'procurement.invoice.manage'],
  'procurement.buyer': ['procurement.invoice.read', 'procurement.invoice.manage'],
  'treasurer': ['procurement.invoice.read', 'procurement.invoice.manage'],
  'procurement.treasurer': ['procurement.invoice.read', 'procurement.invoice.manage'],
};

async function main() {
  const c = new Client({ connectionString: process.env.DIRECT_URL || process.env.DATABASE_URL });
  await c.connect();

  // 1. Upsert the (global) permission rows.
  const permId = {};
  for (const [m, r, a, d] of PERMS) {
    const res = await c.query(
      `INSERT INTO permissions (module_id, resource, action, description)
         VALUES ($1,$2,$3,$4)
       ON CONFLICT (module_id, resource, action) DO UPDATE SET description = EXCLUDED.description
       RETURNING id`,
      [m, r, a, d],
    );
    permId[`${m}.${r}.${a}`] = res.rows[0].id;
  }

  const attach = (roleId, pid) =>
    c.query(`INSERT INTO role_permissions (role_id, permission_id) VALUES ($1,$2) ON CONFLICT DO NOTHING`, [roleId, pid]);

  // 2. Attach to every matching role (per tenant + system roles), per the definitions.
  let grants = 0;
  for (const [roleName, perms] of Object.entries(ROLE_GRANTS)) {
    const roles = (await c.query(`SELECT id FROM roles WHERE name = $1`, [roleName])).rows;
    for (const role of roles) for (const pk of perms) { await attach(role.id, permId[pk]); grants++; }
  }

  // 3. Demo convenience: ensure admin@demo.com can exercise both AR and AP end-to-end,
  //    whatever roles it currently holds (same spirit as grant-finance-admin.ts).
  const tenant = (await c.query(`SELECT id FROM tenants WHERE slug = 'demo' LIMIT 1`)).rows[0];
  let adminRoles = [];
  if (tenant) {
    const admin = (await c.query(`SELECT id FROM users WHERE tenant_id = $1 AND email = 'admin@demo.com' LIMIT 1`, [tenant.id])).rows[0];
    if (admin) {
      adminRoles = (await c.query(`SELECT role_id FROM user_roles WHERE user_id = $1`, [admin.id])).rows.map(r => r.role_id);
      for (const roleId of adminRoles) for (const pid of Object.values(permId)) await attach(roleId, pid);
    }
  }

  console.log('AR/AP permissions synced:', permId);
  console.log('Canonical role grants applied:', grants, '| admin@demo.com roles:', adminRoles);
  await c.end();
}

main().catch(e => { console.error(e); process.exit(1); });
