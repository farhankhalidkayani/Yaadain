import { 
  users, 
  memories, 
  books, 
  bookMemories, 
  orders,
  type User, 
  type InsertUser, 
  type Memory, 
  type InsertMemory,
  type Book,
  type InsertBook,
  type BookMemory,
  type InsertBookMemory,
  type Order,
  type InsertOrder
} from "@shared/schema";

// Interface for storage methods
export interface IStorage {
  // User methods
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserByFirebaseId(firebaseId: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, data: Partial<User>): Promise<User | undefined>;
  updateStripeCustomerId(id: number, customerId: string): Promise<User | undefined>;
  updateUserStripeInfo(id: number, data: { customerId: string, subscriptionId: string }): Promise<User | undefined>;
  
  // Memory methods
  getMemory(id: number): Promise<Memory | undefined>;
  getUserMemories(userId: number): Promise<Memory[]>;
  createMemory(memory: InsertMemory): Promise<Memory>;
  updateMemory(id: number, data: Partial<Memory>): Promise<Memory | undefined>;
  deleteMemory(id: number): Promise<boolean>;
  
  // Book methods
  getBook(id: number): Promise<Book | undefined>;
  getUserBooks(userId: number): Promise<Book[]>;
  createBook(book: InsertBook): Promise<Book>;
  updateBook(id: number, data: Partial<Book>): Promise<Book | undefined>;
  deleteBook(id: number): Promise<boolean>;
  
  // BookMemory methods
  getBookMemories(bookId: number): Promise<BookMemory[]>;
  addMemoryToBook(bookMemory: InsertBookMemory): Promise<BookMemory>;
  removeMemoryFromBook(bookId: number, memoryId: number): Promise<boolean>;
  
  // Order methods
  getOrder(id: number): Promise<Order | undefined>;
  getUserOrders(userId: number): Promise<Order[]>;
  createOrder(order: InsertOrder): Promise<Order>;
  updateOrder(id: number, data: Partial<Order>): Promise<Order | undefined>;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private memories: Map<number, Memory>;
  private books: Map<number, Book>;
  private bookMemories: Map<number, BookMemory>;
  private orders: Map<number, Order>;
  
  private userId: number = 1;
  private memoryId: number = 1;
  private bookId: number = 1;
  private bookMemoryId: number = 1;
  private orderId: number = 1;
  
  constructor() {
    this.users = new Map();
    this.memories = new Map();
    this.books = new Map();
    this.bookMemories = new Map();
    this.orders = new Map();
  }
  
