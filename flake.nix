{
  description = "Backstage development environment";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
    flake-utils.url = "github:numtide/flake-utils";
  };

  outputs = { self, nixpkgs, flake-utils }:
    flake-utils.lib.eachDefaultSystem (system:
      let
        pkgs = import nixpkgs { inherit system; };
      in
      {
        devShells.default = pkgs.mkShell {
          name = "backstage-dev";

          packages = with pkgs; [
            # Node.js 22 (matches engines: "22 || 24")
            nodejs_22
            yarn

            # Backstage native build deps (for sqlite, isolated-vm, etc.)
            python3
            pkg-config
            gcc
            gnumake

            # Tools commonly needed by Backstage plugins / techdocs
            git
            curl
            jq

            # Optional: docker CLI for `yarn build-image`
            docker

            # Task runner
            just
          ];

          shellHook = ''
            echo "Backstage dev shell"
            echo "  node:   $(node --version)"
            echo "  yarn:   $(yarn --version)"
            echo ""
            echo "Common commands:"
            echo "  just                # list tasks"
            echo "  just up             # start nsq stack"
            echo "  just dev            # install + run backstage"
            echo "  just down           # stop nsq stack"
          '';
        };
      });
}
