#!/usr/bin/env bash
# Sobe a API local e a interface React na máquina. Não publica em nuvem.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

if [[ -x "${HOME}/.local/node/bin/node" ]]; then
  export PATH="${HOME}/.local/node/bin:${PATH}"
fi

if [[ -z "${GEMINI_API_KEY:-}" ]]; then
  echo "Defina GEMINI_API_KEY no ambiente do processo. A chave não deve entrar no repositório." >&2
  exit 1
fi

if [[ ! -x "${ROOT}/.venv/bin/uvicorn" ]]; then
  echo "Ambiente Python ausente. Crie .venv e instale requirements.txt." >&2
  exit 1
fi

if ! command -v npm >/dev/null; then
  echo "Node.js/npm não encontrados. Instale o Node.js só para servir a interface React." >&2
  exit 1
fi

if [[ ! -d "${ROOT}/web/node_modules" ]]; then
  (cd "${ROOT}/web" && npm install)
fi

"${ROOT}/.venv/bin/uvicorn" api.app:app --host 127.0.0.1 --port 8765 &
API_PID=$!
cleanup() {
  kill "${API_PID}" "${WEB_PID:-}" 2>/dev/null || true
}
trap cleanup EXIT INT TERM

(cd "${ROOT}/web" && npm run dev) &
WEB_PID=$!
wait
