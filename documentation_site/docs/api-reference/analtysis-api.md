I need your help refactoring my API to analyze audio files.

Currently, there are different API methods to analyze the audio files.

- `extractAudioAnalysis` - Extracts the audio analysis from the audio file.
- `extractPreview` - Extracts a preview of the audio file.
- `extractFullFileFeatures` - Extracts the full file features from the audio file.
- `extractAudioFromAnyFormat` - Extracts the audio from the audio file in any format.

## extractAudioAnalysis

I need to consolidate this API to simplify and make it more intuitive.
The extractAudioAnalysis does only wav file extraction without reencoding the data meaning you will parse the data as PCM without any additional processing.
--> Probably we need to rename this to extractWavAnalysis to emphasize we dont reprocess the data.

## extractPreview

The extractPreview is used to get a preview of the audio file and should just be a wrapper to the extractAudioAnalysis with a default of 100 points. I dont think we should have separate native implementation, ideally the native one would be a single entry point for all the audio formats.

## extractAudioFromAnyFormat

This should be probably what is the actual extractAudioAnalysis but with the ability to extract the audio from any format.


## extractFullFileFeatures

The extractFullFileFeatures is used to get the full file features from the audio file. This is also a wrapper around the extractAudioAnalysis but adding all the features extraction on the full audio file which can take a significant amount of time. I think on the native side it might be good to add a progress event or callback (I dont think we can do callback via expo module) so we can process big audio files by chunks and avoid memory issues.






