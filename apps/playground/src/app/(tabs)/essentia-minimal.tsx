import { Button, ScreenWrapper } from "@siteed/design-system";
import { Text } from "react-native-paper";
import { NativeModules } from 'react-native';
const { EssentiaSimple, EssentiaTest, EssentiaMinimal, EssentiaWrapper, Essentia } = NativeModules;

console.log('native modules', NativeModules);
console.log('essentia wrapper', EssentiaWrapper);
console.log('essentia minimal', EssentiaMinimal);
console.log('essentia', Essentia);
export default function EssentiaMinimalScreen() {
    return (
        <ScreenWrapper>
            <Text>Essentia Minimal</Text>
            <Button onPress={() => {
                EssentiaSimple.simpleMethod()
                    .then((result: unknown) => {
                        console.log('EssentiaSimple result:', result);
                        return result;
                    })
                    .catch((error: unknown) => {
                        console.error('EssentiaSimple error:', error);
                        return error;
                    });
            }}>Test EssentiaSimple</Button>
            <Button onPress={() => {
                EssentiaTest.testCppIntegration([1, 2, 3])
                    .then((result: unknown) => {
                        console.log('EssentiaTest result:', result);
                        return result;
                    })
                    .catch((error: unknown) => {
                        console.error('EssentiaTest error:', error);
                        return error;
                    });
            }}>Test EssentiaTest</Button>
            
            {/* New buttons for testing the actual Essentia library */}
            <Button onPress={() => {
                EssentiaMinimal.testEssentiaVersion()
                    .then((result: unknown) => {
                        console.log('Essentia Version:', result);
                        return result;
                    })
                    .catch((error: unknown) => {
                        console.error('Essentia Version error:', error);
                        return error;
                    });
            }}>Get Essentia Version</Button>
            
            <Button onPress={() => {
                const testData = Array.from({length: 100}, (_, i) => Math.sin(i * 0.1) + 2); // Signal with DC offset
                EssentiaMinimal.testSimpleAlgorithm(testData)
                    .then((result: unknown) => {
                        console.log('DC Removal result:', result);
                        return result;
                    })
                    .catch((error: unknown) => {
                        console.error('DC Removal error:', error);
                        return error;
                    });
            }}>Test Essentia Algorithm</Button>
        </ScreenWrapper>
    )
}