// Import all modules - side effects register them with the registry
import '@/src/modules/procurement';
import '@/src/modules/hr';
import '@/src/modules/payroll';
import '@/src/modules/sales';
import '@/src/modules/inventory';
import '@/src/modules/crm';
import '@/src/modules/projects';
import '@/src/modules/budget';
import '@/src/modules/treasury';
import '@/src/modules/accounting';

// Re-export the registry for convenience
export { moduleRegistry } from './registry';
