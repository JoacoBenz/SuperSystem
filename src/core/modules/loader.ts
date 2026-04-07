// Import all modules - side effects register them with the registry
import '@/src/modules/procurement';
import '@/src/modules/planned';

// Re-export the registry for convenience
export { moduleRegistry } from './registry';
