export {
  PRODUCTS_PER_CATEGORY,
  MAX_CATEGORIES_TO_EXTRACT,
  type CategorySelectionOptions,
} from './config.js';
export {
  selectCategoriesForExtraction,
  explainCategorySelection,
} from './categorySelector.js';
export {
  runProductExtraction,
  runCategoryProductPipeline,
  hasExtractableCategories,
  type ExtractionContext,
  type CategoryExtractionReport,
} from './pipeline.js';
