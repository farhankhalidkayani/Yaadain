import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import multer from "multer";
import path from "path";
import OpenAI from "openai";
import * as fs from "fs";

// Configure OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || "sk-your-api-key",
});

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
      cb(null, file.fieldname + "-" + uniqueSuffix + path.extname(file.originalname));
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
        return res.status(400).json({ message: "User with this email already exists" });
      }
      
      // Create new user
      const user = await storage.createUser({
        username,
        email,
        password,
        displayName,
        firebaseId,
        subscription: "free"
      });
      
      res.status(201).json({ user: { id: user.id, username: user.username, email: user.email } });
    } catch (error) {
      console.error("Error registering user:", error);
      res.status(500).json({ message: "Failed to register user" });
    }
  });

  // Memory endpoints
  app.get("/api/memories", async (req: Request, res: Response) => {
    try {
      const userId = Number(req.query.userId);
      if (!userId) {
        return res.status(400).json({ message: "User ID is required" });
      }
      
      const memories = await storage.getUserMemories(userId);
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
      const { userId, title, text, originalText, audioUrl, imageUrl } = req.body;
      
      if (!userId || !title || !text) {
        return res.status(400).json({ message: "User ID, title, and text are required" });
      }
      
      const memory = await storage.createMemory({
        userId,
        title,
        text,
        originalText,
        audioUrl,
        imageUrl
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
        imageUrl
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
      const userId = Number(req.query.userId);
      if (!userId) {
        return res.status(400).json({ message: "User ID is required" });
      }
      
      const books = await storage.getUserBooks(userId);
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
        memories: memories.filter(Boolean).sort((a, b) => a.order - b.order)
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
        return res.status(400).json({ message: "User ID and title are required" });
      }
      
      // Check if user is allowed to create a new book (premium users or free users with < 3 books)
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      const userBooks = await storage.getUserBooks(userId);
      if (user.subscription !== "premium" && userBooks.length >= 3) {
        return res.status(403).json({ 
          message: "Free users are limited to 3 memory books. Please upgrade to premium."
        });
      }
      
      const book = await storage.createBook({
        userId,
        title,
        description,
        coverUrl,
        status
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
        status
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
  app.post("/api/books/:bookId/memories", async (req: Request, res: Response) => {
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
        order: order || 0
      });
      
      res.status(201).json(bookMemory);
    } catch (error) {
      console.error("Error adding memory to book:", error);
      res.status(500).json({ message: "Failed to add memory to book" });
    }
  });
  
  app.delete("/api/books/:bookId/memories/:memoryId", async (req: Request, res: Response) => {
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
  });
  
  // OpenAI integration endpoints
  app.post("/api/transcribe-audio", upload.single("audio"), async (req: Request, res: Response) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No audio file provided" });
      }
      
      // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
      const transcription = await openai.audio.transcriptions.create({
        file: fs.createReadStream(req.file.path),
        model: "whisper-1",
      });
      
      // Clean up the uploaded file
      fs.unlinkSync(req.file.path);
      
      res.json({ text: transcription.text });
    } catch (error) {
      console.error("Error transcribing audio:", error);
      
      // Clean up the uploaded file if it exists
      if (req.file && fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
      
      res.status(500).json({ message: "Failed to transcribe audio" });
    }
  });
  
  app.post("/api/enhance-story", async (req: Request, res: Response) => {
    try {
      const { text } = req.body;
      
      if (!text) {
        return res.status(400).json({ message: "Text is required" });
      }
      
      // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: "You are a creative writing assistant that helps enhance personal stories and memories. Your task is to improve the transcribed story while maintaining the original meaning and personal voice. Add details, improve flow, and fix any grammar or structure issues. Format the story with the first line as a good title, followed by paragraphs."
          },
          {
            role: "user",
            content: `Please enhance this transcribed memory: ${text}`
          }
        ],
        max_tokens: 1000
      });
      
      const enhancedText = response.choices[0].message.content;
      
      res.json({ enhancedText });
    } catch (error) {
      console.error("Error enhancing story:", error);
      res.status(500).json({ message: "Failed to enhance story" });
    }
  });
  
  // Stripe payment integration endpoints
  app.post("/api/create-subscription", async (req: Request, res: Response) => {
    try {
      const { userId, email } = req.body;
      
      if (!userId || !email) {
        return res.status(400).json({ message: "User ID and email are required" });
      }
      
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Check if user already has a subscription
      if (user.subscription === "premium") {
        return res.status(400).json({ message: "User already has a premium subscription" });
      }
      
      // For now, instantly upgrade user to premium (in a real app, this would happen after payment)
      await storage.updateUserStripeInfo(userId, {
        customerId: "temp-customer-id",
        subscriptionId: "temp-subscription-id"
      });
      
      // Simplified response
      res.json({
        success: true,
        message: "Subscription mock success - payment processing to be implemented",
        status: "premium"
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
        return res.status(400).json({ message: "User ID, book ID, and shipping address are required" });
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
      const discountedAmount = user.subscription === "premium" 
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
        status: "pending"
      });
      
      res.json({
        orderId: order.id,
        success: true,
        message: "Order created successfully - payment processing to be implemented",
        amount: discountedAmount,
        clientSecret: `sk_test_order_${order.id}` // Mock client secret for simplified payment approach
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
      message: "Payment webhook endpoint - implementation pending"
    });
  });

  const httpServer = createServer(app);
  return httpServer;
}
