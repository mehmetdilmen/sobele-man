module.exports = {
    name: 'Sobele Man',
    slug: 'sobele-man',
    version: '1.0.0',
    orientation: 'portrait',
    icon: './assets/images/icon.png',
    userInterfaceStyle: 'light',
    splash: {
        image: './assets/images/splash_screen.png',
        resizeMode: 'contain',
        backgroundColor: '#ffffff'
    },
    assetBundlePatterns: ['**/*'],
    ios: {
        supportsTablet: true,
        bundleIdentifier: 'com.mehmetdilmen.sobeleman'
    },
    android: {
        adaptiveIcon: {
            foregroundImage: './assets/images/adaptive-icon.png',
            backgroundColor: '#ffffff'
        },
        package: 'com.mehmetdilmen.sobeleman',
        versionCode: 1,
        permissions: []
    },
    plugins: [
        'expo-router'
    ],
    extra: {
        eas: {
            projectId: '90b91f9c-f305-46a8-9001-6658ea450ae1'
        }
    }
}; 