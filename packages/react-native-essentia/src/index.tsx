import EssentiaAPI from './EssentiaAPI';
import { EssentiaCategory } from './constants';

// Export types
export * from './types/core.types';
export * from './types/params.types';
export * from './types/results.types';
export { EssentiaCategory };

// Export the API instance
export default new EssentiaAPI();
