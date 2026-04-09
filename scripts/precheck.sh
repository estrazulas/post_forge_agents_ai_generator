#!/usr/bin/env bash
set -euo pipefail

function require_cmd() {
  local cmd="$1"
  local help_text="$2"

  if ! command -v "$cmd" >/dev/null 2>&1; then
    echo "[ERRO] Comando ausente: $cmd"
    echo "Como corrigir: $help_text"
    exit 1
  fi
}

echo "[INFO] Validando pre-requisitos..."

require_cmd docker "Instale Docker Engine: https://docs.docker.com/engine/install/"
require_cmd node "Instale Node.js 20+: https://nodejs.org/"
require_cmd python3 "Instale Python 3.11+: https://www.python.org/downloads/"

if ! docker compose version >/dev/null 2>&1; then
  echo "[ERRO] Docker Compose indisponivel."
  echo "Como corrigir: instale plugin compose em https://docs.docker.com/compose/install/"
  exit 1
fi

NODE_MAJOR=$(node -p "process.versions.node.split('.')[0]")
if [[ "$NODE_MAJOR" -lt 20 ]]; then
  echo "[ERRO] Node.js 20+ e obrigatorio. Versao atual: $(node -v)"
  exit 1
fi

PY_VERSION=$(python3 -c 'import sys; print(f"{sys.version_info.major}.{sys.version_info.minor}")')
PY_MAJOR=${PY_VERSION%%.*}
PY_MINOR=${PY_VERSION##*.}
if [[ "$PY_MAJOR" -lt 3 ]] || [[ "$PY_MAJOR" -eq 3 && "$PY_MINOR" -lt 11 ]]; then
  echo "[ERRO] Python 3.11+ e obrigatorio. Versao atual: $PY_VERSION"
  exit 1
fi

echo "[OK] Pre-requisitos validados com sucesso."
