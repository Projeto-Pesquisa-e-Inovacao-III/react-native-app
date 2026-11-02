const { withAppBuildGradle } = require("expo/config-plugins");

function withAgp9Compatibility(config) {
  return withAppBuildGradle(config, (config) => {
    if (config.modResults.language === "groovy") {
      config.modResults.contents = config.modResults.contents
        .replace(
          /^apply plugin: ["']org\.jetbrains\.kotlin\.android["']\r?\n/m,
          ""
        )
        .replace(
          /getDefaultProguardFile\(["']proguard-android\.txt["']\)/g,
          'getDefaultProguardFile("proguard-android-optimize.txt")'
        );
    }

    return config;
  });
}

module.exports = withAgp9Compatibility;
