import EssentiaAPI from './EssentiaAPI';
import { EssentiaCategory } from './constants';

// Export types - explicitly re-export to avoid name conflicts
export * from './types/core.types';
// Re-export everything from algorithms.types
export * from './types/algorithms.types';

export * from './types/pipeline.types';

export { EssentiaCategory };

// Export the API instance
export default new EssentiaAPI();
