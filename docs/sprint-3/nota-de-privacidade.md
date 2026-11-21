# Nota de privacidade

**Projeto:** Simulador de Conversação em Inglês com Inteligência Artificial  
**Repositório:** poc-en-simulator  
**Sprint:** 3 — Nota de privacidade  
**Data:** 20 de novembro de 2026  
**Estado:** entrega 2 registrada. O DAS na versão 1 e a publicação em nuvem seguem pendentes.

Esta nota descreve o que o código faz com o áudio e com a transcrição. A leitura foi feita nesta data, nos arquivos citados em cada item, e o resultado dos testes é o da execução desta task. Não é parecer jurídico, termo de consentimento nem política de privacidade de produto comercial.

O critério da sprint, em RF-07, RNF-04 e RC-04, pede que áudio e transcrição não permaneçam armazenados após o turno. A leitura confirma isso para o áudio da pessoa. A transcrição tem outro intervalo: não é gravada em disco e deixa de existir na API quando a sessão encerra. Até o encerramento, o texto fica na memória do processo, porque o turno seguinte e o retorno em três blocos leem esse histórico.

## O que cada parte guarda

Há quatro destinos distintos.

O áudio da pessoa é lido no turno, enviado ao reconhecimento e descartado em seguida. A transcrição entra no histórico em memória e permanece até `POST /api/sessions/{id}/end`. O navegador, enquanto a página estiver aberta, mostra o texto da conversa, o áudio da entrevistadora e, depois do encerramento, os três blocos. O provedor recebe o áudio do turno e, no diálogo e no encerramento, o texto; a retenção desse conteúdo não é controlada por esta aplicação.

## 1. Áudio da pessoa

Em `api/app.py`, `take_turn` lê o corpo com `await audio.read()`, fecha o upload e, se o corpo estiver vazio ou acima de `MAX_AUDIO_BYTES` (8 MB, em `api/settings.py`), recusa o turno. No caminho aceito, `transcribe_audio` recebe esses bytes. Na linha seguinte, `audio_bytes = b""`.

`api/sessions.py` guarda, em `Session.history`, apenas `role` e `text`. Não há campo de áudio. A API não abre nem grava arquivo `.wav`.

O parser de formulário do Starlette usado por esta instalação (`starlette/formparsers.py`) cria um `SpooledTemporaryFile` com `spool_max_size` de 1 MB. Acima disso, o corpo do upload pode passar por arquivo temporário de spool. `await audio.close()` ocorre antes do reconhecimento. O fechamento destrói esse temporário. Não é um `.wav` gravado pela aplicação, nem áudio que permaneça depois do turno.

Em `web/src` não há `localStorage`, `sessionStorage` nem IndexedDB.

## 2. Transcrição

O texto reconhecido entra em `session.history` como `{"role": "candidate", "text": transcript}` e a fala da entrevistadora entra como `{"role": "interviewer", "text": reply}`. Isso vale também para a abertura, gravada no histórico na criação da sessão. A transcrição pode ser vazia; o histórico recebe o texto que o reconhecimento devolveu.

Esse histórico fica no dicionário `_sessions`, no processo da API, até `POST /api/sessions/{id}/end`. A rota `end_session` retira a sessão do dicionário com `drop_session`, monta o texto com `transcript_for_feedback`, envia esse texto ao retorno e, em seguida, chama `session.history.clear()`. Depois dessa rota, `get_session` não encontra a sessão.

A transcrição não some ao fim de cada turno. Ela não é gravada em disco e deixa de existir na API quando a sessão encerra. Se o encerramento não for chamado, o histórico permanece no processo.

## 3. Navegador

O estado do React está em `web/src/hooks/useInterview.js`. `messages` acumula cada transcrição da pessoa e cada fala da entrevistadora. `feedback` guarda os três blocos depois do encerramento. `web/src/App.jsx` mostra a última fala de cada papel no painel e a lista inteira em `ConversationHistory`. Esse estado permanece enquanto a página estiver aberta. O encerramento não esvazia `messages` nem `feedback`. Um novo início substitui a lista e zera o retorno. Recarregar a página descarta o estado, porque nada disso vai para armazenamento do navegador.

O áudio reproduzido é o da entrevistadora. `decodeAudio` cria um blob URL, e `replaceAudio` revoga o URL anterior quando a fala seguinte chega. O último URL continua disponível para “Replay interviewer” até essa troca ou até a desmontagem do componente, que também revoga o URL.

