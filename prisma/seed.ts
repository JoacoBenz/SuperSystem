import { PrismaClient } from '../app/generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { hash } from 'bcryptjs';

const connectionString = process.env.DATABASE_URL ?? process.env.DIRECT_URL!;
const prisma = new PrismaClient({ adapter: new PrismaPg(connectionString) });

const PROCUREMENT_PERMISSIONS = [
  { resource: 'purchase_request', action: 'create', description: 'Create purchase requests' },
  { resource: 'purchase_request', action: 'read_own', description: 'View own purchase requests' },
  { resource: 'purchase_request', action: 'read_department', description: 'View department purchase requests' },
  { resource: 'purchase_request', action: 'read_all', description: 'View all purchase requests' },
  { resource: 'purchase_request', action: 'update_own', description: 'Edit own draft purchase requests' },
  { resource: 'purchase_request', action: 'submit', description: 'Submit purchase requests for review' },
  { resource: 'purchase_request', action: 'validate', description: 'Validate department purchase requests' },
  { resource: 'purchase_request', action: 'return', description: 'Return purchase requests to requester' },
  { resource: 'purchase_request', action: 'approve', description: 'Approve purchase requests' },
  { resource: 'purchase_request', action: 'reject', description: 'Reject purchase requests' },
  { resource: 'purchase_request', action: 'cancel', description: 'Cancel purchase requests' },
  { resource: 'purchase_request', action: 'process', description: 'Process approved purchase requests' },
  { resource: 'purchase_request', action: 'schedule_payment', description: 'Schedule payment for purchase requests' },
  { resource: 'purchase_request', action: 'close', description: 'Close completed purchase requests' },
  { resource: 'purchase_request', action: 'export', description: 'Export purchase request reports' },
  { resource: 'purchase_order', action: 'create', description: 'Create purchase orders' },
  { resource: 'purchase_order', action: 'read', description: 'View purchase orders' },
  { resource: 'reception', action: 'create', description: 'Record goods reception' },
  { resource: 'reception', action: 'read', description: 'View reception records' },
  { resource: 'vendor', action: 'read', description: 'View vendors' },
  { resource: 'vendor', action: 'manage', description: 'Create, edit, delete vendors' },
  { resource: 'cost_center', action: 'read', description: 'View cost centers' },
  { resource: 'cost_center', action: 'manage', description: 'Create, edit, delete cost centers' },
];

const PROCUREMENT_ROLES: Array<{ name: string; displayName: string; permissions: string[] }> = [
  {
    name: 'procurement.requester',
    displayName: 'Requester',
    permissions: [
      'procurement.purchase_request.create',
      'procurement.purchase_request.read_own',
      'procurement.purchase_request.update_own',
      'procurement.purchase_request.submit',
      'procurement.reception.create',
      'procurement.reception.read',
      'procurement.vendor.read',
      'procurement.cost_center.read',
    ],
  },
  {
    name: 'procurement.validator',
    displayName: 'Validator',
    permissions: [
      'procurement.purchase_request.read_department',
      'procurement.purchase_request.validate',
      'procurement.purchase_request.return',
      'procurement.vendor.read',
      'procurement.cost_center.read',
    ],
  },
  {
    name: 'procurement.approver',
    displayName: 'Approver',
    permissions: [
      'procurement.purchase_request.read_all',
      'procurement.purchase_request.approve',
      'procurement.purchase_request.reject',
      'procurement.purchase_request.return',
      'procurement.purchase_request.cancel',
      'procurement.vendor.read',
      'procurement.cost_center.read',
    ],
  },
  {
    name: 'procurement.buyer',
    displayName: 'Buyer',
    permissions: [
      'procurement.purchase_request.read_all',
      'procurement.purchase_request.process',
      'procurement.purchase_request.schedule_payment',
      'procurement.purchase_order.create',
      'procurement.purchase_order.read',
      'procurement.vendor.manage',
      'procurement.vendor.read',
      'procurement.cost_center.read',
    ],
  },
  {
    name: 'procurement.treasurer',
    displayName: 'Treasurer',
    permissions: [
      'procurement.purchase_request.read_all',
      'procurement.purchase_request.close',
      'procurement.purchase_order.read',
      'procurement.purchase_order.create',
      'procurement.reception.read',
      'procurement.vendor.read',
      'procurement.cost_center.manage',
      'procurement.cost_center.read',
      'procurement.purchase_request.export',
    ],
  },
];

