module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      [
        'module-resolver',
        {
          root: ['.'],
          extensions: ['.ts', '.tsx', '.js', '.jsx', '.json'],
          alias: {
            '@components': './src/components',
            '@screens': './src/screens',
            '@hooks': './src/hooks',
            '@services': './src/services',
            '@models': './src/models',
            '@constants': './src/constants',
            '@utils': './src/utils',
            '@assets': './src/assets',
          },
        },
      ],
    ],
  };
};
