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
    platforms.version = [ "34" "35" "36" ];
    buildTools.version = [ "34.0.0" "35.0.0" "36.0.0" ];
    ndk = {
      enable = true;
      version = [ "27.1.12297006" ];
    };
  };

  packages = with pkgs; [
    android-tools
    zlib
  ];

  env.NIX_LD = pkgs.lib.fileContents "${pkgs.stdenv.cc}/nix-support/dynamic-linker";
}