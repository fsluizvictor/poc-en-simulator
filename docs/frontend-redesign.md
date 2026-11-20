# Redesenho da interface

**Projeto:** Simulador de Conversação em Inglês com Inteligência Artificial  
**Repositório:** poc-en-simulator  
**Sprint:** fora das sprints fechadas — redesenho da tela, pedido em 20 de novembro de 2026  
**Data do registro:** 20 de novembro de 2026  
**Estado:** tela refeita e build concluído. A sessão falada não foi concluída nesta verificação: a API em execução respondeu 503.

A tela continua sendo uma só. O único cenário exibido é `Entrevista de emprego — Tecnologia`. Os contratos `POST /api/sessions`, `POST /api/sessions/{sessionId}/turns` e `POST /api/sessions/{sessionId}/end` permanecem os mesmos. A chave do modelo não entra no navegador.

## 1. Estrutura

```text
web/src/
├── components/
│   ├── common/
│   │   ├── ErrorMessage.jsx
│   │   ├── StatusIndicator.jsx
│   │   └── icons.jsx
│   └── interview/
│       ├── AudioControls.jsx
│       ├── AudioVisualizer.jsx
│       ├── ConversationHistory.jsx
│       ├── InterviewFeedback.jsx
│       ├── InterviewHeader.jsx
│       ├── InterviewPanel.jsx
│       └── InterviewerAvatar.jsx
├── hooks/
│   └── useInterview.js
├── services/
│   └── interviewApi.js
├── App.jsx
├── main.jsx
└── styles.css
web/public/interviewer.jpg
```

`App.jsx` só compõe a tela. O ciclo da entrevista mora em `useInterview.js`. As chamadas HTTP moram em `interviewApi.js` e usam `http://127.0.0.1:8765`.

## 2. Decisões de desenho

A tela usa fundo neutro claro, cartões brancos, raio de 18 px, sombra curta e acento verde-azulado. A tipografia é Source Sans 3, com fallback do sistema. Não há biblioteca de interface.

O cromo da tela está em inglês: Interview Practice, Start interview, Record your answer, Stop and send, Replay interviewer. O texto da entrevistadora e o retorno final continuam sendo o que o modelo devolve.

O painel lateral mostra só o que a prova de conceito realmente tem:

- cenário: `Entrevista de emprego — Tecnologia`;
- idioma: English, propriedade fixa deste único cenário;
- sessão: Not started, Active ou Ended;
- última transcrição;
- os três blocos do retorno, depois do encerramento.

Não há cargo, contagem de perguntas, porcentagem de progresso nem nota. Um bloco vazio aparece como `—`.

O retrato é uma imagem estática em `web/public/interviewer.jpg`. O estado Speaking, Listening, Processing ou Starting é um selo sobre a foto, sincronizado com a reprodução do áudio da entrevistadora. Não há animação facial nem serviço externo de avatar.

## 3. Estado

O gancho guarda a fase real e, à parte, se o áudio da entrevistadora está tocando. A tela lê um estado visual:

| Estado visual | Quando |
|---|---|
| IDLE | Antes de abrir a sessão, e depois de dispensar uma falha de abertura |
| INITIALIZING | `POST /api/sessions` em curso |
| AI_SPEAKING | O elemento de áudio está em reprodução |
| READY | Sessão aberta e a entrevistadora não está falando |
| LISTENING | `MediaRecorder` gravando |
| PROCESSING | Envio do turno ou `POST /api/sessions/{id}/end` em curso |
| COMPLETED | Encerramento aceito |
| ERROR | A abertura da sessão falhou |

Gravar só fica habilitado em READY, com a reprodução parada. Parar e enviar só fica habilitado em LISTENING. Um cadeado impede um segundo envio enquanto o turno ou o encerramento está em curso. Encerrar fica desabilitado durante a abertura, a gravação e o processamento.

O histórico da conversa fica só na memória do navegador. Cada abertura bem-sucedida acrescenta a fala da entrevistadora. Cada turno bem-sucedido acrescenta a transcrição recebida e a fala seguinte. Transcrição vazia permanece vazia e a tela mostra “Empty transcription”. Não há gravação persistente.

## 4. Áudio

A captura continua com `getUserMedia({ audio: true })` e `MediaRecorder`. O blob segue no campo `audio` do `FormData`, com o nome `turn.webm`. Ao parar, as trilhas do microfone são encerradas. No desmonte do componente, a gravação é interrompida sem envio, o áudio da entrevistadora é pausado e o object URL é revogado.

