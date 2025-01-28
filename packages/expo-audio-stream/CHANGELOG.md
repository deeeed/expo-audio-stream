# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]


## [1.11.4] - 2025-01-28
### Bug Fixes
* **AppRoot:** Fix styleOverrides property in AppRoot component ([e8c3015](https://github.com/deeeed/expo-audio-stream/commit/e8c30151425d11a6bc3dfd7d6654002efa849b08))
* **audio-stream:** correct WAV header handling in web audio recording ([9ba7de5](https://github.com/deeeed/expo-audio-stream/commit/9ba7de5b96ca4cc937dea261c80d3fda9c99e8f4))
* change skipWavHeader to true in HexDataViewer ([410b6f5](https://github.com/deeeed/expo-audio-stream/commit/410b6f540403a73bf4a19e8918d30c108d06aa18))
* deployment path for playground app ([68ecbfc](https://github.com/deeeed/expo-audio-stream/commit/68ecbfc22cd4600e30ad1c6f2145ab68e6f4bf96))
* expo plugin files not published ([b88c446](https://github.com/deeeed/expo-audio-stream/commit/b88c44667013a901fccfe6f89dcb640ae2aae47f))
* **expo-audio-stream:** include all build + sourcemaps files in the package ([db91bdf](https://github.com/deeeed/expo-audio-stream/commit/db91bdf280e099af5baa0f966de0d9532648f15c))
* **expo-audio-stream:** missing package files ([0901a1b](https://github.com/deeeed/expo-audio-stream/commit/0901a1bbbcce3111c9b5d61ade8caa48bcdd3613))
* **expo-audio-stream:** missing plugin files ([e56254a](https://github.com/deeeed/expo-audio-stream/commit/e56254a4ffa1c015df3d300831ba0b392958b6c8))
* **expo-audio-stream:** plugin deployment process and build system enhancements ([#56](https://github.com/deeeed/expo-audio-stream/issues/56)) ([63fbeb8](https://github.com/deeeed/expo-audio-stream/commit/63fbeb82f56130dedeafa633e916f2ce0f8f1a67))
* **expo-audio-stream:** prevent invalid WAV files when stopping recording too quickly ([#53](https://github.com/deeeed/expo-audio-stream/issues/53)) ([80f4898](https://github.com/deeeed/expo-audio-stream/commit/80f4898625cea52da8f3e34e425e61d7641353f7))
* handle paused state in stopRecording ([#68](https://github.com/deeeed/expo-audio-stream/issues/68)) ([15eac9b](https://github.com/deeeed/expo-audio-stream/commit/15eac9bfcc3203e4a5eb5f236286ed72aafde722))
* incorrect types ([33095fe](https://github.com/deeeed/expo-audio-stream/commit/33095feffdfc85ffa7b12d041851afb2267b16d4))
* invalid prefix url on github ([36f013f](https://github.com/deeeed/expo-audio-stream/commit/36f013f052a4ed23373a0f27c5f0a4788ed1eda2))
* invalid property, use fullAudioDurationMs instead of durationMs ([ca4ef0d](https://github.com/deeeed/expo-audio-stream/commit/ca4ef0d3bbfbc259511cf08852082eb0c5b5c883))
* ios potentially missing compressed file info ([88a628c](https://github.com/deeeed/expo-audio-stream/commit/88a628c35f2bfd626a2a5de1eb6950efd814619d))
* **ios:** improve audio resampling and duration tracking ([#69](https://github.com/deeeed/expo-audio-stream/issues/69)) ([51bef49](https://github.com/deeeed/expo-audio-stream/commit/51bef493b8e167852c64b8c66a9f8a14cd34f99c))
* padding on web recording tabbar ([569df46](https://github.com/deeeed/expo-audio-stream/commit/569df46ff9eb338d671b50716a390e5b6eb019c7))
* **plugin:** remove automatic VoIP and audio background modes for iOS ([#86](https://github.com/deeeed/expo-audio-stream/issues/86)) ([4265bf5](https://github.com/deeeed/expo-audio-stream/commit/4265bf5dc9355a865e7f3177342169939afaf0bb))
* potential null error ([b5ac069](https://github.com/deeeed/expo-audio-stream/commit/b5ac0695e9e587bb7f08cbfee53515c7c59b49af))
* reset audio recording state properly on iOS and Android ([#66](https://github.com/deeeed/expo-audio-stream/issues/66)) ([61e9c26](https://github.com/deeeed/expo-audio-stream/commit/61e9c261fb3a979be1894e537233d6e5a4fbdae4))
* resources not cleanup properly on app kill ([#80](https://github.com/deeeed/expo-audio-stream/issues/80)) ([7d522a5](https://github.com/deeeed/expo-audio-stream/commit/7d522a531e70065b99758aa3a4c669769fdbd110))
* total size doesnt reset on new recording android ([#64](https://github.com/deeeed/expo-audio-stream/issues/64)) ([f7da57b](https://github.com/deeeed/expo-audio-stream/commit/f7da57ba9d6f25870c130c54a049ba4cfad1c444))
* update notification to avoid triggering new alerts ([#71](https://github.com/deeeed/expo-audio-stream/issues/71)) ([32dcfc5](https://github.com/deeeed/expo-audio-stream/commit/32dcfc55daf3236babefc17016f329c177d466fd))
*

### Features
*  wip ([4acc111](https://github.com/deeeed/expo-audio-stream/commit/4acc1118e3589258185b0e25aefd1f961aacaf8b))
*  wip ([d8766ce](https://github.com/deeeed/expo-audio-stream/commit/d8766ce7472fdfc463b7c689ee6f3b3c6cfec307))
* add audio samples ([3b47b93](https://github.com/deeeed/expo-audio-stream/commit/3b47b93b9a1ea259829fcf04aded12d98794b93b))
* add example audio for comparison accross platform ([fa4c4b8](https://github.com/deeeed/expo-audio-stream/commit/fa4c4b8677aa25f4d302c2313b571312d62f5fb3))
* add icons ([fede6cc](https://github.com/deeeed/expo-audio-stream/commit/fede6ccf17c3f01b2334cb51ddf6a6804f899867))
* add jfk assets ([f5af3a2](https://github.com/deeeed/expo-audio-stream/commit/f5af3a29665d1fd246019a80e1ebddda198ae347))
* add options to skip consolidating data on web for faster processing ([329fed8](https://github.com/deeeed/expo-audio-stream/commit/329fed8c322ed34157b344920636e407c4cd805b))
* add skia + experiment downsampling ([05f2aef](https://github.com/deeeed/expo-audio-stream/commit/05f2aeffc30a471163923f7d89fb4174961039d0))
* add support for pausing and resuming compressed recordings ([bc3f629](https://github.com/deeeed/expo-audio-stream/commit/bc3f6295d060396325e0f008ff00b3be9c8722cd))
* adjust deps ([0f88e55](https://github.com/deeeed/expo-audio-stream/commit/0f88e556fa564964903796162faae5a0a8c5ef0e))
* align audio computation for amplitude ([0e21552](https://github.com/deeeed/expo-audio-stream/commit/0e215522b64d7eaba40d3f25a0275d11e8c6f5b1))
* android live working ([f509928](https://github.com/deeeed/expo-audio-stream/commit/f5099282266852ccd526471dd8ad045560e851ac))
* **audio:** implement audio compression support ([ff4e060](https://github.com/deeeed/expo-audio-stream/commit/ff4e060fef1061804c1cc0126d4344d2d50daa9a))
* auto load model files and update dependencies ([#57](https://github.com/deeeed/expo-audio-stream/issues/57)) ([60a34c0](https://github.com/deeeed/expo-audio-stream/commit/60a34c07428fd2812bd05474b311cf5d3e9fdd0e))
* automate API doc export inside docusaurus ([8925422](https://github.com/deeeed/expo-audio-stream/commit/89254220642ce93e6eb5f578b054fefcee7f6ba8))
* begin renaming example to playground ([0a46b15](https://github.com/deeeed/expo-audio-stream/commit/0a46b156d8d8a878b1ee618469ec5e437a3e5280))
* build assets ([acef47c](https://github.com/deeeed/expo-audio-stream/commit/acef47c97108a582bfc54691da08b390df399ae0))
* bump version ([7a55064](https://github.com/deeeed/expo-audio-stream/commit/7a55064d11a55272157eb2c83f59970461ac856d))
* bump version to 0.1.19 ([2d9c4d5](https://github.com/deeeed/expo-audio-stream/commit/2d9c4d5b251fa299a381150e43c3f2022f5153ae))
* clean build ([2001ed4](https://github.com/deeeed/expo-audio-stream/commit/2001ed4d204dc4f574e4b69dbac1a8e229ac5b1f))
* clean prebuild ([98333d4](https://github.com/deeeed/expo-audio-stream/commit/98333d4275dfdfb8e3d27ff5d844798cba5a30bb))
* cleanup ([4b0f39a](https://github.com/deeeed/expo-audio-stream/commit/4b0f39afe4f54645c75174985d5026ac4d126306))
* cleanup ([f77b011](https://github.com/deeeed/expo-audio-stream/commit/f77b0114cf9bf8130c7b4bc11017680897b0d0f5))
* cleanup ([4cd0d80](https://github.com/deeeed/expo-audio-stream/commit/4cd0d8010005e6e8d307184f7bea0adca92361d3))
* cleanup ([1f17964](https://github.com/deeeed/expo-audio-stream/commit/1f17964cd6fc1e877e8ab987a09080c8d2e40e9f))
* cleanup ([0bd2259](https://github.com/deeeed/expo-audio-stream/commit/0bd225968a3dbbeaed77bb5e106ffd99aa8f5f67))
* cleanup ([ecc49ee](https://github.com/deeeed/expo-audio-stream/commit/ecc49ee4a2cd25904dbb7b998157338a8e590436))
* cleanup ([4d8238d](https://github.com/deeeed/expo-audio-stream/commit/4d8238dc311e831c15596b56c86fa16abf807840))
* cleanup ([24f9cab](https://github.com/deeeed/expo-audio-stream/commit/24f9cab92df4b48f62371c9e29b7d4b7613d80b7))
* cleanup ([b26135c](https://github.com/deeeed/expo-audio-stream/commit/b26135c01332a514ea5c83b1d752dfdbc08f5090))
* cleanup ([a4e33a5](https://github.com/deeeed/expo-audio-stream/commit/a4e33a536e3d1533cf0f78284f30c5be793243ec))
* cleanup ([714f198](https://github.com/deeeed/expo-audio-stream/commit/714f198506a9616d09d7617805f37a5e59ed1299))
* cleanup ([649682a](https://github.com/deeeed/expo-audio-stream/commit/649682a7b88730c47eb3cb24ea89f4c583bdc557))
* cleanup ([#83](https://github.com/deeeed/expo-audio-stream/issues/83)) ([c557bd7](https://github.com/deeeed/expo-audio-stream/commit/c557bd79e3b043bc89695a0351014eaca6857036))
* cleanup sonacloud issues ([7d6f5df](https://github.com/deeeed/expo-audio-stream/commit/7d6f5df2c8e75d0b0bf4ff89d83fd31dafd69201))
* cleanup sonarcloud issues ([633e787](https://github.com/deeeed/expo-audio-stream/commit/633e787c0800cdc62b782df76826b712a083c4e9))
* cleanup unwanted file ([2bb6f8d](https://github.com/deeeed/expo-audio-stream/commit/2bb6f8d521e18382d2fe414acb35995a890f02d4))
* correct start config ([5984e40](https://github.com/deeeed/expo-audio-stream/commit/5984e403835af567731c17853e918df2dfe763eb))
* deps ([50ee0cc](https://github.com/deeeed/expo-audio-stream/commit/50ee0cce6c1a0e964f6b5e6a0f4b37a68f08053b))
* **deps:** update expo packages and dependencies to latest patch versions ([#81](https://github.com/deeeed/expo-audio-stream/issues/81)) ([3ed0526](https://github.com/deeeed/expo-audio-stream/commit/3ed0526545623530a10757f1bbd7f877a2c31296))
* design update ([2c9f333](https://github.com/deeeed/expo-audio-stream/commit/2c9f333f29c6ae0002adab09c3d7d58a46ecd2a3))
* disable duplicate notification alerts for audio stream ([#82](https://github.com/deeeed/expo-audio-stream/issues/82)) ([12f9992](https://github.com/deeeed/expo-audio-stream/commit/12f999247cdd6b08753bcf1b481582a604826383))
* display audio analysis on stop for web ([bf70c6c](https://github.com/deeeed/expo-audio-stream/commit/bf70c6cf777878492f21a04948740f409086b0f4))
* display files menu on web ([5927675](https://github.com/deeeed/expo-audio-stream/commit/5927675bc8bc8bccc4cd12bccf0ea278549c3071))
* enable new architecture on minimal demo ([cc2565f](https://github.com/deeeed/expo-audio-stream/commit/cc2565f308e3f54078466fb021376c9866d00c92))
* eslint for minimal project ([2c3fbc0](https://github.com/deeeed/expo-audio-stream/commit/2c3fbc00ba06791789bfed4e9571d0971332fe06))
* **expo-audio-stream:** add comprehensive ios audio session configuration support ([#54](https://github.com/deeeed/expo-audio-stream/issues/54)) ([ba296ac](https://github.com/deeeed/expo-audio-stream/commit/ba296ac9be0d61e7a46cc64953e6f2c66881fdfd))
* **expo-audio-stream:** opt in debug log for plugin config ([03a0a71](https://github.com/deeeed/expo-audio-stream/commit/03a0a7168bb4f77638de51c55a1ad19c713b52dc))
* **expo-audio-stream:** publishing setup ([e969cfb](https://github.com/deeeed/expo-audio-stream/commit/e969cfbb4b844e0fa34f77beb045ef2efb2f7b12))
* **expo-audio-ui:** enhance Waveform component and add RecordButton ([#59](https://github.com/deeeed/expo-audio-stream/issues/59)) ([7a78ed9](https://github.com/deeeed/expo-audio-stream/commit/7a78ed9530554d7346a726cf0ce7d534b0f3ccf2))
* finalize compression info api ([9ef0bd6](https://github.com/deeeed/expo-audio-stream/commit/9ef0bd62270133c8f89a678ec466f99896602583))
* fix native provider for transcription ([5a26d64](https://github.com/deeeed/expo-audio-stream/commit/5a26d64e1ceed5f50494cae4005af70abb8c495f))
* follow audio tracking ([df5afcd](https://github.com/deeeed/expo-audio-stream/commit/df5afcd4277d5a79ab56cf4ba7534f21fc9e1cf3))
* force pause audio at end of drag ([a06c84e](https://github.com/deeeed/expo-audio-stream/commit/a06c84e5ab91259575e36849108cee16f69bee2e))
* full fix ([2be8940](https://github.com/deeeed/expo-audio-stream/commit/2be894060e3d2fcfee75f5f61b9fb8e475083e25))
* handle empty state for audio files ([2ce508c](https://github.com/deeeed/expo-audio-stream/commit/2ce508c001cc16cea38bbec5fbe6cc386ee97e2b))
* implement android feature extraction ([2b221d5](https://github.com/deeeed/expo-audio-stream/commit/2b221d5d92348597413a530a32281ba1173d5a51))
* Improve file handling in the playground app ([a405d55](https://github.com/deeeed/expo-audio-stream/commit/a405d557c0a289a8c15dc111d72137c93143a89a))
* ios bitrate verification to prevent invalid values ([035a180](https://github.com/deeeed/expo-audio-stream/commit/035a1800833264edcc59724aaa8a2e12d5c78dc2))
* ios features extraction ([d297076](https://github.com/deeeed/expo-audio-stream/commit/d297076c50018aff3e8dac14886df018444c0648))
* ios working ([771ee57](https://github.com/deeeed/expo-audio-stream/commit/771ee579f79ee4df4433cf9a1e984a2e0d89398c))
* live working on web ([99dcd9c](https://github.com/deeeed/expo-audio-stream/commit/99dcd9cafebc0d5e8c7eebeaee1662ff68ef492d))
* lockfile update ([a7e1cbb](https://github.com/deeeed/expo-audio-stream/commit/a7e1cbb5ea5055be3c5e52789e784f79f8f69fa2))
* manage files on web ([c8112b6](https://github.com/deeeed/expo-audio-stream/commit/c8112b605a9dd800c9afb90689896811c07b7ffb))
* migrate to yarn berry ([eadbdbe](https://github.com/deeeed/expo-audio-stream/commit/eadbdbeac3a21014d93c96cf1acd154f77db5a42))
* minimal clean ([2f221c2](https://github.com/deeeed/expo-audio-stream/commit/2f221c2140723da69ff72c263dbd28df86909183))
* minimal working version ([ea5ee59](https://github.com/deeeed/expo-audio-stream/commit/ea5ee59bc122574cd42affcc2d52aa664c4e5fb3))
* only opus on wbe ([e0df5b8](https://github.com/deeeed/expo-audio-stream/commit/e0df5b8d862b915e073dca6c430225c69f829953))
* **playground:** enhance app configuration and build setup for production deployment ([#58](https://github.com/deeeed/expo-audio-stream/issues/58)) ([929d443](https://github.com/deeeed/expo-audio-stream/commit/929d443145378b1430d215db5c00b13758420e2b))
* **playground:** enhance Whisper integration with improved UI and iOS support ([#52](https://github.com/deeeed/expo-audio-stream/issues/52)) ([0ca2609](https://github.com/deeeed/expo-audio-stream/commit/0ca2609c3e84d03899b5d4578c453c48ff036b39))
* **playground:** improved reanimated hack ([ba1d039](https://github.com/deeeed/expo-audio-stream/commit/ba1d0395e7e785824fb1e82e018195a2e6429e55))
* **playground:** integrate whisper.rn native speech recognition ([#51](https://github.com/deeeed/expo-audio-stream/issues/51)) ([63f4e8c](https://github.com/deeeed/expo-audio-stream/commit/63f4e8ca227f72e83d5c8a9209d1b25fe820c081)), closes [#13](https://github.com/deeeed/expo-audio-stream/issues/13)
* **playground:** Update app configuration for new architecture settings ([c537267](https://github.com/deeeed/expo-audio-stream/commit/c5372674d67d2be7d6054df8ad61d978c7ad0d73))
* **playground:** update expo and enable new architecture ([c118c52](https://github.com/deeeed/expo-audio-stream/commit/c118c524c131978d6741f72444d5cefa48209481))
* **playground:** update expo dependencies and prepare for deployment ([#61](https://github.com/deeeed/expo-audio-stream/issues/61)) ([f6f5161](https://github.com/deeeed/expo-audio-stream/commit/f6f5161c2459739a5b605bb684422d94520ccb15))
* redux setup ([c012ada](https://github.com/deeeed/expo-audio-stream/commit/c012adafda02e1d556adcdc960be85b46aebfa37))
* reorganize audio files and differentiate active speech color ([def92c8](https://github.com/deeeed/expo-audio-stream/commit/def92c88feb9e9b2474f8f1df87553e7c72b1f55))
* save ([d611a80](https://github.com/deeeed/expo-audio-stream/commit/d611a80654e369fa64e141c38292b213a3374572))
* save state ([97c20fd](https://github.com/deeeed/expo-audio-stream/commit/97c20fd0474cb2eab2db655807b4d9b5ba6d817e))
* save state ([1a30cfe](https://github.com/deeeed/expo-audio-stream/commit/1a30cfe1350e8704320af2c2526570173636a5bd))
* save state ([072765b](https://github.com/deeeed/expo-audio-stream/commit/072765b5bf6151742a80db1223378c6dffcde67f))
* saving state ([fea84fa](https://github.com/deeeed/expo-audio-stream/commit/fea84fa89f2a46e4efb4ff70aa29a9d3527dc159))
* setup rncpp package ([09c6ecd](https://github.com/deeeed/expo-audio-stream/commit/09c6ecd541a3db64892288bc6425711de5ab185f))
* setup script for publishing ([6d94aec](https://github.com/deeeed/expo-audio-stream/commit/6d94aecfe15974d612e367335e4cafd4a4114e81))
* simplify gesture handler ([9c86f2f](https://github.com/deeeed/expo-audio-stream/commit/9c86f2f44f9b9b5605a39e70ddaff71267d779d9))
* simplify updateActivePoints params ([a14674f](https://github.com/deeeed/expo-audio-stream/commit/a14674fc93e0f97d6b43051a9b61ecac8c4595f3))
* smooth scrolling ([5cc1b15](https://github.com/deeeed/expo-audio-stream/commit/5cc1b15fa103ca3d36574883cd32c1a67a3e74c5))
* styling ([7e76879](https://github.com/deeeed/expo-audio-stream/commit/7e76879ef447b0b65501311dd34b98d14df35020))
* ui improvements ([#7](https://github.com/deeeed/expo-audio-stream/issues/7)) ([ea17266](https://github.com/deeeed/expo-audio-stream/commit/ea17266b4285763112bec8a020d30455f0c64762))
* Update audio-recording component styles and UI ([#8](https://github.com/deeeed/expo-audio-stream/issues/8)) ([7caea1f](https://github.com/deeeed/expo-audio-stream/commit/7caea1fc0f8657165aad24375402d15dea12451a))
* update deisgn system ([e01732e](https://github.com/deeeed/expo-audio-stream/commit/e01732e6dcf3e95874d902c309846ebd35b901fc))
* update deps and audio hex visualization ([#11](https://github.com/deeeed/expo-audio-stream/issues/11)) ([f664fe9](https://github.com/deeeed/expo-audio-stream/commit/f664fe92d99ee76f79448b5d1f4a935a5b4108e3))
* update docs ([#10](https://github.com/deeeed/expo-audio-stream/issues/10)) ([1ad30a4](https://github.com/deeeed/expo-audio-stream/commit/1ad30a4b9721501d88a7f0b2f77db947ba317f31))
* updated config ([7ea18cb](https://github.com/deeeed/expo-audio-stream/commit/7ea18cb19a892e31cc48220b2eda8de070df49ba))
* updated doc ([9c5f4dd](https://github.com/deeeed/expo-audio-stream/commit/9c5f4ddfb24251adbcdea397a8b1a0dd30f00e14))
* upgrade expo and rn ([98aa423](https://github.com/deeeed/expo-audio-stream/commit/98aa4232021728ad8bce76054d2421e6df024803))
* use flatlist instead of scrollview for logs ([d73b932](https://github.com/deeeed/expo-audio-stream/commit/d73b93290621a09de8fb7cc5865a9c2f8068f9df))
* use indexeddb instead of session storage ([a71d630](https://github.com/deeeed/expo-audio-stream/commit/a71d630a18362a8f3c25599bdb3bd0989582f8dd))
* web implementation of compressed stream ([363ad82](https://github.com/deeeed/expo-audio-stream/commit/363ad8289b419f86f4322addc4e2b33db8d85004))
* **web-audio:** optimize memory usage and streaming performance for web audio recording ([#75](https://github.com/deeeed/expo-audio-stream/issues/75)) ([7b93e12](https://github.com/deeeed/expo-audio-stream/commit/7b93e12aae4bc0599b06b48ca34a60f65587fc75))
* whisperweb integration ([#12](https://github.com/deeeed/expo-audio-stream/issues/12)) ([1dc5bf0](https://github.com/deeeed/expo-audio-stream/commit/1dc5bf053c56a78d5d4d581d96ab78d167d36b58)), closes [#34](https://github.com/deeeed/expo-audio-stream/issues/34)
* wip ([109e2f5](https://github.com/deeeed/expo-audio-stream/commit/109e2f59d81739e05c7ae2d0246c9808aa12b207))
* wip ([a3789d7](https://github.com/deeeed/expo-audio-stream/commit/a3789d7c82cae6d2dfea5dceafe27829d1a54c96))
* wip ([aef25e2](https://github.com/deeeed/expo-audio-stream/commit/aef25e279363eaefb484467e97e7e119b4d4ae7d))
* wip ([9137e75](https://github.com/deeeed/expo-audio-stream/commit/9137e7589c97d9bdf283ae227091086f4591e4ed))
* wip ([158a447](https://github.com/deeeed/expo-audio-stream/commit/158a447bc68363ff2ef61d0415c19ccc01627ffc))
* wip ([0f98b57](https://github.com/deeeed/expo-audio-stream/commit/0f98b576cd4ab9f4b0d9febb08ab047c20f098dc))
* wip ([ebb3b78](https://github.com/deeeed/expo-audio-stream/commit/ebb3b788250c746ce50d56a97810b7fc57224b26))
* wip ([84c4a6b](https://github.com/deeeed/expo-audio-stream/commit/84c4a6b7ed50d9df4823e8f10668f69b52e97bfd))
* wip ([1f23623](https://github.com/deeeed/expo-audio-stream/commit/1f236230d1cba8448f1a41fe86809db005f21086))
* wip ([5d9f52a](https://github.com/deeeed/expo-audio-stream/commit/5d9f52ad8aab54839342c021b23f36508996d9c3))
* wip ([c49e81d](https://github.com/deeeed/expo-audio-stream/commit/c49e81da8a704cdf8046ce48944c185b3e3bbd7b))
* wip ([f69caf4](https://github.com/deeeed/expo-audio-stream/commit/f69caf4d39d30b44ad3bf7a9f7dadf3e206d5a7a))
* wip ([79364ed](https://github.com/deeeed/expo-audio-stream/commit/79364edbbde84c22482d2118cf71fa04c9a11fce))
* wip ([fc7b156](https://github.com/deeeed/expo-audio-stream/commit/fc7b1569fd2b788460b6ef4213b429cf6e333a41))
* wip ([1260fce](https://github.com/deeeed/expo-audio-stream/commit/1260fceb12435f9113fe9048223200fc3f25775d))
* wip ([53c13b0](https://github.com/deeeed/expo-audio-stream/commit/53c13b04b8bce0cec36009a2312086f1c5a12624))
* wip ([940ba32](https://github.com/deeeed/expo-audio-stream/commit/940ba32b37357b79890eeb57ca7fd8c041b2a23a))
* wip ([8e731a8](https://github.com/deeeed/expo-audio-stream/commit/8e731a8b4a8e2ae255d347c6132a024b6cc1eff4))
* wip ([72530f9](https://github.com/deeeed/expo-audio-stream/commit/72530f908d2e90584a8fcc1adf710686f72d66a5))
* wip ([f09be94](https://github.com/deeeed/expo-audio-stream/commit/f09be94b31191f3d157c54c3c8ecd0e8764cf653))
* wip ([466282a](https://github.com/deeeed/expo-audio-stream/commit/466282acc53030af03e02e3e3f107c8d4121badc))
* wip ([8173fec](https://github.com/deeeed/expo-audio-stream/commit/8173fec1df32338d12d9a32870c69b6dc6296497))
* wip ([2daac9f](https://github.com/deeeed/expo-audio-stream/commit/2daac9fb11426ff3bec8a146871ea91b2ca422b2))
* wip and ios improvements ([80463f1](https://github.com/deeeed/expo-audio-stream/commit/80463f1694d5a9d4d963d51587e8214362b9e57c))
* working downsampling ([e62e06e](https://github.com/deeeed/expo-audio-stream/commit/e62e06e38b51057adbc32ce371a4d895e51d4530))
* working ios+android+web visuals ([5906ba5](https://github.com/deeeed/expo-audio-stream/commit/5906ba5460149d931bf0acdd0e54051497c79975))
* working minimal example ([f1cae73](https://github.com/deeeed/expo-audio-stream/commit/f1cae73adc8a6335801996889d04acd4a8b96c18))
*

### Reverts
* Revert "Implement refresh control and add clipboard dependency and babel asse…" (#6) ([5f82f64](https://github.com/deeeed/expo-audio-stream/commit/5f82f644fdc7735988d1d46520120945ff8e6174)), closes [#6](https://github.com/deeeed/expo-audio-stream/issues/6)
## [1.11.3] - 2025-01-25
- disable duplicate notification alerts for audio stream (#82) ([12f9992](https://github.com/deeeed/expo-audio-stream/commit/12f999247cdd6b08753bcf1b481582a604826383))
- feat(deps): update expo packages and dependencies to latest patch versions (#81) ([3ed0526](https://github.com/deeeed/expo-audio-stream/commit/3ed0526545623530a10757f1bbd7f877a2c31296))
## [1.11.2] - 2025-01-22
- resources not cleanup properly on app kill (#80) ([7d522a5](https://github.com/deeeed/expo-audio-stream/commit/7d522a531e70065b99758aa3a4c669769fdbd110))
## [1.11.1] - 2025-01-22
- chore: force deployment of 1.11.1
## [1.11.0] - 2025-01-22
- feat(audio): add intelligent call interruption handling & compression improvements ([f8f6187](https://github.com/deeeed/expo-audio-stream/pull/78))
## [1.10.0] - 2025-01-14
- add support for pausing and resuming compressed recordings ([bc3f629](https://github.com/deeeed/expo-audio-stream/commit/bc3f6295d060396325e0f008ff00b3be9c8722cd))
- optimize notification channel settings ([daa075e](https://github.com/deeeed/expo-audio-stream/commit/daa075e668f8faf0b8d2849e18c37384bdd293b8))
## [1.9.2] - 2025-01-12
- ios bitrate verification to prevent invalid values ([035a180](https://github.com/deeeed/expo-audio-stream/commit/035a1800833264edcc59724aaa8a2e12d5c78dc2))
## [1.9.1] - 2025-01-12
- ios potentially missing compressed file info ([88a628c](https://github.com/deeeed/expo-audio-stream/commit/88a628c35f2bfd626a2a5de1eb6950efd814619d))
## [1.9.0] - 2025-01-11
- feat(web-audio): optimize memory usage and streaming performance for web audio recording (#75) ([7b93e12](https://github.com/deeeed/expo-audio-stream/commit/7b93e12aae4bc0599b06b48ca34a60f65587fc75))
## [1.8.0] - 2025-01-10
- feat(audio): implement audio compression support ([ff4e060](https://github.com/deeeed/expo-audio-stream/commit/ff4e060fef1061804c1cc0126d4344d2d50daa9a))
## [1.7.2] - 2025-01-07
- fix(audio-stream): correct WAV header handling in web audio recording ([9ba7de5](https://github.com/deeeed/expo-audio-stream/commit/9ba7de5b96ca4cc937dea261c80d3fda9c99e8f4))
## [1.7.1] - 2025-01-07
- update notification to avoid triggering new alerts (#71) ([32dcfc5](https://github.com/deeeed/expo-audio-stream/commit/32dcfc55daf3236babefc17016f329c177d466fd))
## [1.7.0] - 2025-01-05
- feat(playground): enhance app configuration and build setup for production deployment (#58) ([929d443](https://github.com/deeeed/expo-audio-stream/commit/929d443145378b1430d215db5c00b13758420e2b))
- chore(expo-audio-stream): release @siteed/expo-audio-stream@1.6.1 ([084e8ad](https://github.com/deeeed/expo-audio-stream/commit/084e8adb91da7874c9e608b55d9c7b2ffd7a8327))
- fix(ios): improve audio resampling and duration tracking (#69) ([51bef49](https://github.com/deeeed/expo-audio-stream/commit/51bef493b8e167852c64b8c66a9f8a14cd34f99c))
- handle paused state in stopRecording (#68) ([15eac9b](https://github.com/deeeed/expo-audio-stream/commit/15eac9bfcc3203e4a5eb5f236286ed72aafde722))
- reset audio recording state properly on iOS and Android (#66) ([61e9c26](https://github.com/deeeed/expo-audio-stream/commit/61e9c261fb3a979be1894e537233d6e5a4fbdae4))
- total size doesnt reset on new recording android (#64) ([f7da57b](https://github.com/deeeed/expo-audio-stream/commit/f7da57ba9d6f25870c130c54a049ba4cfad1c444))
## [1.6.1] - 2024-12-11
- chore(expo-audio-stream): remove git commit step from publish script ([4a772ce](https://github.com/deeeed/expo-audio-stream/commit/4a772ce93bb7405d9b8e981f46bdf8941a71ecfe))
- chore: more publishing automation ([3693021](https://github.com/deeeed/expo-audio-stream/commit/369302107f9dca9dddd8ae68e6214481a39976ac))
- expo plugin files not published ([b88c446](https://github.com/deeeed/expo-audio-stream/commit/b88c44667013a901fccfe6f89dcb640ae2aae47f))
- chore(expo-audio-stream): improved build publish script ([ad65a69](https://github.com/deeeed/expo-audio-stream/commit/ad65a69011273e0eab1ac0f464fc3b009fc3433d))
- fix(expo-audio-stream): missing package files ([0901a1b](https://github.com/deeeed/expo-audio-stream/commit/0901a1bbbcce3111c9b5d61ade8caa48bcdd3613))
- feat(expo-audio-stream): opt in debug log for plugin config ([03a0a71](https://github.com/deeeed/expo-audio-stream/commit/03a0a7168bb4f77638de51c55a1ad19c713b52dc))
- fix(expo-audio-stream): include all build + sourcemaps files in the package
- fix(expo-audio-stream): missing plugin files ([e56254a](https://github.com/deeeed/expo-audio-stream/commit/e56254a4ffa1c015df3d300831ba0b392958b6c8))
- fix(expo-audio-stream): plugin deployment process and build system enhancements (#56) ([63fbeb8](https://github.com/deeeed/expo-audio-stream/commit/63fbeb82f56130dedeafa633e916f2ce0f8f1a67))
## [1.5.0] - 2024-12-10
- UNPUBLISHED because of a bug in the build system
## [1.4.0] - 2024-12-05
- chore: remove unusded dependencies ([ad81dd5](https://github.com/deeeed/expo-audio-stream/commit/ad81dd560c93dd1d04995a323a4ae72d4de20f3e))
## [1.3.1] - 2024-12-05
- feat(web): implement throttling and optimize event processing (#49) ([da28765](https://github.com/deeeed/expo-audio-stream/commit/da2876524c2c9d6e0a980fde40a0197b929d8a7f))
## [1.3.0] - 2024-11-28
### Added
- refactor(permissions): standardize permission status response structure across platforms (#44) ([7c9c800](https://github.com/deeeed/expo-audio-stream/commit/7c9c800d83b7cea3516643371484d5e1f3b99e4c))
- fix(web): add temporary worklet initialization patch for reanimated ([2afcf02](https://github.com/deeeed/expo-audio-stream/commit/2afcf02ddc982e18a419f0132bc42200f3fdebb1))
- feat: update expo-modules-core ([54ed5c5](https://github.com/deeeed/expo-audio-stream/commit/54ed5c59affa46fdf8cdc2e8048766247a4ed16c))
- feat: latest expo fixes ([9cc5ac3](https://github.com/deeeed/expo-audio-stream/commit/9cc5ac39751999e5b33e11c16355557143d68d10))
- feat: latest expo sdk ([258ef6c](https://github.com/deeeed/expo-audio-stream/commit/258ef6cf68e70c7855f696a01204f79b0793fdc0))
## [1.2.5] - 2024-11-12
### Added
- docs(license): add MIT license to all packages (6 files changed)
- fix(expo-audio-stream): return actual recording settings from startRecording on iOS #37
## [1.2.4] - 2024-11-05
### Changed
- Android minimum audio interval set to 10ms. 
- plugin setup do not include 'notification' config by default to prevent ios version mismatch.

### Fixed
- Remove frequently firing log statements on web.
## [1.2.0] - 2024-10-24
### Added
- Feature: Keep device awake during recording with `keepAwake` option
- Feature: Customizable recording notifications for Android and iOS
  - Android: Rich notification support with live waveform visualization
  - Android: Configurable notification actions, colors, and priorities
  - iOS: Integration with media player
## [1.1.17] - 2024-10-21
### Added
- Support bluetooth headset on ios
- Fixes: android not reading custom interval audio update
## [1.0.0] - 2024-04-01
### Added
- Initial release of @siteed/expo-audio-stream.
- Feature: Real-time audio streaming across iOS, Android, and web.
- Feature: Configurable intervals for audio buffer receipt.
- Feature: Automated microphone permissions setup in managed Expo projects.
- Feature: Background audio recording on iOS.
- Feature: Audio features extraction during recording.
- Feature: Consistent WAV PCM recording format across all platforms.

[unreleased]: https://github.com/deeeed/expo-audio-stream/compare/@siteed/expo-audio-stream@1.11.4...HEAD
[1.11.4]: https://github.com/deeeed/expo-audio-stream/compare/@siteed/expo-audio-stream@1.11.3...@siteed/expo-audio-stream@1.11.4
[1.11.3]: https://github.com/deeeed/expo-audio-stream/compare/@siteed/expo-audio-stream@1.11.2...@siteed/expo-audio-stream@1.11.3
[1.11.2]: https://github.com/deeeed/expo-audio-stream/compare/@siteed/expo-audio-stream@1.11.1...@siteed/expo-audio-stream@1.11.2
[1.11.1]: https://github.com/deeeed/expo-audio-stream/compare/@siteed/expo-audio-stream@1.11.0...@siteed/expo-audio-stream@1.11.1
[1.11.0]: https://github.com/deeeed/expo-audio-stream/compare/@siteed/expo-audio-stream@1.10.0...@siteed/expo-audio-stream@1.11.0
[1.10.0]: https://github.com/deeeed/expo-audio-stream/compare/@siteed/expo-audio-stream@1.9.2...@siteed/expo-audio-stream@1.10.0
[1.9.2]: https://github.com/deeeed/expo-audio-stream/compare/@siteed/expo-audio-stream@1.9.1...@siteed/expo-audio-stream@1.9.2
[1.9.1]: https://github.com/deeeed/expo-audio-stream/compare/@siteed/expo-audio-stream@1.9.0...@siteed/expo-audio-stream@1.9.1
[1.9.0]: https://github.com/deeeed/expo-audio-stream/compare/@siteed/expo-audio-stream@1.8.0...@siteed/expo-audio-stream@1.9.0
[1.8.0]: https://github.com/deeeed/expo-audio-stream/compare/@siteed/expo-audio-stream@1.7.2...@siteed/expo-audio-stream@1.8.0
[1.7.2]: https://github.com/deeeed/expo-audio-stream/compare/@siteed/expo-audio-stream@1.7.1...@siteed/expo-audio-stream@1.7.2
[1.7.1]: https://github.com/deeeed/expo-audio-stream/compare/@siteed/expo-audio-stream@1.7.0...@siteed/expo-audio-stream@1.7.1
[1.7.0]: https://github.com/deeeed/expo-audio-stream/compare/@siteed/expo-audio-stream@1.6.1...@siteed/expo-audio-stream@1.7.0
[1.6.1]: https://github.com/deeeed/expo-audio-stream/compare/@siteed/expo-audio-stream@1.6.0...@siteed/expo-audio-stream@1.6.1
[1.5.0]: https://github.com/deeeed/expo-audio-stream/compare/@siteed/expo-audio-stream@1.4.0...@siteed/expo-audio-stream@1.5.0
[1.4.0]: https://github.com/deeeed/expo-audio-stream/compare/@siteed/expo-audio-stream@1.3.1...@siteed/expo-audio-stream@1.4.0
[1.3.1]: https://github.com/deeeed/expo-audio-stream/compare/@siteed/expo-audio-stream@1.3.0...@siteed/expo-audio-stream@1.3.1
[Unreleased]: https://github.com/deeeed/expo-audio-stream/compare/v1.0.0...HEAD
[1.0.0]: https://github.com/deeeed/expo-audio-stream/releases/tag/v1.0.0
