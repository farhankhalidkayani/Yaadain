import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Mic, Pause, Play, Square, RefreshCw } from "lucide-react";
import {
  transcribeAudio,
  correctTranscriptAndGenerateTitle,
} from "@/lib/openai";
import { useToast } from "@/hooks/use-toast";
import { uploadAudio } from "@/lib/firebase";

type RecorderState = "inactive" | "recording" | "paused" | "preview";

const VoiceRecorder = ({
  onRecordingComplete,
}: {
  onRecordingComplete: (data: {
    audioUrl: string;
    text: string;
    title: string;
  }) => void;
}) => {
  const [state, setState] = useState<RecorderState>("inactive");
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentPlaybackTime, setCurrentPlaybackTime] = useState(0);
  const [audioDuration, setAudioDuration] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const playbackListenersAttached = useRef(false);
  const { toast } = useToast();

  // Clean up function to safely handle audio element
  const cleanupAudio = () => {
    if (audioRef.current) {
      try {
        audioRef.current.pause();

        // Remove all event listeners
        if (playbackListenersAttached.current) {
          audioRef.current.removeEventListener(
            "loadedmetadata",
            handleLoadedMetadata
          );
          audioRef.current.removeEventListener("timeupdate", handleTimeUpdate);
          audioRef.current.removeEventListener("ended", handleEnded);
          audioRef.current.removeEventListener("error", handleError);
          playbackListenersAttached.current = false;
        }

        audioRef.current = null;
      } catch (error) {
        console.error("Error cleaning up audio:", error);
      }
    }

    setIsPlaying(false);
  };

  // Event handlers to attach to audio element
  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      setAudioDuration(audioRef.current.duration || 0);
    }
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentPlaybackTime(audioRef.current.currentTime || 0);
    }
  };

  const handleEnded = () => {
    setIsPlaying(false);
    setCurrentPlaybackTime(0);
  };

  const handleError = (error: Event) => {
    console.error("Audio playback error:", error);
    toast({
      title: "Playback Error",
      description:
        "There was a problem playing this audio. Please try recording again.",
      variant: "destructive",
    });
    setIsPlaying(false);
  };

  // Cleanup timer on unmount or state change
  useEffect(() => {
    if (state === "recording") {
      timerRef.current = window.setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);
    } else if (timerRef.current) {
      clearInterval(timerRef.current);
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [state]);

  // Setup audio element when URL is available
  useEffect(() => {
    // Clean up previous audio element
    cleanupAudio();

    // Create and setup new audio element if URL is available
    if (audioUrl && state === "preview") {
      try {
        const audio = new Audio();
        audio.src = audioUrl;
        audio.preload = "auto";
        audioRef.current = audio;

        // Add event listeners
        audio.addEventListener("loadedmetadata", handleLoadedMetadata);
        audio.addEventListener("timeupdate", handleTimeUpdate);
        audio.addEventListener("ended", handleEnded);
        audio.addEventListener("error", handleError);
        playbackListenersAttached.current = true;

        // Load audio data
        audio.load();
      } catch (error) {
        console.error("Error setting up audio element:", error);
        toast({
          title: "Error",
          description: "Failed to prepare audio for playback.",
          variant: "destructive",
        });
      }
    }

    // Clean up on unmount
    return () => {
      if (audioUrl) {
        try {
          URL.revokeObjectURL(audioUrl);
        } catch (error) {
          console.error("Error revoking object URL:", error);
        }
      }
      cleanupAudio();
    };
  }, [audioUrl, state]);

  const startRecording = async () => {
    try {
      // Request high-quality audio with optimal settings for speech recognition
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      // Determine the best audio format to use
      let mimeType = "audio/webm";

      // Check supported mime types in order of preference
      if (MediaRecorder.isTypeSupported("audio/webm;codecs=opus")) {
        mimeType = "audio/webm;codecs=opus"; // Opus generally has good compatibility
      } else if (MediaRecorder.isTypeSupported("audio/webm")) {
        mimeType = "audio/webm"; // Standard WebM
      } else if (MediaRecorder.isTypeSupported("audio/mp4")) {
        mimeType = "audio/mp4"; // MP4 as fallback
      } else if (MediaRecorder.isTypeSupported("audio/ogg")) {
        mimeType = "audio/ogg"; // OGG as last resort
      }

      console.log(`Using audio format: ${mimeType}`);

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: mimeType,
        audioBitsPerSecond: 128000, // 128 kbps for good quality
      });

      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        try {
          const audioBlob = new Blob(audioChunksRef.current, {
            type: mimeType,
          });

          // Create a temporary URL for preview
          const tempUrl = URL.createObjectURL(audioBlob);
          setAudioUrl(tempUrl);

          setState("preview");
        } catch (error) {
          console.error("Error creating audio blob:", error);
          toast({
            title: "Error",
            description: "Failed to process the recording. Please try again.",
            variant: "destructive",
          });
        }
      };

      // Request data every 1000ms (1 second chunks)
      mediaRecorder.start(1000);
      setState("recording");
      setRecordingTime(0);
    } catch (error) {
      console.error("Error starting recording:", error);
      toast({
        title: "Error",
        description:
          "Could not access microphone. Please check your permissions.",
        variant: "destructive",
      });
    }
  };

  const pauseRecording = () => {
    if (mediaRecorderRef.current && state === "recording") {
      mediaRecorderRef.current.pause();
      setState("paused");
    }
  };

  const resumeRecording = () => {
    if (mediaRecorderRef.current && state === "paused") {
      mediaRecorderRef.current.resume();
      setState("recording");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();

      // Stop all audio tracks
      mediaRecorderRef.current.stream.getTracks().forEach((track) => {
        track.stop();
      });

      setState("preview");
    }
  };

  const playRecording = () => {
    if (!audioRef.current || !audioUrl) {
      console.error("Cannot play: Audio element or URL is not available");
      return;
    }

    try {
      // If already playing, pause it
      if (isPlaying) {
        audioRef.current.pause();
        setIsPlaying(false);
        return;
      }

      // Otherwise start playback
      const playPromise = audioRef.current.play();

      // Modern browsers return a promise from play()
      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            setIsPlaying(true);
          })
          .catch((error) => {
            console.error("Error playing audio:", error);
            toast({
              title: "Playback Error",
              description:
                "Failed to play the recording. The audio may be corrupted.",
              variant: "destructive",
            });
          });
      }
    } catch (error) {
      console.error("Error in playback:", error);
      toast({
        title: "Error",
        description: "Failed to play the recording.",
        variant: "destructive",
      });
    }
  };

  const discardRecording = () => {
    cleanupAudio();

    if (audioUrl) {
      try {
        URL.revokeObjectURL(audioUrl);
      } catch (error) {
        console.error("Error revoking object URL:", error);
      }
    }

    setState("inactive");
    setAudioUrl(null);
    setRecordingTime(0);
    setCurrentPlaybackTime(0);
    setAudioDuration(0);
    setIsPlaying(false);
  };

  const processRecording = async () => {
    if (!audioUrl) return;

    setIsProcessing(true);

    try {
      // Show transcription toast
      toast({
        title: "Processing...",
        description: "Converting your voice recording to text...",
      });

      // Convert the audio blob to a file for upload
      const audioBlob = await fetch(audioUrl).then((r) => r.blob());

      // Get the mime type that was used for recording
      const mimeType = mediaRecorderRef.current?.mimeType || "audio/webm";

      // Set appropriate file extension based on mime type
      const fileExtension = mimeType.includes("webm")
        ? "webm"
        : mimeType.includes("mp4")
        ? "mp4"
        : mimeType.includes("ogg")
        ? "ogg"
        : "wav";

      console.log(`Sending audio for transcription with type: ${mimeType}`);

      // Create a file with the correct extension
      const audioFile = new File([audioBlob], `recording.${fileExtension}`, {
        type: mimeType,
      });

      try {
        // Step 1: Upload the audio file to Firebase Storage to get a permanent URL
        console.log("Uploading audio to Firebase Storage...");
        const permanentAudioUrl = await uploadAudio(audioFile);
        console.log(
          "Audio uploaded successfully, permanent URL:",
          permanentAudioUrl
        );

        // Step 2: Transcribe the audio using our API
        const { text: rawTranscription } = await transcribeAudio(audioFile);

        // Check if we got a meaningful transcription
        if (
          !rawTranscription ||
          rawTranscription.trim() === "." ||
          rawTranscription.trim() === "[SOUND]" ||
          rawTranscription.trim() === ". [SOUND]"
        ) {
          console.warn(
            "Transcription returned minimal result:",
            rawTranscription
          );
          throw new Error("Transcription didn't detect meaningful speech");
        }

        // Step 3: Correct the transcript and generate a title
        toast({
          title: "Enhancing...",
          description:
            "Improving transcription quality and generating a title...",
        });

        const { correctedText, title } =
          await correctTranscriptAndGenerateTitle(rawTranscription);

        // Call the completion callback with the PERMANENT audio URL, corrected text, and title
        onRecordingComplete({
          audioUrl: permanentAudioUrl, // Use the permanent Firebase Storage URL
          text: correctedText,
          title: title,
        });

        toast({
          title: "Success!",
          description: "Your memory has been transcribed and enhanced.",
        });
      } catch (error) {
        console.error("Error processing voice recording:", error);

        // If transcription or correction fails, we still need to save the audio if possible
        try {
          // Try to upload the audio even if transcription failed
          const permanentAudioUrl = await uploadAudio(audioFile);

          // If transcription or correction fails, we need a fallback
          const fallbackText =
            prompt(
              "📝 We couldn't transcribe your audio clearly. Please type what you said:",
              "I recorded a memory about something important to me."
            ) || "I recorded a memory";

          // Call the completion callback with permanent audio URL and fallback data
          onRecordingComplete({
            audioUrl: permanentAudioUrl,
            text: fallbackText,
            title: "My Memory", // Default title
          });
        } catch (uploadError) {
          console.error("Failed to upload audio:", uploadError);

          // As last resort, use the temporary URL
          const fallbackText =
            prompt(
              "📝 We couldn't transcribe your audio. Please type what you said:",
              "I recorded a memory about something important to me."
            ) || "I recorded a memory";

          onRecordingComplete({
            audioUrl: audioUrl, // Use temporary URL as last resort
            text: fallbackText,
            title: "My Memory", // Default title
          });
        }
      }

      // Reset the recorder
      discardRecording();
    } catch (error) {
      console.error("Error processing recording:", error);
      toast({
        title: "Error",
        description: "Failed to process your recording. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, "0")}:${secs
      .toString()
      .padStart(2, "0")}`;
  };

  return (
    <div className="bg-primary/5 rounded-lg p-5 border border-primary-light/20 mb-6">
      <div className="flex flex-col items-center">
        {/* Inactive State */}
        {state === "inactive" && (
          <div className="flex flex-col items-center">
            <Button
              onClick={startRecording}
              className="bg-primary hover:bg-primary-dark text-white rounded-full w-16 h-16 flex items-center justify-center shadow-md transition-colors mb-3"
            >
              <Mic className="h-8 w-8" />
            </Button>
            <p className="text-sm text-neutral-700">Click to start recording</p>
            <p className="text-xs text-neutral-500 mt-1">
              (Max recording time: 5 minutes)
            </p>
          </div>
        )}

        {/* Active Recording State */}
        {(state === "recording" || state === "paused") && (
          <div className="flex flex-col items-center">
            {state === "recording" && (
              <div className="wave-animation mb-3 flex items-center h-[30px]">
                {[...Array(10)].map((_, i) => (
                  <span
                    key={i}
                    className={`bg-primary w-[3px] h-[15px] mx-[2px] rounded animate-[wave_1s_infinite_ease-in-out] ${
                      i % 2 === 0
                        ? "animation-delay-[0.2s]"
                        : "animation-delay-[0.4s]"
                    }`}
                    style={{
                      animation: "wave 1s infinite ease-in-out",
                      animationDelay: i % 2 === 0 ? "0.2s" : "0.4s",
                    }}
                  ></span>
                ))}
              </div>
            )}

            <div className="flex items-center space-x-4 mb-3">
              {state === "recording" ? (
                <Button
                  onClick={pauseRecording}
                  className="bg-primary hover:bg-primary-dark text-white rounded-full w-12 h-12 flex items-center justify-center shadow-md transition-colors"
                >
                  <Pause className="h-6 w-6" />
                </Button>
              ) : (
                <Button
                  onClick={resumeRecording}
                  className="bg-primary hover:bg-primary-dark text-white rounded-full w-12 h-12 flex items-center justify-center shadow-md transition-colors"
                >
                  <Play className="h-6 w-6" />
                </Button>
              )}

              <Button
                onClick={stopRecording}
                className="bg-red-500 hover:bg-red-600 text-white rounded-full w-16 h-16 flex items-center justify-center shadow-md transition-colors"
              >
                <Square className="h-8 w-8" />
              </Button>
            </div>

            <div className="text-center">
              <p className="text-sm font-medium text-primary">
                {state === "recording" ? "Recording..." : "Paused"}
              </p>
              <p className="text-sm text-neutral-700">
                {formatTime(recordingTime)}
              </p>
            </div>
          </div>
        )}

        {/* Preview State */}
        {state === "preview" && audioUrl && (
          <div className="w-full">
            <div className="bg-neutral-50 rounded p-3 flex items-center mb-4">
              <Button
                onClick={playRecording}
                variant="ghost"
                className="text-primary hover:text-primary-dark mr-3 p-2"
              >
                {isPlaying ? (
                  <Pause className="h-8 w-8" />
                ) : (
                  <Play className="h-8 w-8" />
                )}
              </Button>

              <div className="flex-1">
                <div className="h-2 bg-primary-light/30 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary rounded-full"
                    style={{
                      width: audioDuration
                        ? `${(currentPlaybackTime / audioDuration) * 100}%`
                        : "0%",
                    }}
                  ></div>
                </div>
                <div className="flex justify-between text-xs text-neutral-500 mt-1">
                  <span>{formatTime(currentPlaybackTime)}</span>
                  <span>{formatTime(audioDuration)}</span>
                </div>
              </div>
            </div>

            <div className="flex space-x-3">
              <Button
                onClick={discardRecording}
                variant="outline"
                className="flex-1"
                disabled={isProcessing}
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Discard & Re-record
              </Button>
              <Button
                onClick={processRecording}
                className="flex-1"
                disabled={isProcessing}
              >
                {isProcessing ? "Processing..." : "Use This Recording"}
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Keyframe animation styles */}
      <style
        dangerouslySetInnerHTML={{
          __html: `
        @keyframes wave {
          0%, 100% { height: 5px; }
          50% { height: 25px; }
        }
        `,
        }}
      />
    </div>
  );
};

export default VoiceRecorder;
