#!/usr/bin/env bash
set -euo pipefail

root=$(cd "$(dirname "$0")" && pwd)
home=$(mktemp -d "${TMPDIR:-/tmp}/hoshcode-install-test.XXXXXXXX")
trap 'rm -rf "$home"' EXIT
uname() { printf 'Darwin\n'; }
export -f uname
mkdir -p "$home/.opencode/bin"
printf 'upstream\n' > "$home/.opencode/bin/opencode"
printf 'legacy\n' > "$home/.opencode/bin/opencode2"
printf '#!/bin/sh\nprintf "hoshcode fixture\\n"\n' > "$home/binary"

HOME="$home" SHELL=/bin/zsh bash "$root/install" --binary "$home/binary" --hoshcode >/dev/null
[[ $("$home/.opencode/bin/hoshcode") == 'hoshcode fixture' ]]
[[ $(cat "$home/.opencode/bin/opencode") == upstream ]]
[[ $(cat "$home/.opencode/bin/opencode2") == legacy ]]
[[ $(grep -Fc 'export PATH=' "$home/.zshrc") == 1 ]]
HOME="$home" SHELL=/bin/zsh bash "$root/install" --binary "$home/binary" --hoshcode >/dev/null
[[ $(grep -Fc 'export PATH=' "$home/.zshrc") == 1 ]]
HOME="$home" SHELL=/bin/zsh bash "$root/install" --binary "$home/binary" --no-modify-path >/dev/null
[[ $("$home/.opencode/bin/opencode") == 'hoshcode fixture' ]]
[[ $("$home/.opencode/bin/opencode2") == 'hoshcode fixture' ]]
[[ $("$home/.opencode/bin/hoshcode") == 'hoshcode fixture' ]]
if HOME="$home" SHELL=/bin/zsh bash "$root/install" --hoshcode >/dev/null 2>&1; then exit 1; fi
