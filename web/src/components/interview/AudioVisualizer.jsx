import { useEffect, useRef } from "react";

const BAR_COUNT = 28;

function idleLevels() {
  return Array.from({ length: BAR_COUNT }, () => 0.22);
}

function resizeCanvas(canvas) {
  const ratio = window.devicePixelRatio || 1;
  const width = canvas.clientWidth;
  const height = canvas.clientHeight;
  if (!width || !height) {
    return null;
  }
  const nextWidth = Math.round(width * ratio);
  const nextHeight = Math.round(height * ratio);
  if (canvas.width !== nextWidth || canvas.height !== nextHeight) {
    canvas.width = nextWidth;
    canvas.height = nextHeight;
  }
  const context = canvas.getContext("2d");
  context.setTransform(ratio, 0, 0, ratio, 0, 0);
  return { context, width, height };
}

function traceBar(context, x, y, width, height) {
  const radius = Math.min(2, width / 2, height / 2);
  context.beginPath();
  context.moveTo(x + radius, y);
  context.arcTo(x + width, y, x + width, y + height, radius);
  context.arcTo(x + width, y + height, x, y + height, radius);
  context.arcTo(x, y + height, x, y, radius);
  context.arcTo(x, y, x + width, y, radius);
  context.closePath();
}

function drawLevels(canvas, levels, color) {
  const surface = resizeCanvas(canvas);
  if (!surface) {
    return;
  }
  const { context, width, height } = surface;
  context.clearRect(0, 0, width, height);
  const gap = 3;
  const barWidth = Math.max(2, (width - gap * (levels.length - 1)) / levels.length);
  context.fillStyle = color;
  levels.forEach((level, index) => {
    const amount = Math.max(0.08, Math.min(1, level));
    const barHeight = Math.max(3, amount * height);
    const x = index * (barWidth + gap);
    const y = (height - barHeight) / 2;
    traceBar(context, x, y, barWidth, barHeight);
    context.fill();
  });
}

function sampleBins(bins) {
  const levels = [];
  const step = bins.length / BAR_COUNT;
  for (let index = 0; index < BAR_COUNT; index += 1) {
    const start = Math.floor(index * step);
    const end = Math.max(start + 1, Math.floor((index + 1) * step));
    let peak = 0;
    for (let cursor = start; cursor < end && cursor < bins.length; cursor += 1) {
      peak = Math.max(peak, bins[cursor]);
    }
    levels.push(peak / 255);
  }
  return levels;
}

const LABEL = {
  recording: "Microphone level",
  speaking: "Interviewer is speaking",
  idle: "No audio activity",
};

export default function AudioVisualizer({ mode, stream }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || mode === "speaking") {
      return undefined;
    }

    if (mode !== "recording" || !stream) {
      drawLevels(canvas, idleLevels(), "#d5d2cb");
      const observer = new ResizeObserver(() => {
        drawLevels(canvas, idleLevels(), "#d5d2cb");
      });
      observer.observe(canvas);
      return () => observer.disconnect();
    }

    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) {
      drawLevels(canvas, idleLevels(), "#d5d2cb");
      return undefined;
    }

    let context;
    try {
      context = new AudioContextClass();
    } catch {
      drawLevels(canvas, idleLevels(), "#d5d2cb");
      return undefined;
    }

    const source = context.createMediaStreamSource(stream);
    const analyser = context.createAnalyser();
    analyser.fftSize = 256;
    analyser.smoothingTimeConstant = 0.78;
    source.connect(analyser);
    if (context.state === "suspended") {
      context.resume().catch(() => {});
    }

    const bins = new Uint8Array(analyser.frequencyBinCount);
    let frame = 0;
    const paint = () => {
      analyser.getByteFrequencyData(bins);
      drawLevels(canvas, sampleBins(bins), "#0f766e");
      frame = window.requestAnimationFrame(paint);
    };
    paint();

    return () => {
      window.cancelAnimationFrame(frame);
      source.disconnect();
      analyser.disconnect();
      context.close().catch(() => {});
    };
  }, [mode, stream]);

  return (
    <div className={`visualizer visualizer-${mode}`} role="img" aria-label={LABEL[mode] || LABEL.idle}>
      {mode === "speaking" ? (
        <div className="speaking-meter" aria-hidden="true">
          <span />
          <span />
          <span />
          <span />
          <span />
        </div>
      ) : (
        <canvas ref={canvasRef} />
      )}
    </div>
  );
}
