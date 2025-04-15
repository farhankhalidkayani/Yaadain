import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Mic, Pause, Play, Square, RefreshCw } from 'lucide-react';
import { transcribeAudio } from '@/lib/openai';
import { useToast } from '@/hooks/use-toast';
import { uploadAudio } from '@/lib/firebase';

type RecorderState = 'inactive' | 'recording' | 'paused' | 'preview';

const VoiceRecorder = ({ onRecordingComplete }: { onRecordingComplete: (data: { audioUrl: string, text: string }) => void }) => {
  const [state, setState] = useState<RecorderState>('inactive');
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentPlaybackTime, setCurrentPlaybackTime] = useState(0);
  const [audioDuration, setAudioDuration] = useState(0);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const { toast } = useToast();
  
  useEffect(() => {
    if (state === 'recording') {
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
  
  useEffect(() => {
    if (audioUrl && state === 'preview') {
      const audio = new Audio(audioUrl);
      audioRef.current = audio;
      
      audio.addEventListener('loadedmetadata', () => {
        setAudioDuration(audio.duration);
      });
      
      audio.addEventListener('timeupdate', () => {
        setCurrentPlaybackTime(audio.currentTime);
      });
      
      audio.addEventListener('ended', () => {
        setCurrentPlaybackTime(0);
      });
      
      return () => {
        audio.pause();
        URL.revokeObjectURL(audioUrl);
        audioRef.current = null;
      };
    }
  }, [audioUrl, state]);
  
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];
      
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };
      
      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
        const url = URL.createObjectURL(audioBlob);
        setAudioUrl(url);
      };
      
      mediaRecorder.start();
      setState('recording');
      setRecordingTime(0);
    } catch (error) {
      console.error('Error starting recording:', error);
      toast({
        title: 'Error',
        description: 'Could not access microphone. Please check your permissions.',
        variant: 'destructive',
      });
    }
  };
  
  const pauseRecording = () => {
    if (mediaRecorderRef.current && state === 'recording') {
      mediaRecorderRef.current.pause();
      setState('paused');
    }
  };
  
  const resumeRecording = () => {
    if (mediaRecorderRef.current && state === 'paused') {
      mediaRecorderRef.current.resume();
      setState('recording');
    }
  };
  
  const stopRecording = () => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
      
      // Stop all audio tracks
      mediaRecorderRef.current.stream.getTracks().forEach((track) => {
        track.stop();
      });
      
      setState('preview');
    }
  };
  
  const playRecording = () => {
    if (audioRef.current) {
      audioRef.current.play();
    }
  };
  
  const discardRecording = () => {
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
    }
    
    setState('inactive');
    setAudioUrl(null);
    setRecordingTime(0);
    setCurrentPlaybackTime(0);
    setAudioDuration(0);
  };
  
  const processRecording = async () => {
    if (!audioUrl) return;
    
    setIsProcessing(true);
    
    try {
      // Check if test mode is enabled
      const testModeEnabled = sessionStorage.getItem('testModeEnabled') === 'true';
      
      if (testModeEnabled) {
        // In test mode, we don't call Firebase or OpenAI APIs
        console.log("Test mode: creating mock transcription");
        
        // First, simulate the transcription process (2 seconds)
        toast({
          title: "Transcribing...",
          description: "Converting your voice recording to text.",
        });
        
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Let's use a prompt to get actual input from the user for the transcription
        const userInputPrompt = prompt(
          "📝 TEST MODE: Since we can't access your actual voice recording, please type what you said:", 
          "I went to the park today"
        );
        
        // Use the user's input or a default if they cancel
        const mockTranscript = userInputPrompt || "I recorded a memory about something important to me.";
        
        // Call the completion callback with mock data
        onRecordingComplete({
          audioUrl: audioUrl, // Use the local audio URL
          text: mockTranscript
        });
        
      } else {
        // Normal production flow:
        // Convert the audio blob to a file for upload
        const audioBlob = await fetch(audioUrl).then(r => r.blob());
        const audioFile = new File([audioBlob], 'recording.wav', { type: 'audio/wav' });
        
        // Upload the audio file to Firebase Storage
        const uploadedAudioUrl = await uploadAudio(audioFile);
        
        // Transcribe the audio using OpenAI
        const { text } = await transcribeAudio(audioFile);
        
        // Call the completion callback with the audio URL and transcribed text
        onRecordingComplete({
          audioUrl: uploadedAudioUrl,
          text
        });
      }
      
      // Reset the recorder
      discardRecording();
    } catch (error) {
      console.error('Error processing recording:', error);
      toast({
        title: 'Error',
        description: 'Failed to process your recording. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsProcessing(false);
    }
  };
  
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };
  
  return (
    <div className="bg-primary/5 rounded-lg p-5 border border-primary-light/20 mb-6">
      <div className="flex flex-col items-center">
        {/* Inactive State */}
        {state === 'inactive' && (
          <div className="flex flex-col items-center">
            <Button
              onClick={startRecording}
              className="bg-primary hover:bg-primary-dark text-white rounded-full w-16 h-16 flex items-center justify-center shadow-md transition-colors mb-3"
            >
              <Mic className="h-8 w-8" />
            </Button>
            <p className="text-sm text-neutral-700">Click to start recording</p>
            <p className="text-xs text-neutral-500 mt-1">(Max recording time: 5 minutes)</p>
          </div>
        )}
        
        {/* Active Recording State */}
        {(state === 'recording' || state === 'paused') && (
          <div className="flex flex-col items-center">
            {state === 'recording' && (
              <div className="wave-animation mb-3 flex items-center h-[30px]">
                {[...Array(10)].map((_, i) => (
                  <span 
                    key={i} 
                    className={`bg-primary w-[3px] h-[15px] mx-[2px] rounded animate-[wave_1s_infinite_ease-in-out] ${i % 2 === 0 ? 'animation-delay-[0.2s]' : 'animation-delay-[0.4s]'}`}
                    style={{
                      animation: 'wave 1s infinite ease-in-out',
                      animationDelay: i % 2 === 0 ? '0.2s' : '0.4s'
                    }}
                  ></span>
                ))}
              </div>
            )}
            
            <div className="flex items-center space-x-4 mb-3">
              {state === 'recording' ? (
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
                {state === 'recording' ? 'Recording...' : 'Paused'}
              </p>
              <p className="text-sm text-neutral-700">{formatTime(recordingTime)}</p>
            </div>
          </div>
        )}
        
        {/* Preview State */}
        {state === 'preview' && audioUrl && (
          <div className="w-full">
            <div className="bg-neutral-50 rounded p-3 flex items-center mb-4">
              <Button
                onClick={playRecording}
                variant="ghost"
                className="text-primary hover:text-primary-dark mr-3 p-2"
              >
                <Play className="h-8 w-8" />
              </Button>
              
              <div className="flex-1">
                <div className="h-2 bg-primary-light/30 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-primary rounded-full" 
                    style={{ 
                      width: audioDuration ? `${(currentPlaybackTime / audioDuration) * 100}%` : '0%'
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
                {isProcessing ? 'Processing...' : 'Use This Recording'}
              </Button>
            </div>
          </div>
        )}
      </div>
      
      {/* Keyframe animation styles */}
      <style dangerouslySetInnerHTML={{
        __html: `
        @keyframes wave {
          0%, 100% { height: 5px; }
          50% { height: 25px; }
        }
        `
      }} />
    </div>
  );
};

export default VoiceRecorder;
