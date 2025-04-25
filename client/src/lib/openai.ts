import { getCurrentUser } from "./firebase";

// Transcribe audio recording using OpenAI API
export async function transcribeAudio(
  audioFile: File
): Promise<{ text: string }> {
  // Check if test mode is enabled
  const testModeEnabled = sessionStorage.getItem("testModeEnabled") === "true";

  // For authenticated mode, get the user if not in test mode
  let user = null;
  if (!testModeEnabled) {
    user = getCurrentUser();
  }

  // Create a FormData object to send the audio file
  const formData = new FormData();
  formData.append("audio", audioFile);

  // Add userId if available
  if (user) {
    formData.append("userId", user.uid);
  }

  // Implementation with retry logic for network issues
  const MAX_RETRIES = 3;
  let attempts = 0;
  let lastError = null;

  while (attempts < MAX_RETRIES) {
    try {
      console.log(`Transcription attempt ${attempts + 1}/${MAX_RETRIES}`);

      // Call the backend endpoint for transcription with a longer timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 120000); // 2 minute timeout

      const response = await fetch("/api/transcribe-audio", {
        method: "POST",
        body: formData,
        credentials: "include",
        signal: controller.signal,
      });

      // Clear the timeout
      clearTimeout(timeoutId);

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to transcribe audio");
      }

      return await response.json();
    } catch (error: any) {
      attempts++;
      lastError = error;

      // Check if it's a connection-related error
      const isNetworkError =
        error.name === "AbortError" ||
        error.message?.includes("network") ||
        error.message?.includes("connection");

      if (attempts >= MAX_RETRIES || !isNetworkError) {
        console.error(
          `Giving up transcription after ${attempts} attempts:`,
          error
        );
        break;
      }

      // Exponential backoff for retries
      const delay = Math.min(1000 * Math.pow(2, attempts), 10000);
      console.log(`Transcription network error, retrying in ${delay}ms...`);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  // Use test mode as fallback if everything else fails
  if (testModeEnabled) {
    console.log("Using test mode fallback for transcription");
    return {
      text: "This is a test transcription as the server is unavailable. Please speak clearly and try again.",
    };
  }

  // If all retries failed, throw the last error
  throw (
    lastError || new Error("Failed to transcribe audio after multiple attempts")
  );
}

// Enhance transcribed text with GPT-4
export async function enhanceStory(
  text: string
): Promise<{ enhancedText: string }> {
  try {
    // For production mode, call the backend endpoint
    const response = await fetch("/api/enhance-story", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ text }),
      credentials: "include",
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || "Failed to enhance story");
    }

    return await response.json();
  } catch (error) {
    console.error("Error enhancing story:", error);
    throw error;
  }
}

// Correct transcript and generate appropriate title
export async function correctTranscriptAndGenerateTitle(
  text: string
): Promise<{ correctedText: string; title: string }> {
  try {
    // For production mode, call the backend endpoint
    const response = await fetch("/api/correct-transcript", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ text }),
      credentials: "include",
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || "Failed to correct transcript");
    }

    return await response.json();
  } catch (error) {
    console.error("Error correcting transcript:", error);
    // Return original text if there's an error
    return {
      correctedText: text,
      title: "New Memory",
    };
  }
}
