import { useEffect, useRef, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Film, ImagePlus, Loader2, Mic, Square, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { transcribeVoiceCommand } from "@/lib/site-agent.functions";
import {
  ATTACHMENT_ACCEPT,
  ATTACHMENT_LIMITS,
  MAX_ATTACHMENTS,
  attachmentKindOf,
  base64Bytes,
  type AgentAttachment,
} from "@/lib/site-agent";

const MB = 1024 * 1024;
const RECORD_LIMIT_SECONDS = 120;

function readAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => reject(new Error("Couldn't read that file."));
    reader.readAsDataURL(file);
  });
}

function blobToDataUrl(blob: Blob) {
  return readAsDataUrl(new File([blob], "voice", { type: blob.type }));
}

/**
 * Photos, video clips and voice for the website assistant.
 *
 * Files are turned into data URLs in the browser and sent with the next request
 * as context — the assistant reads them, and the owner still reviews every
 * change before it's written. Voice is transcribed into the message box so the
 * owner can correct a mis-heard word before anything is planned.
 */
export function AssistantMedia({
  organizationId,
  attachments,
  onChange,
  onTranscript,
  disabled,
}: {
  organizationId: string | undefined;
  attachments: AgentAttachment[];
  onChange: (next: AgentAttachment[]) => void;
  onTranscript: (text: string) => void;
  disabled?: boolean;
}) {
  const fileInput = useRef<HTMLInputElement>(null);
  const recorder = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);
  const [recording, setRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);

  const transcribe = useServerFn(transcribeVoiceCommand);

  const voice = useMutation({
    mutationFn: (attachment: AgentAttachment) =>
      transcribe({ data: { organizationId: organizationId!, audio: attachment } }),
    onSuccess: (result) => {
      if (result.text) onTranscript(result.text);
      else toast.error(result.message || "I couldn't hear anything in that recording.");
    },
    onError: (error: Error) => toast.error(error.message || "Couldn't transcribe that recording."),
  });

  useEffect(() => {
    if (!recording) return;
    const timer = window.setInterval(() => setSeconds((value) => value + 1), 1000);
    return () => window.clearInterval(timer);
  }, [recording]);

  useEffect(() => {
    if (recording && seconds >= RECORD_LIMIT_SECONDS) recorder.current?.stop();
  }, [recording, seconds]);

  const pickFiles = async (files: FileList | null) => {
    if (!files?.length) return;
    const room = MAX_ATTACHMENTS - attachments.length;
    if (room <= 0) {
      toast.error(`You can attach up to ${MAX_ATTACHMENTS} files per message.`);
      return;
    }
    const next: AgentAttachment[] = [];
    for (const file of Array.from(files).slice(0, room)) {
      const kind = attachmentKindOf(file.type);
      if (!kind || kind === "audio") {
        toast.error(`${file.name} isn't a supported photo or video.`);
        continue;
      }
      if (file.size > ATTACHMENT_LIMITS[kind]) {
        toast.error(
          `${file.name} is too large. Keep ${kind === "image" ? "photos" : "clips"} under ${Math.round(
            ATTACHMENT_LIMITS[kind] / MB,
          )} MB.`,
        );
        continue;
      }
      try {
        const dataUrl = await readAsDataUrl(file);
        if (base64Bytes(dataUrl) > ATTACHMENT_LIMITS[kind]) continue;
        next.push({ kind, mimeType: file.type, name: file.name, dataUrl });
      } catch {
        toast.error(`Couldn't read ${file.name}.`);
      }
    }
    if (next.length) onChange([...attachments, ...next]);
    if (fileInput.current) fileInput.current.value = "";
  };

  const startRecording = async () => {
    if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      toast.error("This browser can't record audio. Type your request instead.");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = ["audio/webm", "audio/mp4"].find((type) => MediaRecorder.isTypeSupported(type)) ?? "";
      const instance = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
      chunks.current = [];
      instance.ondataavailable = (event) => {
        if (event.data.size) chunks.current.push(event.data);
      };
      instance.onstop = async () => {
        stream.getTracks().forEach((track) => track.stop());
        setRecording(false);
        const blob = new Blob(chunks.current, { type: instance.mimeType || "audio/webm" });
        chunks.current = [];
        if (blob.size < 1200) {
          toast.error("That recording was too short. Hold the button while you speak.");
          return;
        }
        if (blob.size > ATTACHMENT_LIMITS.audio) {
          toast.error("That recording is too long. Keep voice commands under two minutes.");
          return;
        }
        const dataUrl = await blobToDataUrl(blob);
        voice.mutate({
          kind: "audio",
          mimeType: (blob.type || "audio/webm").split(";")[0] ?? "audio/webm",
          name: "voice command",
          dataUrl,
        });
      };
      recorder.current = instance;
      setSeconds(0);
      setRecording(true);
      instance.start();
    } catch {
      toast.error("Microphone access was blocked. Allow it in your browser to use voice.");
    }
  };

  const busy = disabled || !organizationId;

  return (
    <div className="space-y-2.5">
      <div className="flex flex-wrap items-center gap-2">
        <input
          ref={fileInput}
          type="file"
          accept={ATTACHMENT_ACCEPT}
          multiple
          className="hidden"
          onChange={(event) => void pickFiles(event.target.files)}
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={busy || attachments.length >= MAX_ATTACHMENTS}
          onClick={() => fileInput.current?.click()}
        >
          <ImagePlus className="size-4" /> Add photo or video
        </Button>
        {recording ? (
          <Button type="button" variant="destructive" size="sm" onClick={() => recorder.current?.stop()}>
            <Square className="size-4" /> Stop ({seconds}s)
          </Button>
        ) : (
          <Button type="button" variant="outline" size="sm" disabled={busy || voice.isPending} onClick={() => void startRecording()}>
            {voice.isPending ? <Loader2 className="size-4 animate-spin" /> : <Mic className="size-4" />}
            {voice.isPending ? "Writing down what you said…" : "Speak your request"}
          </Button>
        )}
        <span className="text-[11px] text-muted-foreground">
          {recording
            ? "Recording — say what you want changed, then press stop."
            : `Photos to ${Math.round(ATTACHMENT_LIMITS.image / MB)} MB, clips to ${Math.round(
                ATTACHMENT_LIMITS.video / MB,
              )} MB, up to ${MAX_ATTACHMENTS} per message.`}
        </span>
      </div>

      {attachments.length ? (
        <ul className="flex flex-wrap gap-2">
          {attachments.map((attachment, index) => (
            <li
              key={`${attachment.name}-${index}`}
              className="relative flex w-40 items-center gap-2 overflow-hidden rounded-md border border-border bg-elevated/60 p-2"
            >
              {attachment.kind === "image" ? (
                <img src={attachment.dataUrl} alt="" className="size-10 shrink-0 rounded object-cover" />
              ) : (
                <span className="flex size-10 shrink-0 items-center justify-center rounded bg-surface">
                  <Film className="size-4 text-primary" aria-hidden="true" />
                </span>
              )}
              <span className="min-w-0 flex-1 truncate text-[11px] text-muted-foreground">{attachment.name}</span>
              <button
                type="button"
                aria-label={`Remove ${attachment.name}`}
                className="cursor-pointer text-muted-foreground transition-colors hover:text-foreground"
                onClick={() => onChange(attachments.filter((_, position) => position !== index))}
              >
                <X className="size-3.5" />
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
