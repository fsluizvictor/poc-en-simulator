# Lista de requisitos do fluxo único

**Projeto:** Simulador de Conversação em Inglês com Inteligência Artificial  
**Repositório:** poc-en-simulator  
**Sprint:** 1 — Base do fluxo e escolha da tecnologia (2 a 8 de novembro de 2026)  
**Card:** [issue 1](https://github.com/fsluizvictor/poc-en-simulator/issues/1)  
**Data do registro:** 10 de novembro de 2026  
**Estado:** entrega redigida. A implementação pertence à Sprint 2.

Este documento fecha o que a prova de conceito precisa fazer. A fonte do escopo é o planejamento já aprovado no relatório do Projeto Aplicado, seção 1.2.2. Onde o objetivo SMART do capítulo 1 ainda menciona a Escala de Usabilidade do Sistema (SUS) e uma amostra externa, o escopo fechado e o quadro da sprint prevalecem: o teste formal com participantes externos ficou de fora.

## 1. Fluxo único

Há um único cenário: entrevista de emprego na área de tecnologia. A pessoa que executa a sessão-piloto percorre, na própria máquina, a sequência abaixo.

1. Abre a interface web local e vê somente o cenário “Entrevista de emprego — Tecnologia”.
2. A entrevistadora virtual faz a primeira pergunta, em inglês, por voz.
3. A pessoa responde por voz, pelo microfone.
4. O reconhecimento automático de fala (*Automatic Speech Recognition* — ASR) converte essa fala em texto.
5. O modelo de diálogo lê a instrução de entrevistadora e o histórico da sessão, e devolve a próxima fala, sem corrigir durante a conversa.
6. A síntese de voz (*Text-to-Speech* — TTS) converte essa fala em áudio, e a interface o reproduz.
7. Os passos 3 a 6 repetem-se até a pessoa encerrar. A sessão-piloto busca de cinco a dez minutos e ao menos quatro turnos de fala reconhecidos.
8. Ao encerrar, uma segunda chamada ao modelo, com outra instrução, gera o retorno em três blocos: pontos positivos, pontos de melhoria e próximo passo.

Cada turno é uma requisição local. O navegador envia o áudio capturado e o histórico mantido em memória. A interface de programação de aplicação (API) local devolve o texto da entrevistadora e o áudio correspondente. Não há canal contínuo bidirecional.

## 2. Requisitos do fluxo

| ID | Requisito | Pronto quando |
|----|-----------|---------------|
| RF-01 | Apresentar um único cenário, entrevista de emprego em tecnologia, antes de iniciar a conversa | A interface não oferece outro cenário |
| RF-02 | Capturar a fala pelo microfone do computador | Um turno só começa depois de haver áudio capturado |
| RF-03 | Converter a fala em texto com acurácia suficiente para o diálogo continuar | A transcrição, ainda que imperfeita, permite uma próxima pergunta coerente |
| RF-04 | Gerar a próxima fala da entrevistadora a partir do texto e do histórico | A resposta permanece em inglês, no papel de entrevistadora, e não corrige a pessoa |
| RF-05 | Sintetizar essa fala e reproduzi-la | A pessoa ouve a entrevistadora, não apenas lê o texto |
| RF-06 | Ao encerrar, exibir o retorno em três blocos | Os blocos são pontos positivos, pontos de melhoria e próximo passo |
| RF-07 | Manter o histórico apenas em memória, durante a sessão | Ao fim do turno, áudio e transcrição não ficam gravados pela aplicação |
| RF-08 | Manter a chave do modelo fora do navegador | A chamada ao provedor parte da API local |

## 3. Restrições que o fluxo precisa respeitar

| ID | Restrição |
|----|-----------|
| RNF-01 | A prova de conceito executa na máquina local |
| RNF-02 | O custo é nulo: somente a camada gratuita do provedor |
| RNF-03 | O prazo do projeto é de 21 dias corridos, em três sprints de sete dias |
| RNF-04 | Em observância à Lei Geral de Proteção de Dados (LGPD), a aplicação não armazena áudio nem transcrição após o turno |
| RNF-05 | A correção ocorre somente ao final da conversa |
| RNF-06 | A entrega não afirma ganho de fluência |

O modo de transcrição adotado é o literal (`VERBATIM`). O modo que limpa hesitações e reescreve a frase esconderia justamente o que o retorno final precisa comentar. Essa escolha está justificada no registro da combinação tecnológica.

## 4. Fora deste fluxo

Ficam fora da prova de conceito:

- medição de fluência;
- correção durante a conversa;
- cadastro, perfil ou histórico de sessões;
- banco de dados;
- conversa contínua por canal bidirecional;
- outros cenários além da entrevista de emprego em tecnologia;
- produto comercial;
- teste formal de usabilidade com amostra externa;
- publicação em nuvem como condição para concluir o objetivo.

A publicação em nuvem só entra na Sprint 3 se o fluxo local já estiver concluído e ainda houver tempo.

## 5. O que esta lista não faz

Esta lista não escolhe o framework nem o provedor. Essa escolha está em `docs/sprint-1/combinacao-tecnologica.md`. Também não implementa a interface nem a API. Isso é a Sprint 2.
