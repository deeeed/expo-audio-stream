const { withInfoPlist, createRunOncePlugin } = require('@expo/config-plugins')

function ensureUrlType(infoPlist, scheme) {
  const urlTypes = Array.isArray(infoPlist.CFBundleURLTypes) ? infoPlist.CFBundleURLTypes : []
  const alreadyPresent = urlTypes.some((entry) =>
    Array.isArray(entry?.CFBundleURLSchemes) && entry.CFBundleURLSchemes.includes(scheme)
  )

  if (!alreadyPresent) {
    urlTypes.push({
      CFBundleTypeRole: 'Editor',
      CFBundleURLName: scheme,
      CFBundleURLSchemes: [scheme],
    })
  }

  infoPlist.CFBundleURLTypes = urlTypes
  return infoPlist
}

const withVariantExpoScheme = (config, props = {}) => {
  const variant = props.variant || 'production'
  const appScheme = props.appScheme

  if (!appScheme || variant === 'production') {
    return config
  }

  return withInfoPlist(config, (modConfig) => {
    modConfig.modResults = ensureUrlType(modConfig.modResults, `exp+${appScheme}`)
    return modConfig
  })
}

module.exports = createRunOncePlugin(withVariantExpoScheme, 'with-variant-expo-scheme', '1.0.0')
