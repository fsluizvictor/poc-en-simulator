# Registro da sessão-piloto

**Projeto:** Simulador de Conversação em Inglês com Inteligência Artificial  
**Repositório:** poc-en-simulator  
**Sprint:** 3 — Sessão-piloto  
**Data:** 20 de novembro de 2026  
**Cenário:** Entrevista de emprego — Tecnologia  
**Estado:** entrega 1 registrada. A nota de privacidade, o DAS na versão 1 e a publicação em nuvem seguem pendentes.

A sessão ocorreu na interface local, em `http://127.0.0.1:5173`. O início foi o clique em “Start interview”. O encerramento foi o clique em “End interview”.

**Início:** 21:11:25  
**Encerramento:** 21:19:47  
**Duração:** 8 minutos e 22 segundos

O horário de início é o relógio local com a tela em “Starting”, durante o pedido da abertura. O horário de encerramento é o relógio local com a tela já em “Processing”, depois do clique em “End interview”. A rota de encerramento respondeu 200.

**Áudio da pessoa:** apagado ao fim de cada turno. Não está no repositório.

## Abertura da entrevistadora

Hi, thanks for joining me today. Could you briefly introduce yourself and tell me a bit about your experience with software development?

A abertura foi devolvida com áudio.

## Turnos

A abertura não entra na contagem. Cada item abaixo é uma resposta falada pela pessoa. A transcrição é a que a interface mostrou a partir da API. A fala seguinte é a da entrevistadora, devolvida com áudio.

### Turno 1

**Transcrição:** I am a software engineer and I have about five years of experience. At the moment I worked with closure.

**Fala seguinte da entrevistadora:** That sounds interesting. Could you tell me about a recent project you worked on using Clojure?

### Turno 2

**Transcrição:** Of course, I explain my experience saying about my of my current company. Well, my current company is a financial company.

**Fala seguinte da entrevistadora:** Thanks for sharing that. What did your role involve on that project at the financial company?

### Turno 3

**Transcrição:** Of course, my current job is about the director on app of this company.

**Fala seguinte da entrevistadora:** Could you tell me about a specific technical difficulty or challenge you ran into while working on that app?

### Turno 4

**Transcrição:** Of course, my principal problem that I worked direct in my company is involve involve latency and other metrics about the

**Fala seguinte da entrevistadora:** How did you go about investigating and resolving that latency issue?

## Turnos com transcrição não vazia

4

## Retorno em três blocos

O texto abaixo é o que a tela mostrou depois de “End interview”.

### Pontos positivos

- Você demonstrou cordialidade e disposição para responder às perguntas ao usar frases como "Of course, I explain my experience..." e "Of course, my current job is about...".
- Você manteve o foco no contexto profissional ao mencionar o seu tempo de experiência ("I am a software engineer and I have about five years of experience") e o setor da empresa ("a financial company").

### Pontos de melhoria

- Houve repetições e hesitações na estrutura das frases que dificultam a clareza, como em "my principal problem that I worked direct in my company is involve involve latency and other metrics about the".
- A formulação das respostas em alguns momentos soou truncada ou incompleta, por exemplo, "about the director on app of this company", o que prejudica a fluidez esperada em uma entrevista de emprego.

### Próximo passo

- Pratique responder a uma pergunta de entrevista por vez, escrevendo primeiro um rascunho de frase curta e direta (por exemplo, focando em um problema técnico e sua solução) e, em seguida, treinando a fala em voz alta sem repetir palavras.

## Falhas observadas

Nenhuma chamada HTTP desta sessão falhou. Os quatro turnos e o encerramento responderam 200.

Antes desta sessão, uma abertura foi encerrada sem resposta falada. Aquele retorno não entra neste registro.

## O que este registro não afirma

- Não afirma ganho de fluência.
- Não afirma reconhecimento de sotaque brasileiro quando a transcrição vem vazia ou em outra língua.
- Não inclui amostra externa.
