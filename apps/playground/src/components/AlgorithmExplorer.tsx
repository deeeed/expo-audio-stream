import React, { useCallback, useEffect, useMemo, useState } from 'react'

import { ActivityIndicator, ScrollView, StyleSheet, TextInput, View } from 'react-native'
import { Button, Card, Chip, Divider, HelperText, Searchbar, SegmentedButtons, Text } from 'react-native-paper'

import type { AppTheme } from '@siteed/design-system'
import { useThemePreferences } from '@siteed/design-system'
import EssentiaJS from '@siteed/react-native-essentia'

// Define interfaces
export interface AlgorithmExplorerProps {
  isInitialized: boolean;
  showToast: (message: string) => void;
  onFavoritesChange?: (favorites: string[]) => void;
}

interface AlgorithmInfo {
  name: string;
  inputs: { name: string; type: string }[];
  outputs: { name: string; type: string }[];
  parameters: Record<string, Record<string, unknown>>;
}

interface ParameterValue {
  [key: string]: string | number | boolean;
}

// Add this interface for favorites
interface AlgorithmCategory {
  name: string;
  algorithms: string[];
  icon: string;
}

const getStyles = ({ theme }: { theme: AppTheme }) => {
  return StyleSheet.create({
    card: {
      marginBottom: 16,
    },
    cardTitle: {
      fontSize: 18,
      fontWeight: 'bold',
      marginBottom: 8,
    },
    cardContent: {
      fontSize: 16,
      marginBottom: 16,
    },
    buttonContainer: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      flexWrap: 'wrap',
    },
    button: {
      flex: 1,
      margin: 4,
    },
    resultText: {
      fontFamily: 'monospace',
      fontSize: 14,
      backgroundColor: theme.colors.surfaceVariant,
      padding: 8,
      borderRadius: 4,
      marginTop: 8,
    },
    sampleItem: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 8,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.outlineVariant,
    },
    selectedSample: {
      backgroundColor: theme.colors.primaryContainer,
    },
    testResult: {
      marginTop: 8,
      padding: 8,
      backgroundColor: theme.colors.surfaceVariant,
      borderRadius: 4,
    },
    chipContainer: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      marginVertical: 8,
    },
    chip: {
      margin: 4,
    },
    sectionTitle: {
      fontSize: 18,
      fontWeight: 'bold',
      marginBottom: 8,
    },
    subtitle: {
      fontSize: 16,
      fontWeight: 'bold',
      marginTop: 12,
      marginBottom: 4,
    },
    item: {
      fontSize: 14,
      marginLeft: 8,
      marginBottom: 2,
    },
    loadingContainer: {
      padding: 16,
      alignItems: 'center',
    },
    errorText: {
      color: theme.colors.error,
      marginVertical: 8,
    },
    algorithmCount: {
      marginTop: 8,
      fontStyle: 'italic',
    },
    parameterContainer: {
      marginBottom: 12,
      padding: 8,
      backgroundColor: theme.colors.surfaceVariant,
      borderRadius: 4,
    },
    parameterInput: {
      backgroundColor: theme.colors.surface,
      borderRadius: 4,
      marginTop: 4,
      paddingHorizontal: 8,
      height: 40,
    },
    searchInput: {
      backgroundColor: theme.colors.surface,
      borderRadius: 4,
      marginVertical: 8,
      paddingHorizontal: 12,
      height: 40,
    },
    resultContainer: {
      padding: 8,
      backgroundColor: theme.colors.primaryContainer,
      borderRadius: 4,
      marginTop: 12,
    },
    categoryTitle: {
      fontSize: 16,
      fontWeight: 'bold',
      marginTop: 16,
      marginBottom: 4,
      color: theme.colors.primary,
    },
    tabContent: {
      marginTop: 16,
      marginBottom: 16,
    },
    categoryHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 8,
    },
    emptyState: {
      textAlign: 'center',
      marginTop: 20,
      marginBottom: 20,
      fontStyle: 'italic',
    },
    favoriteButton: {
      marginLeft: 4, 
    },
    algorithmItem: {
      flexDirection: 'row',
      alignItems: 'center',
      marginVertical: 2,
    },
  })
}

// Add a safe text rendering utility function at the top of your component
const safeRenderText = (value: unknown): string => {
  if (value === null || value === undefined) {
    return 'N/A'
  }
  if (typeof value === 'string') {
    return value
  }
  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value)
  }
  // Handle all object types (including arrays) with JSON.stringify
  if (typeof value === 'object') {
    return JSON.stringify(value)
  }
  // For any other types
  return String(value)
}

