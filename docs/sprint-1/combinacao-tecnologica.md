# Registro da combinação tecnológica

**Projeto:** Simulador de Conversação em Inglês com Inteligência Artificial  
**Sprint:** 1 — Base do fluxo e escolha da tecnologia  
**Card:** [issue 2](https://github.com/fsluizvictor/poc-en-simulator/issues/2)  
**Data do registro:** 10 de novembro de 2026

A combinação abaixo é a escolhida para a Sprint 2. O teste de 10 de novembro de 2026 exercitou diálogo e síntese. O reconhecimento devolveu transcrição vazia porque o microfone não captou uma frase falada. O detalhe está na seção 4 e em `docs/sprint-1/resultado-teste-voz.md`.

## 1. Combinação escolhida

| Papel | Escolha | Por que esta, entre as alternativas do escopo |
|-------|---------|-----------------------------------------------|
| Interface | React, servida na máquina local | O escopo admite React, Vue ou Angular. O fluxo cabe em uma tela: cenário, captura, reprodução e três blocos. React cobre essa tela sem acrescentar cenário, cadastro ou banco |
| Orquestração | API local em Python 3.12, no padrão *Backend for Frontend* (BFF) | O escopo exige que a chave fique fora do navegador. Python 3.12 já está no computador da prova de conceito, e o teste de voz usa o mesmo SDK oficial do provedor |
| Reconhecimento | `gemini-3.5-transcribe`, modo `VERBATIM`, idioma sugerido `en-US` | Camada gratuita. O modo literal preserva hesitações. O modo `SMART` reescreve a frase e removeria o material do retorno |
| Diálogo e retorno | `gemini-3.5-flash-lite` | Camada gratuita. Aceita a instrução de sistema. Uma chamada conduz a entrevista; outra, ao encerrar, gera os três blocos |
| Síntese | `gemini-3.8-flash-lite-tts`, voz predefinida `Kore` | Camada gratuita. O modelo recebe só texto e devolve áudio. A variante *lite* é a indicada pelo provedor para fala conversacional de um turno, em oposição à variante de estúdio |

Provedor único: API Gemini, camada gratuita. Consulta à tabela de preços em 10 de novembro de 2026 (GOOGLE, 2026a; GOOGLE, 2026b; GOOGLE, 2026c).

## 2. O que foi afastado

**API contínua de áudio (*Live API*).** Os modelos `gemini-3.8-live` e `gemini-2.5-flash-native-audio` também estão na camada gratuita e fariam áudio de entrada e de saída. O escopo exclui conversa contínua por canal bidirecional. O turno deste projeto é uma requisição HTTP local: áudio entra, texto e áudio saem.

**Modo `SMART` de transcrição.** A documentação do modelo descreve esse modo como limpeza de hesitações, correção imediata do que a pessoa se retrata e ajuste gramatical (GOOGLE, 2026b). O retorno final precisa ver a frase como foi dita. O modo padrão, `VERBATIM`, permanece.

**Provedores separados.** O escopo pede um provedor gratuito que reúna reconhecimento, diálogo e síntese. Separar os três aumentaria chave, custo e prazo sem necessidade nesta prova de conceito.

**Síntese `gemini-3.8-flash-tts`.** Também é gratuita. A documentação indica essa variante para fidelidade de estúdio e narração longa, e a variante *lite* para agentes de voz em turnos curtos (GOOGLE, 2026c). A entrevista pede a segunda.

## 3. Consequência já conhecida da camada gratuita

Na camada gratuita, o conteúdo enviado pode ser usado para melhoria dos produtos do provedor (GOOGLE, 2026a). A aplicação local, ainda assim, não grava áudio nem transcrição após o turno. A sessão-piloto usa somente a voz de quem executa o teste. O script de teste apaga o arquivo de captura ao terminar e não o envia ao repositório.

O modelo de transcrição não aceita instrução de sistema (documentação do modelo, consultada em 10 de novembro de 2026). A instrução da entrevistadora vai apenas para `gemini-3.5-flash-lite`.

## 4. Teste curto com a própria voz

Em 10 de novembro de 2026 a chave foi usada só no ambiente do processo. Não foi gravada no repositório.

O que a chave aceitou:

- `gemini-3.5-flash-lite` gerou a abertura da entrevistadora;
- `gemini-3.8-flash-lite-tts` gerou WAV reproduzível, pela chamada REST descrita no resultado;
- `gemini-3.5-transcribe` aceitou o áudio e, sem fala inteligível, devolveu candidato vazio.

O que falhou, e fica registrado de propósito:

- a interface `interactions` não encontrou `gemini-3.8-flash-lite-tts`;
- o SDK `google-genai` 3.1.0 montou `speechConfig` de um jeito que esta API recusou;
- a captura de oito segundos não continha uma resposta falada, então não há transcrição de sotaque brasileiro.

O relato completo, com as frases devolvidas e a segunda captura, está em `docs/sprint-1/resultado-teste-voz.md`.

### 4.2 Como executar

A chave é criada em [Google AI Studio](https://aistudio.google.com/apikey). Ela não entra no repositório.

```bash
cd /home/luiz-victor/dev/poc-en-simulator
python3 -m venv .venv
.venv/bin/pip install -r requirements.txt
export GEMINI_API_KEY="a chave, sem aspas no arquivo versionado"
.venv/bin/python scripts/sprint-1-voice-check.py
```

O script gera a abertura da entrevistadora, reproduz essa fala e só então grava oito segundos da resposta. Em seguida transcreve, pede a fala seguinte, sintetiza essa fala e escreve `docs/sprint-1/resultado-teste-voz.md`. O áudio da pessoa é apagado. Os áudios da entrevistadora ficam só em `docs/sprint-1/audio/`, pasta ignorada pelo Git, para escuta local.

Se a transcrição vier vazia, em outra língua, ou se alguma chamada falhar, o resultado deve conservar a mensagem de erro. Isso é parte da entrega, não um motivo para repetir a chamada até obter um texto apresentável.

## 5. Referências

GOOGLE. Gemini API: pricing. 2026a. Disponível em: https://ai.google.dev/gemini-api/docs/pricing. Acesso em: 10 nov. 2026.

GOOGLE. Audio transcription. 2026b. Disponível em: https://ai.google.dev/gemini-api/docs/generate-content/transcribe. Acesso em: 10 nov. 2026.

GOOGLE. Text-to-speech generation (TTS). 2026c. Disponível em: https://ai.google.dev/gemini-api/docs/speech-generation. Acesso em: 10 nov. 2026.
