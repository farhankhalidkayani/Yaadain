import { getCurrentUser } from './firebase';

// Transcribe audio recording using OpenAI API
export async function transcribeAudio(audioFile: File): Promise<{ text: string }> {
  // Check if test mode is enabled
  const testModeEnabled = sessionStorage.getItem('testModeEnabled') === 'true';
  
  // For authenticated mode, get the user if not in test mode
  let user = null;
  if (!testModeEnabled) {
    user = getCurrentUser();
  }
  
  // Create a FormData object to send the audio file
  const formData = new FormData();
  formData.append('audio', audioFile);
  
  // Add userId if available
  if (user) {
    formData.append('userId', user.uid);
  }
  
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
  try {
    // Apply simple enhancement in test mode
    const testModeEnabled = sessionStorage.getItem('testModeEnabled') === 'true';
    if (testModeEnabled) {
      // This is a simplified enhancement that will work offline for testing
      return {
        enhancedText: `# A Special Memory\n\n${text}\n\nThis moment was captured on ${new Date().toLocaleDateString()}.`
      };
    }
    
    // For production mode, call the backend endpoint
    const response = await fetch('/api/enhance-story', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ text }),
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
