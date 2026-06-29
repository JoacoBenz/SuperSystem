// Provision the Phase 2 product-master permissions and attach them to the inventory
// roles. Mirrors the setup-*/grant-* seeding pattern. Idempotent.
//
//   node prisma/setup-products.js
//
require('dotenv').config();
const { Client } = require('pg');

const PERMS = [
  ['inventory', 'product', 'read', 'View the product / material master'],
  ['inventory', 'product', 'manage', 'Create, edit and retire products'],
];
const ROLE_GRANTS = {
  'inventory.warehouse_manager': ['inventory.product.read', 'inventory.product.manage'],
  'inventory.viewer': ['inventory.product.read'],
};

async function main() {
  const c = new Client({ connectionString: process.env.DIRECT_URL || process.env.DATABASE_URL });
  await c.connect();

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

  let grants = 0;
  for (const [roleName, perms] of Object.entries(ROLE_GRANTS)) {
    const roles = (await c.query(`SELECT id FROM roles WHERE name = $1`, [roleName])).rows;
    for (const role of roles) for (const pk of perms) { await attach(role.id, permId[pk]); grants++; }
  }

  // Demo convenience: ensure admin@demo.com can use the catalog whatever roles it holds.
  const tenant = (await c.query(`SELECT id FROM tenants WHERE slug='demo' LIMIT 1`)).rows[0];
  let adminRoles = [];
  if (tenant) {
    const admin = (await c.query(`SELECT id FROM users WHERE tenant_id=$1 AND email='admin@demo.com' LIMIT 1`, [tenant.id])).rows[0];
    if (admin) {
      adminRoles = (await c.query(`SELECT role_id FROM user_roles WHERE user_id=$1`, [admin.id])).rows.map(r => r.role_id);
      for (const roleId of adminRoles) for (const pid of Object.values(permId)) await attach(roleId, pid);
    }
  }

  console.log('Product permissions synced:', permId, '| role grants:', grants, '| admin roles:', adminRoles.length);
  await c.end();
}

main().catch(e => { console.error(e); process.exit(1); });
