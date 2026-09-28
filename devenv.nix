{ pkgs, config, inputs, ... }:

{
  languages.javascript = {
    enable = true;
    npm.enable = true;
  };

  languages.java = {
    enable = true;
    jdk.package = pkgs.jdk17;
  };

  android = {
    enable = true;
    platforms.version = [ "37" ];
    buildTools.version = [ "37.0.0" ];
  };

  packages = with pkgs; [
    android-tools
    zlib
  ];

  env.NIX_LD = pkgs.lib.fileContents "${pkgs.stdenv.cc}/nix-support/dynamic-linker";
}