O áudio capturado do microfone não fica em estado depois do envio. Os trechos vão para `chunksRef`, viram um `Blob` local e seguem em `submitTurn`. Em seguida `chunksRef` é esvaziado. Não há estado React para esse blob. As trilhas de `getUserMedia` são interrompidas em `recorder.onstop`, e também quando a gravação não chega a começar ou quando o componente desmonta.

O navegador chama só `http://127.0.0.1:8765`, em `web/src/services/interviewApi.js`.

## 4. Provedor

`api/gemini_client.py` envia o áudio do turno a `gemini-3.5-transcribe`. No diálogo, envia o histórico em texto a `gemini-3.5-flash-lite`. No encerramento, envia o texto montado do histórico ao mesmo modelo de diálogo. A síntese envia o texto da entrevistadora a `gemini-3.8-flash-lite-tts`. A chave sai do ambiente do processo. A aplicação não controla a retenção do provedor.

Em 20 de novembro de 2026 esta task reabriu a página de preços. A frase da seção 3 de `docs/sprint-1/combinacao-tecnologica.md` continua válida. Na camada gratuita, o conteúdo enviado pode ser usado para melhoria dos produtos do provedor (GOOGLE, 2026a, acesso em 20 de novembro de 2026, https://ai.google.dev/gemini-api/docs/pricing).

Na mesma página, o quadro Free inclui “Content used to improve our products”. Nas linhas de `gemini-3.5-transcribe`, `gemini-3.5-flash-lite` e `gemini-3.8-flash-lite-tts`, a coluna Free Tier de “Used to improve our products” está como Yes. A coluna paga está como No.

## 5. Quem pode falar

Por causa do item 4, a sessão usa somente a voz de quem executa o teste. Não há amostra externa. Isso já está em RC-09, no DAS parcial, e o registro da sessão-piloto repete que não inclui amostra externa. O código não identifica quem fala: a captura é o microfone da máquina local.

## 6. Chave

`GEMINI_API_KEY` é lida de `os.environ` em `require_api_key` e em `GET /api/health`. A rota de saúde devolve `ok` e `key_configured`. Não devolve a chave. O navegador só chama `/api` na máquina local, e o CORS da API aceita `http://127.0.0.1:5173` e `http://localhost:5173`. A chave não entra no repositório, no navegador nem em arquivo versionado.

## 7. O que não é armazenamento da aplicação

`docs/sprint-3/registro-sessao-piloto.md`, os resultados das Sprints 1 e 2 e esta nota citam texto observado. São registros acadêmicos escritos de propósito. A API não os preenche a cada turno.

`scripts/sprint-1-voice-check.py` e `scripts/sprint-2-first-turn.py` são scripts de evidência, separados da aplicação. Os dois criam um WAV temporário da captura e o apagam no `finally`. O script da Sprint 1 ainda escreve o áudio sintetizado da entrevistadora em `docs/sprint-1/audio/`. Essa pasta está no `.gitignore`, junto com `*.wav`, e não é áudio da pessoa versionado. Esses registros permanecem.

## 8. Testes

Comando, a partir da raiz, com o `.venv` do repositório, em 20 de novembro de 2026:

```bash
.venv/bin/python -m unittest tests.test_api tests.test_feedback
```

Resultado: `Ran 5 tests in 0.188s` e `OK`. Os testes simulam o Gemini. Esta execução não chamou a API do provedor.

`test_turn_returns_text_and_audio_without_writing_files` cobre o turno: o histórico da sessão não contém campo de áudio, e nenhum `.wav` do turno (`reply.wav` ou o conteúdo `fake-wav`) é gravado. `test_end_calls_feedback_and_drops_the_session` cobre o encerramento: depois da rota, `get_session` devolve `None`. A suíte também inclui `test_health_does_not_expose_a_key`, no mesmo resultado `OK`.

## O que esta nota não afirma

- Não afirma conformidade certificada com a Lei Geral de Proteção de Dados.
- Não afirma que o provedor apaga o conteúdo enviado.
- Não afirma ganho de fluência.
- Não afirma reconhecimento de sotaque.
- Não substitui o DAS na versão 1.

## Referência

GOOGLE. Gemini API: pricing. 2026a. Disponível em: https://ai.google.dev/gemini-api/docs/pricing. Acesso em: 20 nov. 2026.
