import { ChatIcon } from "./components/common/icons.jsx";
import AudioControls from "./components/interview/AudioControls.jsx";
import AudioVisualizer from "./components/interview/AudioVisualizer.jsx";
import ConversationHistory from "./components/interview/ConversationHistory.jsx";
import InterviewHeader, { InterviewAlerts } from "./components/interview/InterviewHeader.jsx";
import InterviewPanel from "./components/interview/InterviewPanel.jsx";
import InterviewerAvatar from "./components/interview/InterviewerAvatar.jsx";
import { useInterview } from "./hooks/useInterview.js";

const SCENARIO = "Entrevista de emprego — Tecnologia";
const LANGUAGE = "English";

function latest(messages, role) {
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    if (messages[index].role === role) {
      return messages[index];
    }
  }
  return null;
}

export default function App() {
  const interview = useInterview();
  const question = latest(interview.messages, "interviewer");
  const response = latest(interview.messages, "candidate");
  const responseState = !response ? "none" : response.text ? "transcribed" : "empty";
  const lastResponse = !response
    ? "Your transcribed answer will appear here."
    : response.text || "Empty transcription";
  const questionText = question?.text
    || (interview.visualState === "INITIALIZING"
      ? "Opening the interview…"
      : "Start the interview to hear the first question.");
  const avatarMode = interview.visualState === "AI_SPEAKING"
    ? "speaking"
    : interview.visualState === "LISTENING"
      ? "listening"
      : interview.visualState === "PROCESSING"
        ? "processing"
        : interview.visualState === "INITIALIZING"
          ? "starting"
          : "idle";
  const visualizerMode = interview.visualState === "LISTENING"
    ? "recording"
    : interview.visualState === "AI_SPEAKING"
      ? "speaking"
      : "idle";

  return (
    <main className="app-shell">
      <InterviewHeader
        scenario={SCENARIO}
        statusLabel={interview.statusLabel}
        statusTone={interview.statusTone}
        canStart={interview.canStart}
        canEnd={interview.canEnd}
        onStart={interview.startSession}
        onEnd={interview.endSession}
      />
      <InterviewAlerts
        notice={interview.notice}
        errorMessage={interview.errorMessage}
        errorDiagnostic={interview.errorDiagnostic}
        onDismiss={interview.dismissError}
      />
      <div className="layout">
        <section className="stage">
          <InterviewerAvatar mode={avatarMode} />
          <article className="question-card">
            <p className="eyebrow">
              <span className="eyebrow-icon" aria-hidden="true">
                <ChatIcon size={16} />
              </span>
              Current question
            </p>
            <p className="question-text" aria-live="polite">{questionText}</p>
          </article>
          <ConversationHistory messages={interview.messages} />
          <section className="card dock" aria-label="Audio controls">
            <AudioVisualizer mode={visualizerMode} stream={interview.stream} />
            <AudioControls
              canReplay={interview.canReplay}
              canRecord={interview.canRecord}
              canStop={interview.canStop}
              onReplay={interview.replayInterviewer}
              onRecord={interview.beginRecording}
              onStop={interview.stopRecording}
              micLabel={interview.micLabel}
              micTone={interview.micTone}
            />
          </section>
        </section>
        <InterviewPanel
          scenario={SCENARIO}
          language={LANGUAGE}
          sessionLabel={interview.sessionLabel}
          lastResponse={lastResponse}
          responseState={responseState}
          feedback={interview.feedback}
        />
      </div>
    </main>
  );
}
