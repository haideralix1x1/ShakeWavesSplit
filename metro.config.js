const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Ensure raw audio, video, and font files are bundled as assets
config.resolver.assetExts.push('wav', 'mp3', 'm4a', 'flac', 'mp4', 'otf', 'ttf');

module.exports = config;