  // User methods
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }
  
  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }
  
  async getUserByEmail(email: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.email === email,
    );
  }
  
  async getUserByFirebaseId(firebaseId: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.firebaseId === firebaseId,
    );
  }
  
  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.userId++;
    const createdAt = new Date();
    const user: User = { ...insertUser, id, createdAt };
    this.users.set(id, user);
    return user;
  }
  
  async updateUser(id: number, data: Partial<User>): Promise<User | undefined> {
    const user = this.users.get(id);
    if (!user) return undefined;
    
    const updatedUser = { ...user, ...data };
    this.users.set(id, updatedUser);
    return updatedUser;
  }
  
  async updateStripeCustomerId(id: number, customerId: string): Promise<User | undefined> {
    const user = this.users.get(id);
    if (!user) return undefined;
    
    const updatedUser = { ...user, stripeCustomerId: customerId };
    this.users.set(id, updatedUser);
    return updatedUser;
  }
  
  async updateUserStripeInfo(id: number, data: { customerId: string, subscriptionId: string }): Promise<User | undefined> {
    const user = this.users.get(id);
    if (!user) return undefined;
    
    const updatedUser = { 
      ...user, 
      stripeCustomerId: data.customerId, 
      stripeSubscriptionId: data.subscriptionId,
      subscription: 'premium'
    };
    this.users.set(id, updatedUser);
    return updatedUser;
  }
  
  // Memory methods
  async getMemory(id: number): Promise<Memory | undefined> {
    return this.memories.get(id);
  }
  
  async getUserMemories(userId: number): Promise<Memory[]> {
    return Array.from(this.memories.values()).filter(
      (memory) => memory.userId === userId,
    );
  }
  
  async createMemory(insertMemory: InsertMemory): Promise<Memory> {
    const id = this.memoryId++;
    const createdAt = new Date();
    const updatedAt = new Date();
    const memory: Memory = { ...insertMemory, id, createdAt, updatedAt };
    this.memories.set(id, memory);
    return memory;
  }
  
  async updateMemory(id: number, data: Partial<Memory>): Promise<Memory | undefined> {
    const memory = this.memories.get(id);
    if (!memory) return undefined;
    
    const updatedMemory = { ...memory, ...data, updatedAt: new Date() };
    this.memories.set(id, updatedMemory);
    return updatedMemory;
  }
  
  async deleteMemory(id: number): Promise<boolean> {
    return this.memories.delete(id);
  }
  
  // Book methods
  async getBook(id: number): Promise<Book | undefined> {
    return this.books.get(id);
  }
  
  async getUserBooks(userId: number): Promise<Book[]> {
    return Array.from(this.books.values()).filter(
      (book) => book.userId === userId,
    );
  }
  
  async createBook(insertBook: InsertBook): Promise<Book> {
    const id = this.bookId++;
    const createdAt = new Date();
    const updatedAt = new Date();
    const book: Book = { 
      ...insertBook, 
      id, 
      createdAt, 
      updatedAt,
      storiesCount: 0,
      photosCount: 0
    };
    this.books.set(id, book);
    return book;
  }
  
  async updateBook(id: number, data: Partial<Book>): Promise<Book | undefined> {
    const book = this.books.get(id);
    if (!book) return undefined;
    
    const updatedBook = { ...book, ...data, updatedAt: new Date() };
    this.books.set(id, updatedBook);
    return updatedBook;
  }
  
  async deleteBook(id: number): Promise<boolean> {
    // Delete all book memories associated with this book
    const bookMemoriesToDelete = Array.from(this.bookMemories.values()).filter(
      (bookMemory) => bookMemory.bookId === id,
    );
    
    for (const bookMemory of bookMemoriesToDelete) {
      this.bookMemories.delete(bookMemory.id);
    }
    
    return this.books.delete(id);
  }
  
  // BookMemory methods
  async getBookMemories(bookId: number): Promise<BookMemory[]> {
    return Array.from(this.bookMemories.values()).filter(
      (bookMemory) => bookMemory.bookId === bookId,
    );
  }
  
  async addMemoryToBook(insertBookMemory: InsertBookMemory): Promise<BookMemory> {
    const id = this.bookMemoryId++;
    const bookMemory: BookMemory = { ...insertBookMemory, id };
    this.bookMemories.set(id, bookMemory);
    
    // Update the storiesCount for the book
    const book = this.books.get(insertBookMemory.bookId);
    if (book) {
      this.books.set(book.id, {
        ...book,
        storiesCount: book.storiesCount + 1,
        updatedAt: new Date()
      });
    }
    
    return bookMemory;
  }
  
  async removeMemoryFromBook(bookId: number, memoryId: number): Promise<boolean> {
    const bookMemoryToDelete = Array.from(this.bookMemories.values()).find(
      (bookMemory) => bookMemory.bookId === bookId && bookMemory.memoryId === memoryId,
    );
    
    if (!bookMemoryToDelete) return false;
    
    const deleted = this.bookMemories.delete(bookMemoryToDelete.id);
    
    // Update the storiesCount for the book
    if (deleted) {
      const book = this.books.get(bookId);
      if (book) {
        this.books.set(book.id, {
          ...book,
          storiesCount: Math.max(0, book.storiesCount - 1),
          updatedAt: new Date()
        });
      }
    }
    
    return deleted;
  }
  
  // Order methods
  async getOrder(id: number): Promise<Order | undefined> {
    return this.orders.get(id);
  }
  
  async getUserOrders(userId: number): Promise<Order[]> {
    return Array.from(this.orders.values()).filter(
      (order) => order.userId === userId,
    );
  }
  
  async createOrder(insertOrder: InsertOrder): Promise<Order> {
    const id = this.orderId++;
    const createdAt = new Date();
    const updatedAt = new Date();
    const order: Order = { ...insertOrder, id, createdAt, updatedAt };
    this.orders.set(id, order);
    return order;
  }
  
  async updateOrder(id: number, data: Partial<Order>): Promise<Order | undefined> {
    const order = this.orders.get(id);
    if (!order) return undefined;
    
    const updatedOrder = { ...order, ...data, updatedAt: new Date() };
    this.orders.set(id, updatedOrder);
    return updatedOrder;
  }
}

export const storage = new MemStorage();
