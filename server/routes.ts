import express, { type Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import multer from "multer";
import path from "path";
import OpenAI from "openai";
import * as fs from "fs";
import dotenv from "dotenv";
import { promisify } from "util";
import ffmpeg from "fluent-ffmpeg";
import ffmpegInstaller from "@ffmpeg-installer/ffmpeg";
// Import Ollama client
import { Ollama } from "ollama";

// Set up ffmpeg path
ffmpeg.setFfmpegPath(ffmpegInstaller.path);

// Load environment variables directly in this file
dotenv.config({ path: path.resolve(process.cwd(), ".env") });

// Configure Ollama client
const ollama = new Ollama({
  host: process.env.OLLAMA_HOST || "http://localhost:11434",
});

// Keep OpenAI configuration for backward compatibility
const openaiApiKey = process.env.OPENAI_API_KEY;
if (!openaiApiKey) {
  console.warn(
    "Warning: OPENAI_API_KEY is not set. Using Ollama with Llama 3 instead."
  );
}
const openai = openaiApiKey ? new OpenAI({ apiKey: openaiApiKey }) : null;

// Import Whisper model from transformers (used for all voice transcription)
let whisperPipeline: any = null;
let isLoadingWhisperModel = false;
let whisperModelError: Error | null = null;
let isUsingFallback = false;

// Initialize the Whisper model asynchronously
async function loadWhisperModel() {
  if (whisperPipeline !== null || isLoadingWhisperModel) return;

  try {
    isLoadingWhisperModel = true;
    console.log("Loading local Whisper model...");

    try {
      const { pipeline } = await import("@xenova/transformers");
      // Try tiny model first as it loads faster
      whisperPipeline = await pipeline(
        "automatic-speech-recognition",
        "Xenova/whisper-tiny.en"
      );
      console.log("Local Whisper tiny model loaded successfully");
    } catch (tinyError) {
      console.warn(
        "Failed to load tiny model, falling back to base model:",
        tinyError
      );
      try {
        const { pipeline } = await import("@xenova/transformers");
        whisperPipeline = await pipeline(
          "automatic-speech-recognition",
          "Xenova/whisper-base.en"
        );
        console.log("Local Whisper base model loaded successfully");
      } catch (baseError) {
        throw baseError;
      }
    }
  } catch (error) {
    console.error("Failed to load any Whisper model:", error);
    whisperModelError = error as Error;
    isUsingFallback = true;
    console.log("Will use OpenAI as fallback for transcription");
  } finally {
    isLoadingWhisperModel = false;
  }
}

// Start loading Whisper model in background
loadWhisperModel();

// Function to transcribe audio using OpenAI API as a fallback
async function transcribeWithOpenAI(audioFilePath: string): Promise<string> {
  try {
    if (!openaiApiKey) {
      throw new Error("OpenAI API key not configured");
    }

    console.log("Transcribing with OpenAI...");
    const transcription = await openai.audio.transcriptions.create({
      file: fs.createReadStream(audioFilePath),
      model: "whisper-1",
      language: "en",
    });

    console.log("OpenAI transcription successful");
    return transcription.text;
  } catch (error) {
    console.error("OpenAI transcription error:", error);
    throw new Error(
      "Failed to transcribe with OpenAI: " + (error as Error).message
    );
  }
}

// Function to convert any audio format to WAV using ffmpeg
async function convertAudioToWav(inputPath: string): Promise<string> {
  return new Promise((resolve, reject) => {
    // Create output filename
    const outputPath = inputPath.replace(/\.[^/.]+$/, "") + ".processed.wav";

    console.log(
      `Converting audio file to WAV format: ${inputPath} -> ${outputPath}`
    );

    ffmpeg(inputPath)
      .outputOptions([
        "-ar 16000", // 16kHz sample rate (what Whisper expects)
        "-ac 1", // mono audio
        "-c:a pcm_s16le", // PCM 16-bit audio
      ])
      .output(outputPath)
      .on("end", () => {
        console.log("Audio conversion complete");
        resolve(outputPath);
      })
      .on("error", (err) => {
        console.error("Error during audio conversion:", err);
        reject(err);
      })
      .run();
  });
}

// Function to load audio into a Float32Array
async function loadAudioAsFloat32Array(
  audioPath: string
): Promise<Float32Array> {
  const fs = await import("fs").then((m) => m.default || m);
  const util = await import("util").then((m) => m.default || m);
  const readFile = util.promisify(fs.readFile);

  try {
    // Read the file data
    const audioBuffer = await readFile(audioPath);

    // For WAV files:
    // The data portion starts after the header (44 bytes for standard WAV)
    // Each sample is 2 bytes (16-bit) in little-endian format
    const headerSize = 44;
    const bytesPerSample = 2;
    const numSamples = (audioBuffer.length - headerSize) / bytesPerSample;
    const audioData = new Float32Array(numSamples);

    // Convert 16-bit PCM samples to normalized float in [-1,1]
    for (let i = 0; i < numSamples; i++) {
      const sampleIndex = headerSize + i * bytesPerSample;
      // Convert from 16-bit signed integer to float
      const sample = audioBuffer.readInt16LE(sampleIndex);
      audioData[i] = sample / 32768.0; // Normalize to [-1, 1]
    }

    console.log(`Loaded ${numSamples} audio samples as Float32Array`);
    return audioData;
  } catch (error) {
    console.error("Error loading audio file:", error);
    throw error;
  }
}

// Function to transcribe audio using local Whisper model
async function transcribeWithWhisper(audioFilePath: string): Promise<string> {
  // First try to load the model if it hasn't been loaded yet
  if (!whisperPipeline && !isUsingFallback && !isLoadingWhisperModel) {
    try {
      await loadWhisperModel();
    } catch (loadError) {
      console.error("Failed to load Whisper model:", loadError);
      whisperModelError = loadError as Error;
      isUsingFallback = true;
    }
  }

  // If there was an error loading the model or we're using fallback mode, use OpenAI API
  if (isUsingFallback || whisperModelError) {
    console.log("Using OpenAI as fallback for transcription");
    try {
      return await transcribeWithOpenAI(audioFilePath);
    } catch (openaiError) {
      console.error("OpenAI fallback also failed:", openaiError);
      throw new Error(
        "All transcription methods failed. Please try again later."
      );
    }
  }

  // If the model is still loading, wait for it
  if (isLoadingWhisperModel) {
    console.log("Waiting for Whisper model to load...");
    // Wait up to 30 seconds for the model to load
    for (let i = 0; i < 30; i++) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      if (!isLoadingWhisperModel) {
        break;
      }
    }

    // If it's still loading after timeout, use OpenAI
    if (isLoadingWhisperModel || whisperModelError) {
      console.log(
        "Whisper model taking too long to load, using OpenAI as fallback"
      );
      try {
        return await transcribeWithOpenAI(audioFilePath);
      } catch (openaiError) {
        console.error("OpenAI fallback also failed:", openaiError);
        throw new Error(
          "All transcription methods failed. Please try again later."
        );
      }
    }
  }

  // If we still don't have the model by now, something went wrong
  if (!whisperPipeline) {
    throw new Error("Failed to load Whisper model for transcription");
  }

  console.log("Transcribing with local Whisper model...");

  try {
    // First convert the audio to a format Whisper will definitely understand
    console.log("Converting audio to proper format...");
    const processedAudioPath = await convertAudioToWav(audioFilePath);

    // Now load the audio data as Float32Array
    console.log("Loading audio data...");
    const audioData = await loadAudioAsFloat32Array(processedAudioPath);

    console.log("Running Whisper transcription...");
    // Pass audio data directly to the model as Float32Array
    const result = await whisperPipeline(audioData, {
      chunk_length_s: 30,
      stride_length_s: 5,
      language: "english",
      return_timestamps: false,
      sampling_rate: 16000, // Required for Whisper models
    });

    // Clean up temporary processed file
    try {
      fs.unlinkSync(processedAudioPath);
    } catch (cleanupErr) {
      console.warn("Couldn't delete temporary file:", cleanupErr);
    }

    // If the transcription is blank or just a period, try again with additional parameters
    if (
      !result.text ||
      result.text.trim() === "." ||
      result.text.trim() === "[SOUND]" ||
      result.text.trim() === ". [SOUND]"
    ) {
      console.log(
        "Initial transcription was minimal, trying with different parameters..."
      );

      // Try again with different parameters
      const result2 = await whisperPipeline(audioData, {
        chunk_length_s: 10, // Shorter chunks
        stride_length_s: 1, // Less overlap
        language: "english",
        task: "transcribe", // Force transcribe task
        return_timestamps: false,
        sampling_rate: 16000,
        no_speech_threshold: 0.1, // More sensitive to speech
      });

      if (
        !result2.text ||
        result2.text.trim() === "." ||
        result2.text.trim() === "[SOUND]"
      ) {
        console.log(
          "Still got minimal transcription. Trying OpenAI as a last resort..."
        );

        try {
          return await transcribeWithOpenAI(audioFilePath);
        } catch (openaiError) {
          console.error("OpenAI fallback also failed:", openaiError);
          return "We couldn't detect clear speech in this recording. Please try recording again with more volume or less background noise.";
        }
      }

      console.log(
        "Second attempt transcription successful:",
        result2.text.substring(0, 50) + "..."
      );
      return result2.text;
    }

    console.log(
      "Whisper transcription successful:",
      result.text.substring(0, 50) + "..."
    );
    return result.text;
  } catch (error) {
    console.error("Whisper transcription error:", error);

    // Try OpenAI as fallback if local processing fails
    console.log("Local Whisper failed, trying OpenAI as fallback...");
    try {
      return await transcribeWithOpenAI(audioFilePath);
    } catch (openaiError) {
      console.error("OpenAI fallback also failed:", openaiError);
      throw new Error(
        "All transcription methods failed: " + (error as Error).message
      );
    }
  }
}

