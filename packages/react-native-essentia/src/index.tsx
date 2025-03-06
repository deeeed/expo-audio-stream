import EssentiaAPI from './EssentiaAPI';
import { EssentiaCategory } from './constants';

// Export types - explicitly re-export to avoid name conflicts
export * from './types/core.types';
// Re-export everything from params.types except anything that might conflict
export * from './types/params.types';
// Explicitly don't re-export MelSpectrogramResult from results.types since it's already in core.types
export * from './types/results.types';

export { EssentiaCategory };

// Export the API instance
export default new EssentiaAPI();
