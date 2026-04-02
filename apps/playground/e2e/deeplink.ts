const getAppScheme = (): string => {
  const appVariant = process.env.APP_VARIANT || 'development';
  return appVariant === 'production'
    ? 'audioplayground'
    : `audioplayground-${appVariant}`;
};

export const getAgentValidationUrl = (query: string): string =>
  `${getAppScheme()}://agent-validation?${query}`;
