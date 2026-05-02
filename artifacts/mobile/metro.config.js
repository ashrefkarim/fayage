const { getDefaultConfig } = require("expo/metro-config");
const path = require("path");

const config = getDefaultConfig(__dirname);

config.resolver.blockList = [
  new RegExp(
    path.join(__dirname, "..\\/(api-server|mockup-sandbox)\\/").replace(/\\/g, "\\\\")
  ),
  /nodemailer_tmp/,
];

config.resolver.extraNodeModules = {
  ...config.resolver.extraNodeModules,
  buffer: path.resolve(__dirname, "../../node_modules/.pnpm/buffer@6.0.3/node_modules/buffer"),
};

module.exports = config;
