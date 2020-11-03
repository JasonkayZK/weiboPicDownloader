module.exports = {
    pluginOptions: {
        electronBuilder: {
            builderOptions: {
                "appId": "io.jasonkayzk.github",
                "productName": "WeiboPicDownloader",
                "copyright": "MIT",
                "directories": {
                    "output": "./dist"
                },
                "win": {
                    "icon": "./public/Logo.png",
                    "target": [
                        {
                            "target": "nsis",
                            "arch": [
                                "x64",
                                "ia32"
                            ]
                        }
                    ]
                },
                "mac": {
                    "icon": "./public/Logo.png",
                    "target": "dmg"
                },
                "linux": {
                    "icon": "./public/Logo.png",
                    "target": "AppImage"
                }
            }
        }
    }
}