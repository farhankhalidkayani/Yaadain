import { getCurrentUser } from './firebase';

// Transcribe audio recording using OpenAI API
export async function transcribeAudio(audioFile: File): Promise<{ text: string }> {
  const user = getCurrentUser();
  if (!user) throw new Error("Not authenticated");
  
  // Create a FormData object to send the audio file
  const formData = new FormData();
  formData.append('audio', audioFile);
  formData.append('userId', user.uid);
  
  try {
    // Call the backend endpoint for transcription
    const response = await fetch('/api/transcribe-audio', {
      method: 'POST',
      body: formData,
      credentials: 'include',
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to transcribe audio');
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error transcribing audio:', error);
    throw error;
  }
}

// Enhance transcribed text with GPT-4
export async function enhanceStory(text: string): Promise<{ enhancedText: string }> {
  const user = getCurrentUser();
  if (!user) throw new Error("Not authenticated");
  
  try {
    // Call the backend endpoint for story enhancement
    const response = await fetch('/api/enhance-story', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ text, userId: user.uid }),
      credentials: 'include',
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to enhance story');
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error enhancing story:', error);
    throw error;
  }
}