const INVENTORY_PERMISSIONS = [
  { resource: 'product', action: 'read', description: 'View products' },
  { resource: 'product', action: 'create', description: 'Create products' },
  { resource: 'product', action: 'manage', description: 'Create, edit, delete products' },
  { resource: 'product_category', action: 'read', description: 'View product categories' },
  { resource: 'product_category', action: 'manage', description: 'Manage product categories' },
  { resource: 'warehouse', action: 'read', description: 'View warehouses' },
  { resource: 'warehouse', action: 'manage', description: 'Manage warehouses' },
  { resource: 'stock_level', action: 'read', description: 'View stock levels' },
  { resource: 'stock_movement', action: 'read', description: 'View stock movements' },
  { resource: 'stock_movement', action: 'create', description: 'Create stock movements' },
];

const INVENTORY_ROLES: Array<{ name: string; displayName: string; permissions: string[] }> = [
  {
    name: 'inventory.viewer',
    displayName: 'Viewer',
    permissions: [
      'inventory.product.read',
      'inventory.product_category.read',
      'inventory.warehouse.read',
      'inventory.stock_level.read',
      'inventory.stock_movement.read',
    ],
  },
  {
    name: 'inventory.operator',
    displayName: 'Operator',
    permissions: [
      'inventory.product.read',
      'inventory.product_category.read',
      'inventory.warehouse.read',
      'inventory.stock_level.read',
      'inventory.stock_movement.read',
      'inventory.stock_movement.create',
    ],
  },
  {
    name: 'inventory.manager',
    displayName: 'Manager',
    permissions: [
      'inventory.product.read',
      'inventory.product.create',
      'inventory.product.manage',
      'inventory.product_category.read',
      'inventory.product_category.manage',
      'inventory.warehouse.read',
      'inventory.warehouse.manage',
      'inventory.stock_level.read',
      'inventory.stock_movement.read',
      'inventory.stock_movement.create',
    ],
  },
];

