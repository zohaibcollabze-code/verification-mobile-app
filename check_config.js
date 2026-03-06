const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');

try {
    const config = getDefaultConfig(__dirname);
    console.log('Resolver Config:');
    console.log('assetExts:', config.resolver.assetExts);
    console.log('sourceExts:', config.resolver.sourceExts);
    console.log('nodeModulesPaths:', config.resolver.nodeModulesPaths);
    console.log('platforms:', config.resolver.platforms);

    const finalConfig = withNativeWind(config, { input: './global.css' });
    console.log('\nFinal Resolver Config:');
    console.log('assetExts:', finalConfig.resolver.assetExts);
    console.log('sourceExts:', finalConfig.resolver.sourceExts);
} catch (e) {
    console.error(e);
}
