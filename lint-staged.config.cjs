/**
 * @fileoverview Lint-staged configuration for DJ XU project.
 * Defines pre-commit hooks for code quality.
 */

module.exports = {
  // TypeScript and React files
  '**/*.{ts,tsx}': [
    'eslint --fix',
    'prettier --write',
    () => 'tsc --noEmit',
  ],
  
  // JavaScript files
  '**/*.js': [
    'eslint --fix',
    'prettier --write',
  ],
  
  // JSON, YAML, and Markdown files
  '**/*.{json,yml,yaml,md}': [
    'prettier --write',
  ],
  
  // CSS files
  '**/*.{css,scss}': [
    'prettier --write',
  ],
};