// Configure file upload for audio and images
const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      const uploadDir = path.join(process.cwd(), "uploads");
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }
      cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
      const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
      cb(
        null,
        file.fieldname + "-" + uniqueSuffix + path.extname(file.originalname)
      );
    },
  }),
});

export async function registerRoutes(app: Express): Promise<Server> {
  // User authentication endpoints
  app.post("/api/auth/register", async (req: Request, res: Response) => {
    try {
      const { username, email, password, displayName, firebaseId } = req.body;

      // Check if user already exists
      const existingUser = await storage.getUserByEmail(email);
      if (existingUser) {
        return res
          .status(400)
          .json({ message: "User with this email already exists" });
      }

      // Create new user
      const user = await storage.createUser({
        username,
        email,
        password,
        displayName,
        firebaseId,
        subscription: "free",
      });

      res.status(201).json({
        user: { id: user.id, username: user.username, email: user.email },
      });
    } catch (error) {
      console.error("Error registering user:", error);
      res.status(500).json({ message: "Failed to register user" });
    }
  });

  // Memory endpoints
  app.get("/api/memories", async (req: Request, res: Response) => {
    try {
      const userId = req.query.userId as string;

      if (!userId) {
        return res.status(400).json({ message: "User ID is required" });
      }

      console.log(`Fetching memories for user: ${userId}`);

      // Check if it's a Firebase UID (string format) or a numeric ID
      if (/^[a-zA-Z0-9]{20,}$/.test(userId)) {
        // Handle Firebase UIDs by querying Firestore directly
        console.log("Processing request with Firebase UID");

        // Import here to avoid circular dependencies
        const { getMemoriesByFirebaseUID } = await import("./firebase-admin");
        const memories = await getMemoriesByFirebaseUID(userId);

        console.log(
          `Retrieved ${memories.length} memories from Firestore for Firebase user ${userId}`
        );
        return res.json(memories);
      }

      // Original logic for numeric IDs
      const numericUserId = Number(userId);
      if (isNaN(numericUserId)) {
        return res.status(400).json({ message: "Invalid user ID format" });
      }

      const memories = await storage.getUserMemories(numericUserId);
      res.json(memories);
    } catch (error) {
      console.error("Error fetching memories:", error);
      res.status(500).json({ message: "Failed to fetch memories" });
    }
  });

  app.get("/api/memories/:id", async (req: Request, res: Response) => {
    try {
      const id = Number(req.params.id);
      const memory = await storage.getMemory(id);

      if (!memory) {
        return res.status(404).json({ message: "Memory not found" });
      }

      res.json(memory);
    } catch (error) {
      console.error("Error fetching memory:", error);
      res.status(500).json({ message: "Failed to fetch memory" });
    }
  });

  app.post("/api/memories", async (req: Request, res: Response) => {
    try {
      const { userId, title, text, originalText, audioUrl, imageUrl } =
        req.body;

      if (!userId || !title || !text) {
        return res
          .status(400)
          .json({ message: "User ID, title, and text are required" });
      }

      const memory = await storage.createMemory({
        userId,
        title,
        text,
        originalText,
        audioUrl,
        imageUrl,
      });

      res.status(201).json(memory);
    } catch (error) {
      console.error("Error creating memory:", error);
      res.status(500).json({ message: "Failed to create memory" });
    }
  });

  app.put("/api/memories/:id", async (req: Request, res: Response) => {
    try {
      const id = Number(req.params.id);
      const { title, text, imageUrl } = req.body;

      const updatedMemory = await storage.updateMemory(id, {
        title,
        text,
        imageUrl,
      });

      if (!updatedMemory) {
        return res.status(404).json({ message: "Memory not found" });
      }

      res.json(updatedMemory);
    } catch (error) {
      console.error("Error updating memory:", error);
      res.status(500).json({ message: "Failed to update memory" });
    }
  });

  app.delete("/api/memories/:id", async (req: Request, res: Response) => {
    try {
      const id = Number(req.params.id);
      const deleted = await storage.deleteMemory(id);

      if (!deleted) {
        return res.status(404).json({ message: "Memory not found" });
      }

      res.status(204).send();
    } catch (error) {
      console.error("Error deleting memory:", error);
      res.status(500).json({ message: "Failed to delete memory" });
    }
  });

  // Book endpoints
  app.get("/api/books", async (req: Request, res: Response) => {
    try {
      const userId = req.query.userId as string;

      if (!userId) {
        return res.status(400).json({ message: "User ID is required" });
      }

      console.log(`Fetching books for user: ${userId}`);

      // Check if it's a Firebase UID (string format) or a numeric ID
      if (/^[a-zA-Z0-9]{20,}$/.test(userId)) {
        // Handle Firebase UIDs by querying Firestore directly
        console.log("Processing request with Firebase UID");

        // Import here to avoid circular dependencies
        const { getBooksByFirebaseUID } = await import("./firebase-admin");
        const books = await getBooksByFirebaseUID(userId);

        console.log(
          `Retrieved ${books.length} books from Firestore for Firebase user ${userId}`
        );
        return res.json(books);
      }

      // Original logic for numeric IDs
      const numericUserId = Number(userId);
      if (isNaN(numericUserId)) {
        return res.status(400).json({ message: "Invalid user ID format" });
      }

      const books = await storage.getUserBooks(numericUserId);
      res.json(books);
    } catch (error) {
      console.error("Error fetching books:", error);
      res.status(500).json({ message: "Failed to fetch books" });
    }
  });

  app.get("/api/books/:id", async (req: Request, res: Response) => {
    try {
      const id = Number(req.params.id);
      const book = await storage.getBook(id);

      if (!book) {
        return res.status(404).json({ message: "Book not found" });
      }

      // Get all memories in this book
      const bookMemories = await storage.getBookMemories(id);

      // Get the memory data for each memory in the book
      const memories = await Promise.all(
        bookMemories.map(async (bookMemory) => {
          const memory = await storage.getMemory(bookMemory.memoryId);
          return { ...memory, order: bookMemory.order };
        })
      );

      res.json({
        book,
        memories: memories
          .filter(Boolean)
          .sort((a, b) => (a.order ?? 0) - (b.order ?? 0)),
      });
    } catch (error) {
      console.error("Error fetching book:", error);
      res.status(500).json({ message: "Failed to fetch book" });
    }
  });

  app.post("/api/books", async (req: Request, res: Response) => {
    try {
      const { userId, title, description, coverUrl, status } = req.body;

      if (!userId || !title) {
        return res
          .status(400)
          .json({ message: "User ID and title are required" });
      }

      // Check if user is allowed to create a new book (premium users or free users with < 3 books)
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      const userBooks = await storage.getUserBooks(userId);
      if (user.subscription !== "premium" && userBooks.length >= 3) {
        return res.status(403).json({
          message:
            "Free users are limited to 3 memory books. Please upgrade to premium.",
        });
      }

      const book = await storage.createBook({
        userId,
        title,
        description,
        coverUrl,
        status,
      });

      res.status(201).json(book);
    } catch (error) {
      console.error("Error creating book:", error);
      res.status(500).json({ message: "Failed to create book" });
    }
  });

  app.put("/api/books/:id", async (req: Request, res: Response) => {
    try {
      const id = Number(req.params.id);
      const { title, description, coverUrl, status } = req.body;

      const updatedBook = await storage.updateBook(id, {
        title,
        description,
        coverUrl,
        status,
      });

      if (!updatedBook) {
        return res.status(404).json({ message: "Book not found" });
      }

      res.json(updatedBook);
    } catch (error) {
      console.error("Error updating book:", error);
      res.status(500).json({ message: "Failed to update book" });
    }
  });

  app.delete("/api/books/:id", async (req: Request, res: Response) => {
    try {
      const id = Number(req.params.id);
      const deleted = await storage.deleteBook(id);

      if (!deleted) {
        return res.status(404).json({ message: "Book not found" });
      }

      res.status(204).send();
    } catch (error) {
      console.error("Error deleting book:", error);
      res.status(500).json({ message: "Failed to delete book" });
    }
  });

  // Book memory management endpoints
  app.post(
    "/api/books/:bookId/memories",
    async (req: Request, res: Response) => {
      try {
        const bookId = Number(req.params.bookId);
        const { memoryId, order } = req.body;

        if (!memoryId) {
          return res.status(400).json({ message: "Memory ID is required" });
        }

        const book = await storage.getBook(bookId);
        if (!book) {
          return res.status(404).json({ message: "Book not found" });
        }

        const memory = await storage.getMemory(memoryId);
        if (!memory) {
          return res.status(404).json({ message: "Memory not found" });
        }

        const bookMemory = await storage.addMemoryToBook({
          bookId,
          memoryId,
          order: order || 0,
        });

        res.status(201).json(bookMemory);
      } catch (error) {
        console.error("Error adding memory to book:", error);
        res.status(500).json({ message: "Failed to add memory to book" });
      }
    }
  );

  app.delete(
    "/api/books/:bookId/memories/:memoryId",
    async (req: Request, res: Response) => {
      try {
        const bookId = Number(req.params.bookId);
        const memoryId = Number(req.params.memoryId);

        const deleted = await storage.removeMemoryFromBook(bookId, memoryId);

        if (!deleted) {
          return res.status(404).json({ message: "Memory not found in book" });
        }

        res.status(204).send();
      } catch (error) {
        console.error("Error removing memory from book:", error);
        res.status(500).json({ message: "Failed to remove memory from book" });
      }
    }
  );

  // OpenAI integration endpoints
  app.post(
    "/api/transcribe-audio",
    upload.single("audio"),
    async (req: Request, res: Response) => {
      try {
        if (!req.file) {
          return res.status(400).json({ message: "No audio file provided" });
        }

        console.log(
          `Starting transcription for file: ${req.file.path} (${req.file.size} bytes, type: ${req.file.mimetype})`
        );

        // Use Whisper model for all transcriptions
        console.log("Using Whisper model for transcription...");
        const transcriptionText = await transcribeWithWhisper(req.file.path);
        console.log(
          "Whisper transcription successful:",
          transcriptionText.substring(0, 50) + "..."
        );

        // Clean up the uploaded file
        try {
          if (fs.existsSync(req.file.path)) {
            fs.unlinkSync(req.file.path);
          }
        } catch (cleanupError) {
          console.error("Error removing temporary audio file:", cleanupError);
          // Non-blocking error, continue with the response
        }

        res.json({ text: transcriptionText });
      } catch (error: any) {
        console.error("Error in transcription endpoint:", error);

        // Clean up the uploaded file if it exists
        try {
          if (req.file && fs.existsSync(req.file.path)) {
            fs.unlinkSync(req.file.path);
          }
        } catch (cleanupError) {
          console.error("Error cleaning up file after error:", cleanupError);
        }

        res.status(500).json({
          message:
            "Failed to transcribe audio. Whisper model transcription failed.",
          error: error.message || "TRANSCRIPTION_FAILED",
        });
      }
    }
  );

  app.post("/api/enhance-story", async (req: Request, res: Response) => {
    try {
      const { text } = req.body;

      if (!text) {
        return res.status(400).json({ message: "Text is required" });
      }

      console.log("Enhancing story with Ollama (Llama 3)...");

      try {
        // Use Ollama with Llama 3 for story enhancement
        const response = await ollama.chat({
          model: "llama3", // Make sure this model is installed on your Ollama instance
          messages: [
            {
              role: "system",
              content:
                "You are a creative writing assistant that helps enhance personal stories and memories. Your task is to improve the transcribed story while maintaining the original meaning and personal voice. Add details, improve flow, and fix any grammar or structure issues. Format the story with the first line as a good title, followed by paragraphs.",
            },
            {
              role: "user",
              content: `Please enhance this transcribed memory: ${text}`,
            },
          ],
          stream: false,
        });

        // Extract the enhanced text from the response
        const enhancedText = response.message.content;

        console.log("Story enhancement successful with Llama 3");
        res.json({ enhancedText });
      } catch (ollamaError) {
        console.error("Error with Ollama enhancement:", ollamaError);

        // If Ollama fails, try OpenAI if available
        if (openai) {
          console.log("Falling back to OpenAI for story enhancement...");
          const response = await openai.chat.completions.create({
            model: "gpt-4o",
            messages: [
              {
                role: "system",
                content:
                  "You are a creative writing assistant that helps enhance personal stories and memories. Your task is to improve the transcribed story while maintaining the original meaning and personal voice. Add details, improve flow, and fix any grammar or structure issues. Format the story with the first line as a good title, followed by paragraphs.",
              },
              {
                role: "user",
                content: `Please enhance this transcribed memory: ${text}`,
              },
            ],
            max_tokens: 1000,
          });

          const enhancedText = response.choices[0].message.content;
          res.json({ enhancedText, provider: "openai" });
        } else {
          // If OpenAI is not available, return a basic enhancement
          const enhancedText = `${text.trim()}\n\nI cherish this memory and the feelings it brings back. These moments are what make life meaningful.`;
          res.json({
            enhancedText,
            provider: "basic",
            message:
              "Enhancement services are currently unavailable. Basic formatting applied.",
          });
        }
      }
    } catch (error) {
      console.error("Error in enhance-story endpoint:", error);
      res.status(500).json({
        message: "Failed to enhance story",
        enhancedText: text, // Return original text as fallback
      });
    }
  });

  // New endpoint for transcript correction and title generation
  app.post("/api/correct-transcript", async (req: Request, res: Response) => {
    const { text } = req.body;

    try {
      if (!text) {
        return res.status(400).json({ message: "Text is required" });
      }

      console.log(
        "Correcting transcript and generating title for:",
        text.substring(0, 50) + "..."
      );

      try {
        // Use Ollama with Llama 3 for transcript correction and title generation
        console.log("Using Ollama with Llama 3 for transcript correction");
        const response = await ollama.chat({
          model: "llama3", // Make sure this model is installed on your Ollama instance
          messages: [
            {
              role: "system",
              content:
                "You are an expert at correcting speech-to-text transcriptions and generating appropriate titles for memories. Your task is to correct any transcription errors while preserving the meaning and generate a concise, descriptive title (5-7 words) that captures the essence of the memory. Return your response in JSON format with 'correctedText' and 'title' fields.",
            },
            {
              role: "user",
              content: `Please correct this transcript and generate an appropriate title: "${text}"`,
            },
          ],
          format: "json", // Request JSON format response
          stream: false,
        });

        // Parse the JSON response
        let result;
        try {
          const content = response.message.content;
          // Sometimes Ollama might return JSON embedded in a code block or with extra text
          // Try to extract just the JSON part using regex
          const jsonMatch = content.match(/\{[\s\S]*\}/);
          const jsonString = jsonMatch ? jsonMatch[0] : content;

          result = JSON.parse(jsonString);

          if (!result.correctedText || !result.title) {
            // Ensure we have both required fields
            console.warn("Ollama response missing required fields:", content);
            throw new Error("Invalid response format");
          }
        } catch (parseError) {
          console.error("Error parsing Ollama JSON response:", parseError);
          // Extract title and text using simple heuristics if JSON parsing fails
          const lines = response.message.content
            .split("\n")
            .filter((line) => line.trim());
          const possibleTitle = lines[0]
            ?.replace(/^(title|#)+[:\s]*/i, "")
            .trim();
          const correctedText = text.trim(); // Use original as fallback

          result = {
            correctedText: correctedText,
            title: possibleTitle || "My Memory",
          };
        }

        console.log(`Generated title: "${result.title}"`);
        console.log(
          "Corrected text:",
          result.correctedText.substring(0, 50) + "..."
        );

        res.json({
          correctedText: result.correctedText,
          title: result.title,
          provider: "ollama",
        });
      } catch (ollamaError) {
        console.error("Ollama error:", ollamaError);

        // Fall back to OpenAI if available
        if (openai) {
          console.log("Falling back to OpenAI for transcript correction");
          const response = await openai.chat.completions.create({
            model: "gpt-3.5-turbo",
            messages: [
              {
                role: "system",
                content:
                  "You are an expert at correcting speech-to-text transcriptions and generating appropriate titles for memories. Your task is to correct any transcription errors while preserving the meaning and generate a concise, descriptive title (5-7 words) that captures the essence of the memory. Return both the corrected transcript and the title in JSON format.",
              },
              {
                role: "user",
                content: `Please correct this transcript and generate an appropriate title: "${text}"`,
              },
            ],
            response_format: { type: "json_object" },
            max_tokens: 1000,
          });

          // Parse the OpenAI JSON response
          try {
            const content = response.choices[0].message.content;
            if (!content) throw new Error("Empty response from OpenAI");
            const result = JSON.parse(content);

            if (!result.correctedText || !result.title) {
              throw new Error("Invalid response format from OpenAI");
            }

            res.json({
              correctedText: result.correctedText,
              title: result.title,
              provider: "openai",
            });
          } catch (parseError) {
            console.error("Error parsing OpenAI JSON response:", parseError);
            // Basic fallback if OpenAI fails
            res.json({
              correctedText: text,
              title: "My Memory",
              provider: "fallback",
            });
          }
        } else {
          // If OpenAI is not available, apply basic title extraction
          console.log("Using basic title extraction as fallback");

          // Extract a title from the text - use the first sentence or part of it
          let title = "My Memory";
          const firstSentence = text.split(/[.!?]/)[0].trim();
          if (firstSentence) {
            // If the first sentence is long, take just the first few words
            const words = firstSentence.split(/\s+/);
            if (words.length <= 7) {
              title = firstSentence;
            } else {
              title = words.slice(0, 7).join(" ");
            }

            // Capitalize the first letter of the title
            title = title.charAt(0).toUpperCase() + title.slice(1);
          }

          res.json({
            correctedText: text,
            title: title,
            provider: "basic",
          });
        }
      }
    } catch (error) {
      console.error("Error in correct-transcript endpoint:", error);
      res.status(500).json({
        message: "Failed to correct transcript",
        // Return original values as fallback
        correctedText: text,
        title: "New Memory",
      });
    }
  });

  // Stripe payment integration endpoints
  app.post("/api/create-subscription", async (req: Request, res: Response) => {
    try {
      const { userId, email } = req.body;

      if (!userId || !email) {
        return res
          .status(400)
          .json({ message: "User ID and email are required" });
      }

      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Check if user already has a subscription
      if (user.subscription === "premium") {
        return res
          .status(400)
          .json({ message: "User already has a premium subscription" });
      }

      // For now, instantly upgrade user to premium (in a real app, this would happen after payment)
      await storage.updateUserStripeInfo(userId, {
        customerId: "temp-customer-id",
        subscriptionId: "temp-subscription-id",
      });

      // Simplified response
      res.json({
        success: true,
        message:
          "Subscription mock success - payment processing to be implemented",
        status: "premium",
      });
    } catch (error) {
      console.error("Error creating subscription:", error);
      res.status(500).json({ message: "Failed to create subscription" });
    }
  });

  app.post("/api/create-book-order", async (req: Request, res: Response) => {
    try {
      const { userId, bookId, copies, coverType, shippingAddress } = req.body;

      if (!userId || !bookId || !shippingAddress) {
        return res.status(400).json({
          message: "User ID, book ID, and shipping address are required",
        });
      }

      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      const book = await storage.getBook(bookId);
      if (!book) {
        return res.status(404).json({ message: "Book not found" });
      }

      // Calculate order amount based on options
      let basePrice = 2999; // $29.99 base price

      // Add cost for premium cover
      if (coverType === "hardcover") {
        basePrice += 1000; // $10 extra for hardcover
      }

      // Calculate total (multiply by copies)
      const amount = basePrice * (copies || 1);

      // Apply discount for premium users
      const discountedAmount =
        user.subscription === "premium"
          ? Math.round(amount * 0.85) // 15% discount
          : amount;

      // Create order record
      const order = await storage.createOrder({
        userId,
        bookId,
        amount: discountedAmount,
        currency: "usd",
        copies: copies || 1,
        coverType: coverType || "softcover",
        shippingAddress,
        status: "pending",
      });

      res.json({
        orderId: order.id,
        success: true,
        message:
          "Order created successfully - payment processing to be implemented",
        amount: discountedAmount,
        clientSecret: `sk_test_order_${order.id}`, // Mock client secret for simplified payment approach
      });
    } catch (error) {
      console.error("Error creating book order:", error);
      res.status(500).json({ message: "Failed to create book order" });
    }
  });

  // This is a placeholder for future payment webhook integration
  app.post("/api/payment-webhook", async (req: Request, res: Response) => {
    // In a real app, this would process payment provider webhooks
    // For now, just return a success response
    res.json({
      received: true,
      message: "Payment webhook endpoint - implementation pending",
    });
  });

  // Image upload endpoint
  app.post(
    "/api/upload-image",
    upload.single("image"),
    async (req: Request, res: Response) => {
      try {
        console.log("Upload-image endpoint called");

        if (!req.file) {
          console.error("No file provided in request");
          return res.status(400).json({ message: "No image file provided" });
        }

        console.log("File received:", req.file);

        const userId = req.body.userId;
        if (!userId) {
          console.error("No userId provided in request");
          return res.status(400).json({ message: "User ID is required" });
        }

        console.log(`Processing image upload for user ${userId}`);

        try {
          // Create uploads directory if it doesn't exist
          const uploadDir = path.join(process.cwd(), "uploads");
          if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
          }

          // Get the uploaded file details
          const filePath = req.file.path;
          const fileName = req.file.filename;

          console.log(`File saved at: ${filePath}`);

          // Generate URL for the uploaded file - use port 8000 instead of 5000
          const serverHost = req.get("host") || "localhost:8000";
          const protocol = req.protocol || "http";
          const imageUrl = `${protocol}://${serverHost}/uploads/${fileName}`;

          console.log(`Image URL generated: ${imageUrl}`);

          // Return success response with the image URL
          return res.status(200).json({
            success: true,
            imageUrl,
            message: "Image uploaded successfully",
          });
        } catch (error) {
          console.error("Error processing image:", error);

          // Clean up the uploaded file if it exists
          if (req.file && fs.existsSync(req.file.path)) {
            fs.unlinkSync(req.file.path);
          }

          return res.status(500).json({ message: "Failed to process image" });
        }
      } catch (error) {
        console.error("Error in upload-image endpoint:", error);

        // Clean up the uploaded file if it exists
        if (req.file && fs.existsSync(req.file.path)) {
          fs.unlinkSync(req.file.path);
        }

        return res.status(500).json({ message: "Failed to upload image" });
      }
    }
  );

  // Audio Upload Endpoint
  app.post(
    "/api/upload-audio",
    upload.single("audio"),
    async (req: Request, res: Response) => {
      try {
        if (!req.file) {
          console.error("No audio file provided");
          return res.status(400).json({ message: "No audio file provided" });
        }

        console.log("Audio file received:", req.file);

        const userId = req.body.userId;
        if (!userId) {
          console.error("No userId provided in request");
          return res.status(400).json({ message: "User ID is required" });
        }

        console.log(`Processing audio upload for user ${userId}`);

        try {
          // Create uploads directory if it doesn't exist
          const uploadDir = path.join(process.cwd(), "uploads");
          if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
          }

          // Get the uploaded file details
          const filePath = req.file.path;
          const fileName = req.file.filename;

          console.log(`File saved at: ${filePath}`);

          // Generate URL for the uploaded file
          const serverHost = req.get("host") || "localhost:8000";
          const protocol = req.protocol || "http";
          const audioUrl = `${protocol}://${serverHost}/uploads/${fileName}`;

          console.log(`Audio URL generated: ${audioUrl}`);

          // Return success response with the audio URL
          return res.status(200).json({
            success: true,
            audioUrl,
            message: "Audio uploaded successfully",
          });
        } catch (error) {
          console.error("Error processing audio:", error);

          // Clean up the uploaded file if it exists
          if (req.file && fs.existsSync(req.file.path)) {
            fs.unlinkSync(req.file.path);
          }

          return res.status(500).json({ message: "Failed to process audio" });
        }
      } catch (error) {
        console.error("Error in upload-audio endpoint:", error);

        // Clean up the uploaded file if it exists
        if (req.file && fs.existsSync(req.file.path)) {
          fs.unlinkSync(req.file.path);
        }

        return res.status(500).json({ message: "Failed to upload audio" });
      }
    }
  );

  // Add static file serving for uploads directory
  app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));

  const httpServer = createServer(app);
  return httpServer;
}
