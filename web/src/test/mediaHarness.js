import { vi } from "vitest";

export const media = {
  getUserMedia: null,
  tracks: [],
  recorder: null,
  audio: null,
  playError: null,
  appended: [],
};

export function installMedia() {
  media.tracks = [];
  media.recorder = null;
  media.audio = null;
  media.playError = null;
  media.appended = [];
  media.getUserMedia = vi.fn(async () => {
    const track = { stop: vi.fn() };
    media.tracks.push(track);
    return { getTracks: () => [track] };
  });

  Object.defineProperty(navigator, "mediaDevices", {
    configurable: true,
    value: { getUserMedia: media.getUserMedia },
  });

  class FakeRecorder {
    constructor(stream, options = {}) {
      this.stream = stream;
      this.mimeType = options.mimeType || "audio/webm";
      this.state = "inactive";
      this.ondataavailable = null;
      this.onstop = null;
      media.recorder = this;
    }

    start() {
      this.state = "recording";
    }

    stop() {
      this.state = "inactive";
      const blob = new Blob(["spoken-answer"], { type: this.mimeType || "audio/webm" });
      if (this.ondataavailable) {
        this.ondataavailable({ data: blob });
      }
      if (this.onstop) {
        this.onstop();
      }
    }

    static isTypeSupported(type) {
      return type === "audio/webm;codecs=opus";
    }
  }

  class FakeAudio {
    constructor(url) {
      this.url = url;
      this.onended = null;
      this.onerror = null;
      media.audio = this;
    }

    play() {
      if (media.playError) {
        return Promise.reject(media.playError);
      }
      return Promise.resolve();
    }

    pause() {}
  }

  vi.stubGlobal("MediaRecorder", FakeRecorder);
  vi.stubGlobal("Audio", FakeAudio);

  let sequence = 0;
  URL.createObjectURL = vi.fn(() => {
    sequence += 1;
    return `blob:interview-${sequence}`;
  });
  URL.revokeObjectURL = vi.fn();

  const originalAppend = FormData.prototype.append;
  FormData.prototype.append = function append(name, value, filename) {
    media.appended.push({ name, filename, type: value?.type || "" });
    return originalAppend.call(this, name, value, filename);
  };
  media.restoreAppend = () => {
    FormData.prototype.append = originalAppend;
  };
}

export function finishPlayback() {
  const player = media.audio;
  if (!player?.onended) {
    throw new Error("The interviewer audio has no ended handler.");
  }
  player.onended();
}
