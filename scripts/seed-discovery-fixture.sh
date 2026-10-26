#!/usr/bin/env bash
# Cria uma pasta com repos filhos para testar a descoberta de coleções do Gruno.
# Uso:
#   scripts/seed-discovery-fixture.sh [pasta]        cria o cenário (padrão: ~/gruno-discovery-test)
#   scripts/seed-discovery-fixture.sh [pasta] delete   apaga o repo "api-pagamentos" (testa Ausente)
#   scripts/seed-discovery-fixture.sh [pasta] restore  recria o repo apagado
#   scripts/seed-discovery-fixture.sh [pasta] clean    remove tudo
set -euo pipefail

ROOT="${1:-$HOME/gruno-discovery-test}"
ACTION="${2:-seed}"

make_collection() { # repo, pasta (gruno|bruno|collection), nome
  local dir="$ROOT/$1/$2"
  mkdir -p "$dir"
  cat > "$dir/bruno.json" <<JSON
{ "version": "1", "name": "$3", "type": "collection", "ignore": ["node_modules", ".git"] }
JSON
  cat > "$dir/ping.bru" <<BRU
meta {
  name: ping
  type: http
  seq: 1
}

get {
  url: https://httpbin.org/get
  body: none
  auth: none
}
BRU
}

init_repo() { git init -q "$ROOT/$1" 2>/dev/null || mkdir -p "$ROOT/$1"; }

case "$ACTION" in
  seed)
    mkdir -p "$ROOT"
    init_repo api-pagamentos;  make_collection api-pagamentos  bruno      "Pagamentos"
    init_repo api-usuarios;    make_collection api-usuarios    gruno      "Usuários"
    init_repo api-relatorios;  make_collection api-relatorios  collection "Relatórios"
    # prioridade: gruno vence bruno quando as duas existem
    init_repo api-duplicado;   make_collection api-duplicado  gruno "Duplicado (gruno)"
                               make_collection api-duplicado  bruno "Duplicado (bruno)"
    # problema: pasta bruno/ sem bruno.json
    init_repo api-quebrado;    mkdir -p "$ROOT/api-quebrado/bruno"
    # sem coleção nenhuma e pasta ignorada: não devem aparecer
    init_repo sem-colecao;     echo "x" > "$ROOT/sem-colecao/README.md"
    mkdir -p "$ROOT/node_modules/pacote/bruno" "$ROOT/.oculta/bruno"
    echo "Cenário criado em $ROOT"
    echo "Esperado no scan: 4 encontradas (pagamentos, usuarios, relatorios, duplicado[gruno]) e 1 problema (api-quebrado)."
    ;;
  delete)
    rm -rf "$ROOT/api-pagamentos"
    echo "api-pagamentos apagado. Rode Scan now: deve aparecer como Ausente."
    ;;
  restore)
    init_repo api-pagamentos; make_collection api-pagamentos bruno "Pagamentos"
    echo "api-pagamentos restaurado. Rode Scan now: o badge Ausente deve sumir."
    ;;
  clean)
    rm -rf "$ROOT"; echo "Removido $ROOT"
    ;;
  *) echo "Ação inválida: $ACTION (seed|delete|restore|clean)"; exit 1 ;;
esac