async function main() {
  console.log('Seeding database...');

  // 0. Create platform tenant (for super_admin only)
  const platformTenant = await prisma.tenant.upsert({
    where: { slug: 'platform' },
    update: {},
    create: {
      name: 'Platform',
      slug: 'platform',
      contactEmail: 'platform@erp.local',
      currency: 'USD',
      timezone: 'UTC',
    },
  });
  console.log(`Platform tenant: ${platformTenant.name} (id: ${platformTenant.id})`);

  // Super Admin (platform owner - no business tenant)
  const passwordHash = await hash('password123', 10);
  const superAdminUser = await prisma.user.upsert({
    where: { tenantId_email: { tenantId: platformTenant.id, email: 'superadmin@erp.com' } },
    update: {},
    create: {
      tenantId: platformTenant.id,
      email: 'superadmin@erp.com',
      name: 'System Owner',
      passwordHash,
      orgRole: 'super_admin',
    },
  });
  console.log(`User: ${superAdminUser.name} (super_admin on platform tenant)`);

  // 1. Create demo tenant
  const tenant = await prisma.tenant.upsert({
    where: { slug: 'demo' },
    update: {},
    create: {
      name: 'Demo Company',
      slug: 'demo',
      contactEmail: 'admin@demo.com',
      currency: 'USD',
      timezone: 'America/New_York',
    },
  });
  console.log(`Tenant: ${tenant.name} (id: ${tenant.id})`);

  // 2. Enable procurement module for the tenant
  await prisma.tenantModule.upsert({
    where: { tenantId_moduleId: { tenantId: tenant.id, moduleId: 'procurement' } },
    update: { enabled: true },
    create: { tenantId: tenant.id, moduleId: 'procurement', enabled: true },
  });
  console.log('Procurement module enabled');

  // 3. Create permissions
  const permissionMap = new Map<string, number>();
  for (const p of PROCUREMENT_PERMISSIONS) {
    const perm = await prisma.permission.upsert({
      where: {
        moduleId_resource_action: {
          moduleId: 'procurement',
          resource: p.resource,
          action: p.action,
        },
      },
      update: { description: p.description },
      create: {
        moduleId: 'procurement',
        resource: p.resource,
        action: p.action,
        description: p.description,
      },
    });
    permissionMap.set(`procurement.${p.resource}.${p.action}`, perm.id);
  }
  console.log(`Created ${permissionMap.size} permissions`);

  // 4. Create system roles and link permissions
  for (const roleDef of PROCUREMENT_ROLES) {
    const role = await prisma.role.upsert({
      where: {
        tenantId_name: { tenantId: tenant.id, name: roleDef.name },
      },
      update: { description: roleDef.displayName, isSystem: true, moduleId: 'procurement' },
      create: {
        tenantId: tenant.id,
        name: roleDef.name,
        displayName: roleDef.displayName,
        description: roleDef.displayName,
        isSystem: true,
        moduleId: 'procurement',
      },
    });

    // Clear existing role permissions and re-create
    await prisma.rolePermission.deleteMany({ where: { roleId: role.id } });
    for (const permKey of roleDef.permissions) {
      const permId = permissionMap.get(permKey);
      if (permId) {
        await prisma.rolePermission.create({
          data: { roleId: role.id, permissionId: permId },
        });
      }
    }
    console.log(`Role: ${roleDef.name} (${roleDef.permissions.length} permissions)`);
  }

  // 5. Create departments
  const deptOps = await prisma.department.upsert({
    where: { tenantId_name: { tenantId: tenant.id, name: 'Operations' } },
    update: {},
    create: { tenantId: tenant.id, name: 'Operations' },
  });

  const deptFinance = await prisma.department.upsert({
    where: { tenantId_name: { tenantId: tenant.id, name: 'Finance' } },
    update: {},
    create: { tenantId: tenant.id, name: 'Finance' },
  });

  const deptPurchasing = await prisma.department.upsert({
    where: { tenantId_name: { tenantId: tenant.id, name: 'Purchasing' } },
    update: {},
    create: { tenantId: tenant.id, name: 'Purchasing' },
  });

  const deptIT = await prisma.department.upsert({
    where: { tenantId_name: { tenantId: tenant.id, name: 'IT' } },
    update: {},
    create: { tenantId: tenant.id, name: 'IT' },
  });
  console.log('Departments created');

  // 6. Create users with different roles

  // Admin user
  const adminUser = await prisma.user.upsert({
    where: { tenantId_email: { tenantId: tenant.id, email: 'admin@demo.com' } },
    update: {},
    create: {
      tenantId: tenant.id,
      email: 'admin@demo.com',
      name: 'Carlos Admin',
      passwordHash,
      orgRole: 'admin',
      departmentId: deptIT.id,
    },
  });
  console.log(`User: ${adminUser.name} (admin)`);

  // Requester
  const requesterUser = await prisma.user.upsert({
    where: { tenantId_email: { tenantId: tenant.id, email: 'maria@demo.com' } },
    update: {},
    create: {
      tenantId: tenant.id,
      email: 'maria@demo.com',
      name: 'Maria Requester',
      passwordHash,
      orgRole: 'member',
      departmentId: deptOps.id,
    },
  });

  // Validator (dept manager)
  const validatorUser = await prisma.user.upsert({
    where: { tenantId_email: { tenantId: tenant.id, email: 'juan@demo.com' } },
    update: {},
    create: {
      tenantId: tenant.id,
      email: 'juan@demo.com',
      name: 'Juan Validator',
      passwordHash,
      orgRole: 'member',
      departmentId: deptOps.id,
    },
  });

  // Approver
  const approverUser = await prisma.user.upsert({
    where: { tenantId_email: { tenantId: tenant.id, email: 'ana@demo.com' } },
    update: {},
    create: {
      tenantId: tenant.id,
      email: 'ana@demo.com',
      name: 'Ana Approver',
      passwordHash,
      orgRole: 'member',
      departmentId: deptFinance.id,
    },
  });

  // Buyer
  const buyerUser = await prisma.user.upsert({
    where: { tenantId_email: { tenantId: tenant.id, email: 'pedro@demo.com' } },
    update: {},
    create: {
      tenantId: tenant.id,
      email: 'pedro@demo.com',
      name: 'Pedro Buyer',
      passwordHash,
      orgRole: 'member',
      departmentId: deptOps.id,
    },
  });

  // Treasurer
  const treasurerUser = await prisma.user.upsert({
    where: { tenantId_email: { tenantId: tenant.id, email: 'laura@demo.com' } },
    update: {},
    create: {
      tenantId: tenant.id,
      email: 'laura@demo.com',
      name: 'Laura Treasurer',
      passwordHash,
      orgRole: 'member',
      departmentId: deptFinance.id,
    },
  });
  console.log('Users created');

  // 7. Assign module roles to users
  const roleAssignments: Array<{ userId: number; roleName: string }> = [
    { userId: requesterUser.id, roleName: 'procurement.requester' },
    { userId: validatorUser.id, roleName: 'procurement.validator' },
    { userId: validatorUser.id, roleName: 'procurement.requester' },
    { userId: approverUser.id, roleName: 'procurement.approver' },
    { userId: buyerUser.id, roleName: 'procurement.buyer' },
    { userId: buyerUser.id, roleName: 'procurement.requester' },
    { userId: treasurerUser.id, roleName: 'procurement.treasurer' },
  ];

  for (const { userId, roleName } of roleAssignments) {
    const role = await prisma.role.findUnique({
      where: { tenantId_name: { tenantId: tenant.id, name: roleName } },
    });
    if (role) {
      await prisma.userRole.upsert({
        where: { userId_roleId: { userId, roleId: role.id } },
        update: {},
        create: { userId, roleId: role.id },
      });
    }
  }
  console.log('Role assignments completed');

  // 8. Set department manager
  await prisma.department.update({
    where: { id: deptOps.id },
    data: { managerId: validatorUser.id },
  });

  // 9. Create sample vendors
  const vendor1 = await prisma.vendor.upsert({
    where: { tenantId_taxId: { tenantId: tenant.id, taxId: 'V-001' } },
    update: {},
    create: {
      tenantId: tenant.id,
      name: 'Office Supplies Co.',
      taxId: 'V-001',
      email: 'sales@officesupplies.com',
      phone: '+1-555-0100',
      website: 'https://officesupplies.example.com',
      address: '123 Commerce St, Suite 100',
    },
  });

  const vendor2 = await prisma.vendor.upsert({
    where: { tenantId_taxId: { tenantId: tenant.id, taxId: 'V-002' } },
    update: {},
    create: {
      tenantId: tenant.id,
      name: 'Tech Hardware Inc.',
      taxId: 'V-002',
      email: 'orders@techhardware.com',
      phone: '+1-555-0200',
      website: 'https://techhardware.example.com',
      address: '456 Technology Blvd',
    },
  });

  const vendor3 = await prisma.vendor.upsert({
    where: { tenantId_taxId: { tenantId: tenant.id, taxId: 'V-003' } },
    update: {},
    create: {
      tenantId: tenant.id,
      name: 'Furniture World',
      taxId: 'V-003',
      email: 'info@furnitureworld.com',
      phone: '+1-555-0300',
      address: '789 Design Ave',
    },
  });
  console.log('Vendors created');

  // 10. Create cost centers
  await prisma.costCenter.upsert({
    where: { tenantId_code: { tenantId: tenant.id, code: 'CC-OPS' } },
    update: {},
    create: {
      tenantId: tenant.id,
      code: 'CC-OPS',
      name: 'Operations',
      annualBudget: 120000,
      monthlyBudget: 10000,
    },
  });

  await prisma.costCenter.upsert({
    where: { tenantId_code: { tenantId: tenant.id, code: 'CC-IT' } },
    update: {},
    create: {
      tenantId: tenant.id,
      code: 'CC-IT',
      name: 'IT Department',
      annualBudget: 200000,
      monthlyBudget: 16667,
    },
  });

  await prisma.costCenter.upsert({
    where: { tenantId_code: { tenantId: tenant.id, code: 'CC-GEN' } },
    update: {},
    create: {
      tenantId: tenant.id,
      code: 'CC-GEN',
      name: 'General Expenses',
      annualBudget: 60000,
      monthlyBudget: 5000,
    },
  });
  console.log('Cost centers created');

  // ===========================
  // INVENTORY MODULE (Demo Company)
  // ===========================

  // Enable inventory module
  await prisma.tenantModule.upsert({
    where: { tenantId_moduleId: { tenantId: tenant.id, moduleId: 'inventory' } },
    update: { enabled: true },
    create: { tenantId: tenant.id, moduleId: 'inventory', enabled: true },
  });
  console.log('Inventory module enabled');

  // Create inventory permissions
  for (const p of INVENTORY_PERMISSIONS) {
    const perm = await prisma.permission.upsert({
      where: {
        moduleId_resource_action: { moduleId: 'inventory', resource: p.resource, action: p.action },
      },
      update: { description: p.description },
      create: { moduleId: 'inventory', resource: p.resource, action: p.action, description: p.description },
    });
    permissionMap.set(`inventory.${p.resource}.${p.action}`, perm.id);
  }
  console.log('Inventory permissions created');

  // Create inventory roles for Demo Company
  for (const roleDef of INVENTORY_ROLES) {
    const role = await prisma.role.upsert({
      where: { tenantId_name: { tenantId: tenant.id, name: roleDef.name } },
      update: { description: roleDef.displayName, isSystem: true, moduleId: 'inventory' },
      create: {
        tenantId: tenant.id,
        name: roleDef.name,
        displayName: roleDef.displayName,
        description: roleDef.displayName,
        isSystem: true,
        moduleId: 'inventory',
      },
    });
    await prisma.rolePermission.deleteMany({ where: { roleId: role.id } });
    for (const permKey of roleDef.permissions) {
      const permId = permissionMap.get(permKey);
      if (permId) {
        await prisma.rolePermission.create({ data: { roleId: role.id, permissionId: permId } });
      }
    }
    console.log(`Role: ${roleDef.name}`);
  }

  // Assign inventory roles: Pedro = operator, Juan = viewer, Carlos Admin = manager
  const invRoleAssignments = [
    { userId: buyerUser.id, roleName: 'inventory.operator' },
    { userId: validatorUser.id, roleName: 'inventory.viewer' },
    { userId: adminUser.id, roleName: 'inventory.manager' },
  ];
  for (const { userId, roleName } of invRoleAssignments) {
    const role = await prisma.role.findUnique({
      where: { tenantId_name: { tenantId: tenant.id, name: roleName } },
    });
    if (role) {
      await prisma.userRole.upsert({
        where: { userId_roleId: { userId, roleId: role.id } },
        update: {},
        create: { userId, roleId: role.id },
      });
    }
  }
  console.log('Inventory role assignments created');

  // Create product categories
  const catOffice = await prisma.productCategory.upsert({
    where: { tenantId_name: { tenantId: tenant.id, name: 'Office Supplies' } },
    update: {},
    create: { tenantId: tenant.id, name: 'Office Supplies', description: 'General office supplies' },
  });

  const catIT = await prisma.productCategory.upsert({
    where: { tenantId_name: { tenantId: tenant.id, name: 'IT Equipment' } },
    update: {},
    create: { tenantId: tenant.id, name: 'IT Equipment', description: 'Computers, peripherals, and accessories' },
  });

  const catCleaning = await prisma.productCategory.upsert({
    where: { tenantId_name: { tenantId: tenant.id, name: 'Cleaning Supplies' } },
    update: {},
    create: { tenantId: tenant.id, name: 'Cleaning Supplies', description: 'Janitorial and cleaning products' },
  });
  console.log('Product categories created');

  // Create warehouses
  const whMain = await prisma.warehouse.upsert({
    where: { tenantId_code: { tenantId: tenant.id, code: 'WH-MAIN' } },
    update: {},
    create: { tenantId: tenant.id, name: 'Main Warehouse', code: 'WH-MAIN', address: '100 Main St, Building A' },
  });

  const whOffice = await prisma.warehouse.upsert({
    where: { tenantId_code: { tenantId: tenant.id, code: 'WH-OFF' } },
    update: {},
    create: { tenantId: tenant.id, name: 'Office Storage', code: 'WH-OFF', address: '100 Main St, Floor 2' },
  });
  console.log('Warehouses created');

  // Create products
  const products = [
    { sku: 'OFF-001', name: 'A4 Paper Reams', categoryId: catOffice.id, unitOfMeasure: 'reams', costPrice: 4.50, salePrice: 5.99, minStock: 20, maxStock: 200 },
    { sku: 'OFF-002', name: 'Ballpoint Pens (Box 50)', categoryId: catOffice.id, unitOfMeasure: 'boxes', costPrice: 8.00, salePrice: 12.00, minStock: 5, maxStock: 50 },
    { sku: 'OFF-003', name: 'Binder Clips Assorted', categoryId: catOffice.id, unitOfMeasure: 'packs', costPrice: 3.00, salePrice: 4.50, minStock: 10, maxStock: 100 },
    { sku: 'IT-001', name: 'USB-C Hub 7-in-1', categoryId: catIT.id, unitOfMeasure: 'units', costPrice: 25.00, salePrice: 45.00, minStock: 3, maxStock: 20 },
    { sku: 'IT-002', name: 'Wireless Mouse', categoryId: catIT.id, unitOfMeasure: 'units', costPrice: 12.00, salePrice: 22.00, minStock: 5, maxStock: 30 },
    { sku: 'CLN-001', name: 'All-Purpose Cleaner (1L)', categoryId: catCleaning.id, unitOfMeasure: 'bottles', costPrice: 3.50, salePrice: 5.00, minStock: 10, maxStock: 50 },
  ];

  const productRecords = [];
  for (const p of products) {
    const prod = await prisma.product.upsert({
      where: { tenantId_sku: { tenantId: tenant.id, sku: p.sku } },
      update: {},
      create: {
        tenantId: tenant.id,
        sku: p.sku,
        name: p.name,
        categoryId: p.categoryId,
        unitOfMeasure: p.unitOfMeasure,
        costPrice: p.costPrice,
        salePrice: p.salePrice,
        minStock: p.minStock,
        maxStock: p.maxStock,
        createdBy: adminUser.id,
        updatedBy: adminUser.id,
      },
    });
    productRecords.push(prod);
  }
  console.log(`${productRecords.length} products created`);

  // Create initial stock levels
  const stockData = [
    { productIdx: 0, warehouseId: whMain.id, onHand: 150, reserved: 10 },
    { productIdx: 0, warehouseId: whOffice.id, onHand: 30, reserved: 0 },
    { productIdx: 1, warehouseId: whMain.id, onHand: 25, reserved: 0 },
    { productIdx: 2, warehouseId: whMain.id, onHand: 40, reserved: 5 },
    { productIdx: 3, warehouseId: whMain.id, onHand: 8, reserved: 0 },
    { productIdx: 4, warehouseId: whMain.id, onHand: 2, reserved: 0 },  // low stock!
    { productIdx: 5, warehouseId: whMain.id, onHand: 15, reserved: 0 },
  ];

  for (const s of stockData) {
    const prod = productRecords[s.productIdx];
    await prisma.stockLevel.upsert({
      where: { tenantId_productId_warehouseId: { tenantId: tenant.id, productId: prod.id, warehouseId: s.warehouseId } },
      update: { quantityOnHand: s.onHand, quantityReserved: s.reserved, quantityAvailable: s.onHand - s.reserved },
      create: {
        tenantId: tenant.id,
        productId: prod.id,
        warehouseId: s.warehouseId,
        quantityOnHand: s.onHand,
        quantityReserved: s.reserved,
        quantityAvailable: s.onHand - s.reserved,
      },
    });
  }
  console.log('Stock levels created');

  // Create sample stock movements
  const movementData = [
    { productIdx: 0, warehouseToId: whMain.id, quantity: 100, movementType: 'receipt', notes: 'Initial stock receipt' },
    { productIdx: 0, warehouseToId: whOffice.id, quantity: 30, movementType: 'receipt', notes: 'Office supply delivery' },
    { productIdx: 0, warehouseFromId: whMain.id, quantity: 10, movementType: 'issue', notes: 'Issued to Operations dept' },
    { productIdx: 3, warehouseToId: whMain.id, quantity: 10, movementType: 'receipt', notes: 'IT equipment delivery' },
    { productIdx: 4, warehouseToId: whMain.id, quantity: 5, movementType: 'receipt', notes: 'Mouse order received' },
    { productIdx: 4, warehouseFromId: whMain.id, quantity: 3, movementType: 'issue', notes: 'Issued to new employees' },
  ];

  for (const m of movementData) {
    const prod = productRecords[m.productIdx];
    await prisma.stockMovement.create({
      data: {
        tenantId: tenant.id,
        productId: prod.id,
        warehouseFromId: (m as any).warehouseFromId ?? null,
        warehouseToId: (m as any).warehouseToId ?? null,
        quantity: m.quantity,
        movementType: m.movementType,
        notes: m.notes,
        createdBy: buyerUser.id,
      },
    });
  }
  console.log('Stock movements created');

  // ===========================
  // SECOND TENANT: Acme Corp
  // ===========================
  const tenant2 = await prisma.tenant.upsert({
    where: { slug: 'acme' },
    update: {},
    create: {
      name: 'Acme Corp',
      slug: 'acme',
      contactEmail: 'admin@acme.com',
      currency: 'EUR',
      timezone: 'Europe/London',
    },
  });
  console.log(`\nTenant: ${tenant2.name} (id: ${tenant2.id})`);

  // Enable procurement module for Acme
  await prisma.tenantModule.upsert({
    where: { tenantId_moduleId: { tenantId: tenant2.id, moduleId: 'procurement' } },
    update: { enabled: true },
    create: { tenantId: tenant2.id, moduleId: 'procurement', enabled: true },
  });

  // Create procurement roles for Acme (reuse same permission IDs)
  for (const roleDef of PROCUREMENT_ROLES) {
    const role = await prisma.role.upsert({
      where: { tenantId_name: { tenantId: tenant2.id, name: roleDef.name } },
      update: { description: roleDef.displayName, isSystem: true, moduleId: 'procurement' },
      create: {
        tenantId: tenant2.id,
        name: roleDef.name,
        displayName: roleDef.displayName,
        description: roleDef.displayName,
        isSystem: true,
        moduleId: 'procurement',
      },
    });
    await prisma.rolePermission.deleteMany({ where: { roleId: role.id } });
    for (const permKey of roleDef.permissions) {
      const permId = permissionMap.get(permKey);
      if (permId) {
        await prisma.rolePermission.create({
          data: { roleId: role.id, permissionId: permId },
        });
      }
    }
  }
  console.log('Acme procurement roles created');

  // Acme departments
  const acmeSales = await prisma.department.upsert({
    where: { tenantId_name: { tenantId: tenant2.id, name: 'Sales' } },
    update: {},
    create: { tenantId: tenant2.id, name: 'Sales' },
  });

  const acmeEngineering = await prisma.department.upsert({
    where: { tenantId_name: { tenantId: tenant2.id, name: 'Engineering' } },
    update: {},
    create: { tenantId: tenant2.id, name: 'Engineering' },
  });

  const acmeFinance = await prisma.department.upsert({
    where: { tenantId_name: { tenantId: tenant2.id, name: 'Finance' } },
    update: {},
    create: { tenantId: tenant2.id, name: 'Finance' },
  });
  console.log('Acme departments created');

  // Acme users
  const acmeAdmin = await prisma.user.upsert({
    where: { tenantId_email: { tenantId: tenant2.id, email: 'admin@acme.com' } },
    update: {},
    create: {
      tenantId: tenant2.id,
      email: 'admin@acme.com',
      name: 'Sarah Admin',
      passwordHash,
      orgRole: 'admin',
      departmentId: acmeEngineering.id,
    },
  });

  const acmeRequester = await prisma.user.upsert({
    where: { tenantId_email: { tenantId: tenant2.id, email: 'tom@acme.com' } },
    update: {},
    create: {
      tenantId: tenant2.id,
      email: 'tom@acme.com',
      name: 'Tom Engineer',
      passwordHash,
      orgRole: 'member',
      departmentId: acmeEngineering.id,
    },
  });

  const acmeValidator = await prisma.user.upsert({
    where: { tenantId_email: { tenantId: tenant2.id, email: 'lisa@acme.com' } },
    update: {},
    create: {
      tenantId: tenant2.id,
      email: 'lisa@acme.com',
      name: 'Lisa Manager',
      passwordHash,
      orgRole: 'member',
      departmentId: acmeEngineering.id,
    },
  });

  const acmeApprover = await prisma.user.upsert({
    where: { tenantId_email: { tenantId: tenant2.id, email: 'james@acme.com' } },
    update: {},
    create: {
      tenantId: tenant2.id,
      email: 'james@acme.com',
      name: 'James Director',
      passwordHash,
      orgRole: 'member',
      departmentId: acmeFinance.id,
    },
  });

  const acmeBuyer = await prisma.user.upsert({
    where: { tenantId_email: { tenantId: tenant2.id, email: 'emma@acme.com' } },
    update: {},
    create: {
      tenantId: tenant2.id,
      email: 'emma@acme.com',
      name: 'Emma Buyer',
      passwordHash,
      orgRole: 'member',
      departmentId: acmeSales.id,
    },
  });
  console.log('Acme users created');

  // Acme role assignments
  const acmeRoleAssignments: Array<{ userId: number; roleName: string }> = [
    { userId: acmeRequester.id, roleName: 'procurement.requester' },
    { userId: acmeValidator.id, roleName: 'procurement.validator' },
    { userId: acmeValidator.id, roleName: 'procurement.requester' },
    { userId: acmeApprover.id, roleName: 'procurement.approver' },
    { userId: acmeBuyer.id, roleName: 'procurement.buyer' },
    { userId: acmeBuyer.id, roleName: 'procurement.requester' },
  ];

  for (const { userId, roleName } of acmeRoleAssignments) {
    const role = await prisma.role.findUnique({
      where: { tenantId_name: { tenantId: tenant2.id, name: roleName } },
    });
    if (role) {
      await prisma.userRole.upsert({
        where: { userId_roleId: { userId, roleId: role.id } },
        update: {},
        create: { userId, roleId: role.id },
      });
    }
  }

  // Set department manager
  await prisma.department.update({
    where: { id: acmeEngineering.id },
    data: { managerId: acmeValidator.id },
  });

  // Acme vendors
  await prisma.vendor.upsert({
    where: { tenantId_taxId: { tenantId: tenant2.id, taxId: 'AV-001' } },
    update: {},
    create: {
      tenantId: tenant2.id,
      name: 'CloudServe Ltd.',
      taxId: 'AV-001',
      email: 'sales@cloudserve.com',
      phone: '+44-20-7946-0958',
      website: 'https://cloudserve.example.com',
      address: '10 Downing Tech Park, London',
    },
  });

  await prisma.vendor.upsert({
    where: { tenantId_taxId: { tenantId: tenant2.id, taxId: 'AV-002' } },
    update: {},
    create: {
      tenantId: tenant2.id,
      name: 'EuroComponents GmbH',
      taxId: 'AV-002',
      email: 'orders@eurocomponents.de',
      phone: '+49-30-1234-5678',
      address: 'Industriestr. 42, Berlin',
    },
  });
  console.log('Acme vendors created');

  // Acme cost centers
  await prisma.costCenter.upsert({
    where: { tenantId_code: { tenantId: tenant2.id, code: 'AC-ENG' } },
    update: {},
    create: {
      tenantId: tenant2.id,
      code: 'AC-ENG',
      name: 'Engineering',
      annualBudget: 300000,
      monthlyBudget: 25000,
    },
  });

  await prisma.costCenter.upsert({
    where: { tenantId_code: { tenantId: tenant2.id, code: 'AC-SAL' } },
    update: {},
    create: {
      tenantId: tenant2.id,
      code: 'AC-SAL',
      name: 'Sales',
      annualBudget: 150000,
      monthlyBudget: 12500,
    },
  });
  console.log('Acme cost centers created');

  console.log('\n--- Seed complete ---');
  console.log('Login credentials (all passwords: password123):');
  console.log('\n  PLATFORM (super admin):');
  console.log('  superadmin@erp.com  - Super Admin (platform owner)');
  console.log('\n  DEMO COMPANY:');
  console.log('  admin@demo.com    - Admin');
  console.log('  maria@demo.com    - Requester');
  console.log('  juan@demo.com     - Validator + Requester');
  console.log('  ana@demo.com      - Approver');
  console.log('  pedro@demo.com    - Buyer + Requester');
  console.log('  laura@demo.com    - Treasurer');
  console.log('\n  ACME CORP:');
  console.log('  admin@acme.com    - Admin');
  console.log('  tom@acme.com      - Requester');
  console.log('  lisa@acme.com     - Validator + Requester');
  console.log('  james@acme.com    - Approver');
  console.log('  emma@acme.com     - Buyer + Requester');
}

main()
  .catch((e) => {
    console.error('Seed failed:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