export function AlgorithmExplorer({ isInitialized, showToast, onFavoritesChange }: Readonly<AlgorithmExplorerProps>) {
  const { theme } = useThemePreferences()
  const styles = useMemo(() => getStyles({ theme }), [theme])
  
  // State for algorithms list
  const [algorithms, setAlgorithms] = useState<string[]>([])
  const [filteredAlgorithms, setFilteredAlgorithms] = useState<string[]>([])
  const [isLoadingAlgorithms, setIsLoadingAlgorithms] = useState(false)
  const [algorithmError, setAlgorithmError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  
  // State for selected algorithm
  const [selectedAlgorithm, setSelectedAlgorithm] = useState<string | null>(null)
  const [algorithmInfo, setAlgorithmInfo] = useState<AlgorithmInfo | null>(null)
  const [isLoadingAlgoInfo, setIsLoadingAlgoInfo] = useState(false)
  
  // State for parameter values - keep for display purposes only
  const [parameterValues, setParameterValues] = useState<ParameterValue>({})
  
  // Add new state for UX improvements
  const [favoriteAlgorithms, setFavoriteAlgorithms] = useState<string[]>([])
  const [recentlyUsed, setRecentlyUsed] = useState<string[]>([])
  const [selectedCategory, setSelectedCategory] = useState('favorites')
  
  // Add loading state for category switching
  const [isLoadingCategory, setIsLoadingCategory] = useState(false)
  
  // Expand the algorithm categories with icons for better visual hierarchy
  const algorithmCategories = useMemo<AlgorithmCategory[]>(() => [
    {
      name: 'Audio Analysis',
      algorithms: ['MFCC', 'Spectrum', 'SpectralCentroid', 'SpectralContrast', 'SpectralPeaks', 'BarkBands', 'ERBBands', 'MelBands', 'GFCC', 'BFCC'],
      icon: 'waveform',
    },
    {
      name: 'Feature Extraction',
      algorithms: ['Energy', 'RMS', 'ZeroCrossingRate', 'Loudness', 'Flux', 'Rolloff', 'Decrease', 'Envelope'],
      icon: 'chart-bar',
    },
    {
      name: 'Music Features',
      algorithms: ['Key', 'BpmHistogram', 'Rhythm', 'Pitch', 'PitchMelodia', 'Onsets', 'BeatTrackerMultiFeature'],
      icon: 'music',
    },
    {
      name: 'Signal Processing',
      algorithms: ['FFT', 'IFFT', 'DCT', 'IDCT', 'Windowing', 'FrameCutter', 'Magnitude', 'PowerSpectrum', 'CartesianToPolar'],
      icon: 'sine-wave',
    },
    {
      name: 'Audio Effects',
      algorithms: ['BandPass', 'HighPass', 'LowPass', 'Clipper', 'DCRemoval', 'EqualLoudness'],
      icon: 'equalizer',
    },
  ], [])

  // Function to load all available algorithms
  const loadAlgorithms = useCallback(async () => {
    if (!isInitialized) {
      showToast('Please initialize Essentia first')
      return
    }
    
    setIsLoadingAlgorithms(true)
    setAlgorithmError(null)
    
    try {
      const result = await EssentiaJS.getAllAlgorithms()
      
      if (result.success && Array.isArray(result.data)) {
        const sortedAlgorithms = [...result.data].sort((a, b) => a.localeCompare(b))
        setAlgorithms(sortedAlgorithms)
        setFilteredAlgorithms(sortedAlgorithms)
        console.log(`Loaded ${result.data.length} algorithms from Essentia`)
      } else {
        setAlgorithmError('Failed to load algorithms')
        console.error('Unexpected result format:', result)
      }
    } catch (error) {
      setAlgorithmError(`Error: ${error instanceof Error ? error.message : String(error)}`)
      console.error('Error loading algorithms:', error)
    } finally {
      setIsLoadingAlgorithms(false)
    }
  }, [isInitialized, showToast])

  // Load algorithms when initialized
  useEffect(() => {
    if (isInitialized) {
      loadAlgorithms()
    }
  }, [isInitialized, loadAlgorithms])
  
  // Filter algorithms based on search query
  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredAlgorithms(algorithms)
    } else {
      const query = searchQuery.toLowerCase()
      setFilteredAlgorithms(
        algorithms.filter((algo) => algo.toLowerCase().includes(query))
      )
    }
  }, [searchQuery, algorithms])
  
  // Get info for the selected algorithm
  const getAlgorithmInfo = useCallback(async (algorithmName: string) => {
    if (!isInitialized) {
      showToast('Please initialize Essentia first')
      return
    }
    
    setIsLoadingAlgoInfo(true)
    setSelectedAlgorithm(algorithmName)
    setParameterValues({})
    
    try {
      const result = await EssentiaJS.getAlgorithmInfo(algorithmName)
      
      if (result.success && result.data) {
        const info = result.data as AlgorithmInfo
        setAlgorithmInfo(info)
        
        // Initialize default parameter values
        const defaultParams: ParameterValue = {}
        if (info.parameters) {
          Object.entries(info.parameters).forEach(([key, value]) => {
            if (value && typeof value === 'object' && 'defaultValue' in value) {
              const defaultValue = value.defaultValue
              if (typeof defaultValue === 'string' || 
                  typeof defaultValue === 'number' || 
                  typeof defaultValue === 'boolean') {
                defaultParams[key] = defaultValue
              }
            }
          })
        }
        
        setParameterValues(defaultParams)
      } else {
        showToast(`Failed to get info for ${algorithmName}`)
        setAlgorithmInfo(null)
      }
    } catch (error) {
      console.error('Error getting algorithm info:', error)
      showToast(`Error: ${error instanceof Error ? error.message : String(error)}`)
      setAlgorithmInfo(null)
    } finally {
      setIsLoadingAlgoInfo(false)
    }
  }, [isInitialized, showToast])
  
  // Handle parameter value changes - keep for display purposes only
  const handleParameterChange = (paramName: string, value: string) => {
    let parsedValue: string | number | boolean = value
    
    try {
      // Try to parse numbers and booleans
      if (value.toLowerCase() === 'true') {
        parsedValue = true
      } else if (value.toLowerCase() === 'false') {
        parsedValue = false
      } else if (!isNaN(Number(value)) && value.trim() !== '') {
        parsedValue = Number(value)
      } else if (value.startsWith('[') && value.endsWith(']')) {
        // Keep arrays as strings, they'll be parsed by Essentia
        parsedValue = value
      }
    } catch (error) {
      // If parsing fails, keep as string
      console.warn(`Error parsing parameter value: ${error instanceof Error ? error.message : String(error)}`)
      parsedValue = value
    }
    
    setParameterValues((prev) => ({
      ...prev,
      [paramName]: parsedValue,
    }))
  }
  
  // Update recently used when selecting an algorithm
  const handleSelectAlgorithm = useCallback((algorithmName: string) => {
    // Update recently used
    setRecentlyUsed((prev) => {
      const newList = prev.filter((item) => item !== algorithmName)
      return [algorithmName, ...newList].slice(0, 10) // Keep only the 10 most recent
    })

    // Call the existing function
    getAlgorithmInfo(algorithmName)
  }, [getAlgorithmInfo])

  // Toggle favorite status for an algorithm
  const toggleFavorite = useCallback((algorithmName: string) => {
    setFavoriteAlgorithms((prev) => {
      const updatedFavorites = prev.includes(algorithmName) 
        ? prev.filter((item) => item !== algorithmName)
        : [...prev, algorithmName]
      
      // Call the callback with updated favorites if provided
      if (onFavoritesChange) {
        onFavoritesChange(updatedFavorites)
      }
      
      return updatedFavorites
    })
  }, [onFavoritesChange])

  // Render a consistent algorithm chip with favorite option
  const renderAlgorithmChip = useCallback((algo: string) => {
    const isFavorite = favoriteAlgorithms.includes(algo)
    
    return (
      <View key={algo} style={styles.algorithmItem}>
        <Chip
          style={[styles.chip, isFavorite && { borderColor: theme.colors.primary, borderWidth: 1 }]}
          selected={selectedAlgorithm === algo}
          onPress={() => handleSelectAlgorithm(algo)}
          mode="outlined"
        >
          {algo}
        </Chip>
        <Button
          icon={isFavorite ? 'star' : 'star-outline'}
          mode="text"
          onPress={() => toggleFavorite(algo)}
          style={styles.favoriteButton}
        >
          {''}
        </Button>
      </View>
    )
  }, [favoriteAlgorithms, selectedAlgorithm, handleSelectAlgorithm, toggleFavorite, theme, styles])

  // Handle category change with loading state
  const handleCategoryChange = useCallback((newCategory: string) => {
    setIsLoadingCategory(true)
    setSelectedCategory(newCategory)
    
    // Use setTimeout to allow the UI to update before rendering the new category content
    setTimeout(() => {
      setIsLoadingCategory(false)
    }, 300) // Small delay to show loading indicator
  }, [])

  // Render favorites view
  const renderFavoritesView = useCallback(() => {
    if (favoriteAlgorithms.length === 0) {
      return (
        <Text style={styles.emptyState}>
          No favorite algorithms yet. Star algorithms to add them here.
        </Text>
      )
    }
    
    return (
      <View style={styles.chipContainer}>
        {favoriteAlgorithms
          .filter((algo) => filteredAlgorithms.includes(algo))
          .map(renderAlgorithmChip)}
      </View>
    )
  }, [favoriteAlgorithms, filteredAlgorithms, renderAlgorithmChip, styles.chipContainer, styles.emptyState])
  
  // Render recent view
  const renderRecentView = useCallback(() => {
    if (recentlyUsed.length === 0) {
      return (
        <Text style={styles.emptyState}>
          No recently used algorithms. Select some algorithms to see them here.
        </Text>
      )
    }
    
    return (
      <View style={styles.chipContainer}>
        {recentlyUsed
          .filter((algo) => filteredAlgorithms.includes(algo))
          .map(renderAlgorithmChip)}
      </View>
    )
  }, [recentlyUsed, filteredAlgorithms, renderAlgorithmChip, styles.chipContainer, styles.emptyState])
  
  // Render all algorithms view
  const renderAllView = useCallback(() => {
    return (
      <ScrollView style={{ maxHeight: 200 }}>
        <View style={styles.chipContainer}>
          {filteredAlgorithms.map(renderAlgorithmChip)}
        </View>
      </ScrollView>
    )
  }, [filteredAlgorithms, renderAlgorithmChip, styles.chipContainer])
  
  // Render category view
  const renderCategoryView = useCallback((categoryName: string) => {
    const category = algorithmCategories.find((c) => c.name === categoryName)
    if (!category) return null
    
    return (
      <View style={styles.chipContainer}>
        {category.algorithms
          .filter((algo) => filteredAlgorithms.includes(algo) && algorithms.includes(algo))
          .map(renderAlgorithmChip)}
        <Divider style={{ marginVertical: 8, width: '100%' }} />
        <Text style={{ marginBottom: 8 }}>Other algorithms in this category:</Text>
        {filteredAlgorithms
          .filter((algo) => !category.algorithms.includes(algo) && 
                        algo.toLowerCase().includes(category.name.toLowerCase()))
          .map(renderAlgorithmChip)}
      </View>
    )
  }, [algorithms, filteredAlgorithms, algorithmCategories, renderAlgorithmChip, styles.chipContainer])

  // Render current category content - now simplified by using the specific render functions
  const renderCategoryContent = useCallback(() => {
    // Show loading indicator when switching categories
    if (isLoadingCategory) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color={theme.colors.primary} />
          <Text style={{ marginTop: 8 }}>Loading category...</Text>
        </View>
      )
    }
    
    // Render the appropriate view based on selected category
    switch (selectedCategory) {
      case 'favorites':
        return renderFavoritesView()
      case 'recent':
        return renderRecentView()
      case 'all':
        return renderAllView()
      default:
        return renderCategoryView(selectedCategory)
    }
  }, [
    isLoadingCategory, 
    selectedCategory, 
    renderFavoritesView, 
    renderRecentView, 
    renderAllView, 
    renderCategoryView, 
    styles.loadingContainer, 
    theme.colors.primary
  ])

  // Create segmented buttons options for categories
  const segmentedButtonItems = useMemo(() => {
    const items = [
      { value: 'favorites', label: 'Favorites' },
      { value: 'recent', label: 'Recent' },
      { value: 'all', label: 'All' },
    ]
    
    // Add category items
    algorithmCategories.forEach((category) => {
      items.push({ value: category.name, label: category.name })
    })
    
    return items
  }, [algorithmCategories])

  // Helper function to log algorithm details
  const logAlgorithmInfo = async (algo: string) => {
    console.log(`\n----- ${algo} -----`)
    try {
      const result = await EssentiaJS.getAlgorithmInfo(algo)
      
      if (!result.success || !result.data) {
        console.log(`Failed to get info for ${algo}: ${result.error ?? 'Unknown error'}`)
        return
      }

      const info = result.data
      
      // Log inputs
      console.log('Inputs:')
      if (info.inputs && Array.isArray(info.inputs)) {
        info.inputs.forEach((input: { name: string; type: string }) => {
          console.log(`  - ${input.name} (${input.type})`)
        })
      } else {
        console.log('  None or undefined')
      }
      
      // Log outputs
      console.log('Outputs:')
      if (info.outputs && Array.isArray(info.outputs)) {
        info.outputs.forEach((output: { name: string; type: string }) => {
          console.log(`  - ${output.name} (${output.type})`)
        })
      } else {
        console.log('  None or undefined')
      }
      
      // Log parameters
      console.log('Parameters:')
      if (info.parameters) {
        Object.entries(info.parameters).forEach(([key, value]) => {
          console.log(`  - ${key}: ${JSON.stringify(value)}`)
        })
      } else {
        console.log('  None or undefined')
      }
    } catch (error) {
      console.error(`Error getting info for ${algo}:`, error)
    }
  }

  // Export algorithms to console (keeping existing functionality)
  const handleExportAlgorithmList = async () => {
    if (!isInitialized) {
      showToast('Please initialize Essentia first')
      return
    }
    
    if (algorithms.length === 0) {
      showToast('No algorithms available. Try refreshing the list.')
      return
    }
    
    try {
      // Log the header info
      console.log('===== ESSENTIA ALGORITHMS LIST =====')
      console.log(`Total available algorithms: ${algorithms.length}`)
      
      // List all algorithms alphabetically
      console.log('\nAll available algorithms (alphabetical):')
      console.log(algorithms.join(', '))
      
      // For better performance, limit the detailed info to first 300 algorithms
      const algoSubset = algorithms.length > 300 ? algorithms.slice(0, 300) : algorithms
      console.log('\nDetailed information for first 300 algorithms:')
      
      // Get info for each algorithm in the subset
      for (const algo of algoSubset) {
        await logAlgorithmInfo(algo)
      }
      
      console.log('\n===== END OF ALGORITHMS LIST =====')
      showToast('Algorithm list exported to console')
    } catch (error) {
      console.error('Error exporting algorithm list:', error)
      showToast(`Error: ${error instanceof Error ? error.message : String(error)}`)
    }
  }
  
  // Render parameter inputs for the selected algorithm
  const renderParameterInputs = () => {
    if (!algorithmInfo?.parameters) {
      return <Text>No parameters available for this algorithm</Text>
    }
    
    return Object.entries(algorithmInfo.parameters).map(([paramName, paramInfo]) => {
      // First safely extract the description
      let description = 'No description available'
      if (paramInfo && typeof paramInfo === 'object') {
        if ('description' in paramInfo) {
          description = safeRenderText(paramInfo.description)
        } else if ('defaultValue' in paramInfo) {
          description = `Type: ${typeof paramInfo.defaultValue}`
        }
      }
      
      // Safely extract default value
      let defaultValue = 'N/A'
      if (paramInfo && typeof paramInfo === 'object' && 'defaultValue' in paramInfo) {
        defaultValue = safeRenderText(paramInfo.defaultValue)
      }
      
      // Safely get parameter value for input
      const paramValue = paramName in parameterValues 
        ? safeRenderText(parameterValues[paramName]) 
        : ''
      
      return (
        <View key={paramName} style={styles.parameterContainer}>
          <Text style={{ fontWeight: 'bold' }}>{paramName}</Text>
          <Text style={{ fontSize: 12, marginBottom: 4 }}>{description}</Text>
          <TextInput
            style={styles.parameterInput}
            value={paramValue}
            onChangeText={(text) => handleParameterChange(paramName, text)}
            placeholder={`Default: ${defaultValue}`}
            editable={false}
          />
          <HelperText type="info">
            Default: {defaultValue}
          </HelperText>
        </View>
      )
    })
  }

  return (
    <Card style={[styles.card, { borderWidth: 2, borderColor: theme.colors.primary }]}>
      <Card.Content>
        <Text style={[styles.cardTitle, { fontSize: 20 }]}>Algorithm Explorer</Text>
        
        {/* Status information */}
        <View style={{ marginBottom: 12 }}>
          <Text>Status: {isInitialized ? 'Ready ✅' : 'Not Initialized ❌'}</Text>
          {algorithms.length > 0 && (
            <Text style={styles.algorithmCount}>
              {algorithms.length} algorithms available
            </Text>
          )}
        </View>
        
        {/* Control buttons */}
        <View style={styles.buttonContainer}>
          <Button 
            mode="outlined"
            onPress={loadAlgorithms}
            disabled={!isInitialized || isLoadingAlgorithms}
            icon="refresh"
            style={styles.button}
          >
            Refresh List
          </Button>
          
          <Button 
            mode="outlined"
            onPress={handleExportAlgorithmList}
            disabled={!isInitialized || algorithms.length === 0 || isLoadingAlgorithms}
            icon="export"
            style={styles.button}
          >
            Export to Console
          </Button>
        </View>
        
        {/* Loading state */}
        {isLoadingAlgorithms && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={theme.colors.primary} />
            <Text style={{ marginTop: 8 }}>Loading algorithms...</Text>
          </View>
        )}
        
        {/* Error state */}
        {algorithmError && (
          <Text style={styles.errorText}>{algorithmError}</Text>
        )}
        
        {/* Algorithm Navigation */}
        {!isLoadingAlgorithms && algorithms.length > 0 && (
          <>
            <Searchbar
              placeholder="Search algorithms..."
              onChangeText={setSearchQuery}
              value={searchQuery}
              style={{ marginVertical: 10 }}
            />
            
            {/* Wrap SegmentedButtons in a horizontal ScrollView */}
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator
              style={{ marginTop: 10 }}
              contentContainerStyle={{ paddingBottom: 5 }}
            >
              <SegmentedButtons
                value={selectedCategory}
                onValueChange={handleCategoryChange}
                buttons={segmentedButtonItems}
                density="small"
                multiSelect={false}
              />
            </ScrollView>
            
            <View style={[styles.tabContent, { minHeight: 150 }]}>
              {renderCategoryContent()}
            </View>
          </>
        )}
        
        {/* Selected algorithm details */}
        {selectedAlgorithm && (
          <View>
            <Divider style={{ marginVertical: 16 }} />
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={styles.sectionTitle}>Algorithm: {selectedAlgorithm}</Text>
              <Button
                icon={favoriteAlgorithms.includes(selectedAlgorithm) ? 'star' : 'star-outline'}
                mode="text"
                onPress={() => toggleFavorite(selectedAlgorithm)}
              >
                {favoriteAlgorithms.includes(selectedAlgorithm) ? 'Favorited' : 'Add to Favorites'}
              </Button>
            </View>
            
            {isLoadingAlgoInfo ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="small" color={theme.colors.primary} />
                <Text style={{ marginTop: 8 }}>Loading algorithm info...</Text>
              </View>
            ) : algorithmInfo ? (
              <View>
                {/* Algorithm inputs */}
                <Card style={{ marginVertical: 8, backgroundColor: theme.colors.surfaceVariant }}>
                  <Card.Title title="Inputs" />
                  <Card.Content>
                    {algorithmInfo.inputs && algorithmInfo.inputs.length > 0 ? (
                      algorithmInfo.inputs.map((input, index) => (
                        <Text key={`input-${index}-${input.name || 'unnamed'}`} style={styles.item}>
                          {safeRenderText(input.name)} ({safeRenderText(input.type)})
                        </Text>
                      ))
                    ) : (
                      <Text style={styles.item}>None</Text>
                    )}
                  </Card.Content>
                </Card>
                
                {/* Algorithm outputs */}
                <Card style={{ marginVertical: 8, backgroundColor: theme.colors.surfaceVariant }}>
                  <Card.Title title="Outputs" />
                  <Card.Content>
                    {algorithmInfo.outputs && algorithmInfo.outputs.length > 0 ? (
                      algorithmInfo.outputs.map((output, index) => (
                        <Text key={`output-${index}-${output.name || 'unnamed'}`} style={styles.item}>
                          {safeRenderText(output.name)} ({safeRenderText(output.type)})
                        </Text>
                      ))
                    ) : (
                      <Text style={styles.item}>None</Text>
                    )}
                  </Card.Content>
                </Card>
                
                {/* Algorithm parameters */}
                <Card style={{ marginVertical: 8, backgroundColor: theme.colors.surfaceVariant }}>
                  <Card.Title title="Parameters" />
                  <Card.Content>
                    {renderParameterInputs()}
                  </Card.Content>
                </Card>
              </View>
            ) : (
              <Text>Failed to load algorithm information</Text>
            )}
          </View>
        )}
      </Card.Content>
    </Card>
  )
} 