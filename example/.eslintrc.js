/**
 * @type {import('eslint').Linter.Config}
 */
module.exports = {
  root: true,
  extends: ['universe/native', 'universe/web'],
  ignorePatterns: ['build'],
};
