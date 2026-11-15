"""Separa o retorno final nos três blocos pedidos pela instrução de encerramento."""

from __future__ import annotations

import re

_BLOCK_ORDER = (
    ("pontos_positivos", re.compile(r"pontos positivos\s*:", re.IGNORECASE)),
    ("pontos_de_melhoria", re.compile(r"pontos de melhoria\s*:", re.IGNORECASE)),
    ("proximo_passo", re.compile(r"pr[oó]ximo passo\s*:", re.IGNORECASE)),
)

EMPTY_BLOCKS = {
    "pontos_positivos": "",
    "pontos_de_melhoria": "",
    "proximo_passo": "",
}


def parse_feedback(text: str) -> dict[str, str]:
    """Devolve só os três blocos. Não inventa conteúdo ausente."""
    source = (text or "").strip()
    found: list[tuple[int, int, str]] = []
    for key, pattern in _BLOCK_ORDER:
        match = pattern.search(source)
        if match:
            found.append((match.start(), match.end(), key))
    found.sort()

    blocks = dict(EMPTY_BLOCKS)
    for index, (_start, end, key) in enumerate(found):
        stop = found[index + 1][0] if index + 1 < len(found) else len(source)
        blocks[key] = source[end:stop].strip()
    return blocks
