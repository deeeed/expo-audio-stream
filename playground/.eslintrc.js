/**
 * @type {import('eslint').Linter.Config}
 */
module.exports = {
  root: true,
  extends: [
    "universe/native",
    "universe/web",
    "plugin:promise/recommended",
    "plugin:react/recommended",
  ],
  ignorePatterns: ["build"],
  rules: {
    // suppress errors for missing 'import React' in files
    "react/react-in-jsx-scope": "off",
  },
};