A reprodução usa um `Audio` criado a partir do `audio_base64`. O estado Speaking começa quando `play()` é aceito e termina no evento `ended`. Se o navegador bloquear a reprodução automática, ou se o áudio falhar, a tela volta a READY e pede Replay interviewer. Replay usa o mesmo object URL.

Durante a gravação, `AudioVisualizer` liga o fluxo do microfone a um `AnalyserNode` e desenha o nível. O contexto de áudio é fechado ao sair desse modo. Enquanto a entrevistadora fala, o indicador é outro: barras em CSS, sem fingir a amplitude da voz. Sem atividade, as barras ficam estáticas. Não há um segundo gravador.

A duração da gravação aparece ao lado do microfone, no formato `m:ss`. “Your microphone is ready” só aparece depois de um `getUserMedia` bem-sucedido.

## 5. Integração com a API

`POST /api/sessions` devolve `session_id`, `interviewer_text`, `audio_base64` e `audio_mime_type`.

`POST /api/sessions/{sessionId}/turns` devolve `transcript` e os mesmos campos de áudio e texto.

`POST /api/sessions/{sessionId}/end` devolve `pontos_positivos`, `pontos_de_melhoria` e `proximo_passo`. A sessão no processo da API é descartada por esse endpoint. A tela limpa o identificador e mantém o histórico e o retorno até a próxima abertura.

A mensagem visível não repete o corpo cru do provedor. Falha de rede, 400, 404, 413, 502 e 503 têm frases próprias. Em desenvolvimento, o detalhe técnico fica atrás de “Diagnostic” e omite chave, nome de variável de ambiente, identificador de modelo e payload. Em produção esse bloco não é renderizado.

## 6. O que a tela faz

- Abre, grava, envia e encerra a sessão pelos três endpoints já existentes.
- Mostra a pergunta corrente, o histórico em memória e a última transcrição.
- Reproduz e permite repetir o áudio da entrevistadora.
- Impede gravar enquanto a entrevistadora fala e impede envios simultâneos.
- Trata recusa de microfone, ausência de microfone e microfone ocupado.
- Mostra o retorno em três cartões: Positive points, Areas to improve e Next step.
- Antes do encerramento, esses três itens ficam marcados como disponíveis só ao fim da entrevista.
- Empilha cabeçalho, conversa e painel em viewports estreitas. Abaixo de 720 px os controles de áudio ficam em coluna.

## 7. Limitações conhecidas

- A API não informa cargo, número de perguntas nem progresso. A tela não inventa esses dados.
- O idioma English é rótulo fixo do cenário único, não um campo da resposta.
- O retrato não se move. O indicador de fala da entrevistadora não é um medidor do áudio dela.
- Uma transcrição vazia continua vazia.
- Recarregar a página perde o identificador da sessão no navegador. A sessão no processo da API permanece até o encerramento ou o fim do processo.
- Se a rede cair depois de o servidor aceitar o turno, o histórico da tela pode ficar atrás do histórico do processo.
- A verificação desta sessão não exercitou microfone, reprodução, turno nem retorno, porque a API respondeu 503.

## 8. Verificação desta sessão

Build, em `web/`:

```text
npm run build
vite v5.4.21 building for production...
✓ 43 modules transformed.
✓ built in 792ms
```

Saúde da API já em execução:

```text
curl -sS http://127.0.0.1:8765/api/health
{"ok":true,"key_configured":false}
```

No navegador, em `http://127.0.0.1:5173/`:

- Antes de iniciar, Replay, Record e Stop and send estavam desabilitados. Start interview estava habilitado.
- O retrato carregou (`interviewer.jpg`, 1280×720).
- Em 1399 px a grade ficou em duas colunas, sem overflow horizontal.
- Em 390 px a tela empilhou e os três controles ocuparam a largura do cartão, sem overflow.
- `POST /api/sessions` respondeu 503. A faixa mostrou “The interview service is unavailable.” O texto visível não continha `gemini` nem `api_key`. O diagnóstico de desenvolvimento, fechado, era `HTTP 503`.
- Dispensar a faixa devolveu o estado para Not started.
- Durante Starting, gravar e encerrar ficaram desabilitados.

O log da API registrou `POST /api/sessions` com status 503. Não houve turno nem encerramento.

## 9. Melhorias futuras

- Medir de fato o áudio da entrevistadora, se a ligação do elemento ao Web Audio puder ser feita sem cortar a reprodução.
- Um turno falado com a chave presente no processo da API, para registrar transcrição, reprodução e os três blocos.
- Metadados de vaga somente se a API passar a enviá-los.
