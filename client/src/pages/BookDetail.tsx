import { useState, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  getBook,
  updateBook,
  getUserMemories,
  addMemoryToBook,
  removeMemoryFromBook,
  uploadImage,
  getCurrentUser,
} from "@/lib/firebase";
import { useToast } from "@/hooks/use-toast";
import {
  ArrowLeft,
  BookOpen,
  Edit,
  ShoppingCart,
  Check,
  Plus,
  Image as ImageIcon,
  Trash2,
  RefreshCcw,
} from "lucide-react";

const BookDetail = () => {
  const { id } = useParams();
  const [_, navigate] = useLocation();
  const [book, setBook] = useState<any>(null);
  const [bookMemories, setBookMemories] = useState<any[]>([]);
  const [availableMemories, setAvailableMemories] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editedTitle, setEditedTitle] = useState("");
  const [editedDescription, setEditedDescription] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isAddMemoryDialogOpen, setIsAddMemoryDialogOpen] = useState(false);
  const [selectedMemoryIds, setSelectedMemoryIds] = useState<string[]>([]);

  const { toast } = useToast();

  const fetchBookDetails = async () => {
    if (!id) return;

    try {
      setIsLoading(true);
      setIsError(false);

      const user = getCurrentUser();
      if (!user) {
        toast({
          title: "Authentication Required",
          description: "Please log in to view book details",
          variant: "destructive",
        });
        navigate("/login");
        return;
      }

      const fetchedBook = await getBook(id);

      if (!fetchedBook) {
        toast({
          title: "Error",
          description: "Book not found",
          variant: "destructive",
        });
        navigate("/memory-books");
        return;
      }

      console.log("Book data received:", fetchedBook);
      setBook(fetchedBook);
      setEditedTitle(fetchedBook.title || "");
      setEditedDescription(fetchedBook.description || "");

      try {
        const memories = await getUserMemories(fetchedBook.userId);
        console.log(`Retrieved ${memories.length} memories for user`);

        const bookMemoryIds =
          fetchedBook.memories?.map((memory: any) => memory.id) || [];
        interface Memory {
          id: string;
          title: string;
          text: string;
          userId: string;
          createdAt: Date;
        }

        const memoriesInBook: Memory[] = memories.filter((memory: Memory) =>
          bookMemoryIds.includes(memory.id)
        );
        interface Memory {
          id: string;
          title: string;
          text: string;
          userId: string;
          createdAt: Date;
        }

        const memoriesNotInBook: Memory[] = memories.filter(
          (memory: Memory) => !bookMemoryIds.includes(memory.id)
        );

        setBookMemories(memoriesInBook);
        setAvailableMemories(memoriesNotInBook);
      } catch (memoriesError) {
        console.error("Error fetching memories:", memoriesError);
        toast({
          title: "Warning",
          description:
            "Unable to load all memories. Some data may be incomplete.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error fetching book details:", error);
      setIsError(true);
      toast({
        title: "Error",
        description: "Failed to load book details. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchBookDetails();
  }, [id, navigate, toast]);

  const handleSaveBookDetails = async () => {
    if (!book) return;

    setIsSaving(true);

    try {
      await updateBook(book.id, {
        title: editedTitle,
        description: editedDescription,
      });

      setBook({
        ...book,
        title: editedTitle,
        description: editedDescription,
      });

      setIsEditing(false);

      toast({
        title: "Success",
        description: "Book details updated successfully",
      });
    } catch (error) {
      console.error("Error updating book:", error);
      toast({
        title: "Error",
        description: "Failed to update book details. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleCoverImageUpload = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    if (!book || !e.target.files || e.target.files.length === 0) return;

    const file = e.target.files[0];

    setIsUploading(true);

    try {
      const imageUrl = await uploadImage(file);

      await updateBook(book.id, {
        coverUrl: imageUrl,
      });

      setBook({
        ...book,
        coverUrl: imageUrl,
      });

      toast({
        title: "Success",
        description: "Cover image uploaded successfully",
      });
    } catch (error) {
      console.error("Error uploading cover image:", error);
      toast({
        title: "Error",
        description: "Failed to upload cover image. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleAddMemoriesToBook = async () => {
    if (!book || selectedMemoryIds.length === 0) return;

    try {
      const addPromises = selectedMemoryIds.map(async (memoryId) => {
        const memory = availableMemories.find((m) => m.id === memoryId);
        if (memory) {
          await addMemoryToBook(book.id, memoryId);
          return memory;
        }
        return null;
      });

      const addedMemories = (await Promise.all(addPromises)).filter(Boolean);

      setBookMemories([...bookMemories, ...addedMemories]);
      setAvailableMemories(
        availableMemories.filter(
          (memory) => !selectedMemoryIds.includes(memory.id)
        )
      );
      setSelectedMemoryIds([]);
      setIsAddMemoryDialogOpen(false);

      toast({
        title: "Success",
        description: `Added ${addedMemories.length} ${
          addedMemories.length === 1 ? "memory" : "memories"
        } to your book`,
      });
    } catch (error) {
      console.error("Error adding memories to book:", error);
      toast({
        title: "Error",
        description: "Failed to add memories to book. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleRemoveMemoryFromBook = async (memoryId: string) => {
    if (!book) return;

    try {
      await removeMemoryFromBook(book.id, memoryId);

      const removedMemory = bookMemories.find((m) => m.id === memoryId);
      if (removedMemory) {
        setBookMemories(bookMemories.filter((m) => m.id !== memoryId));
        setAvailableMemories([...availableMemories, removedMemory]);
      }

      toast({
        title: "Success",
        description: "Memory removed from book",
      });
    } catch (error) {
      console.error("Error removing memory from book:", error);
      toast({
        title: "Error",
        description: "Failed to remove memory from book. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleCompleteBook = async () => {
    if (!book) return;

    try {
      await updateBook(book.id, {
        status: "complete",
      });

      setBook({
        ...book,
        status: "complete",
      });

      toast({
        title: "Success",
        description:
          "Book marked as complete! You can now order a printed copy.",
      });
    } catch (error) {
      console.error("Error completing book:", error);
      toast({
        title: "Error",
        description: "Failed to complete book. Please try again.",
        variant: "destructive",
      });
    }
  };

  const formatDateSafe = (dateValue: any): string => {
    try {
      if (dateValue instanceof Date) {
        return dateValue.toLocaleDateString("en-US", {
          month: "long",
          day: "numeric",
          year: "numeric",
        });
      }

      if (dateValue && typeof dateValue.toDate === "function") {
        return dateValue.toDate().toLocaleDateString("en-US", {
          month: "long",
          day: "numeric",
          year: "numeric",
        });
      }

      if (typeof dateValue === "string") {
        return new Date(dateValue).toLocaleDateString("en-US", {
          month: "long",
          day: "numeric",
          year: "numeric",
        });
      }

      return new Date().toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
      });
    } catch (e) {
      console.error("Error formatting date:", e);
      return "Unknown date";
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col bg-[#FDFBF8] bg-[url('https://www.transparenttextures.com/patterns/paper.png')] bg-fixed">
        <Header />
        <div className="flex-grow flex items-center justify-center">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
        </div>
        <Footer />
      </div>
    );
  }

  if (isError || !book) {
    return (
      <div className="min-h-screen flex flex-col bg-[#FDFBF8] bg-[url('https://www.transparenttextures.com/patterns/paper.png')] bg-fixed">
        <Header />
        <div className="flex-grow flex items-center justify-center">
          <div className="text-center bg-white p-8 rounded-lg shadow-md max-w-md">
            <h2 className="text-2xl font-bold mb-4">
              Unable to Load Book Details
            </h2>
            <p className="text-neutral-500 mb-6">
              There was a problem loading this memory book. It may have been
              deleted or you might not have permission to view it.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button onClick={fetchBookDetails} className="mb-2 sm:mb-0">
                <RefreshCcw className="h-4 w-4 mr-2" />
                Try Again
              </Button>
              <Button variant="outline" asChild>
                <a href="/memory-books">Go back to memory books</a>
              </Button>
            </div>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  const formattedDate = formatDateSafe(book.createdAt);

  return (
    <div className="min-h-screen flex flex-col bg-[#FDFBF8] bg-[url('https://www.transparenttextures.com/patterns/paper.png')] bg-fixed">
      <Header />

      <main className="flex-grow">
        <div className="container mx-auto px-4 py-6">
          <div className="mb-6">
            <Button
              variant="ghost"
              onClick={() => navigate("/memory-books")}
              className="mb-4"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Memory Books
            </Button>

            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
              {isEditing ? (
                <div className="w-full md:w-3/4 mb-4 md:mb-0 space-y-4">
                  <div>
                    <Label htmlFor="title" className="mb-2 block">
                      Title
                    </Label>
                    <Input
                      id="title"
                      value={editedTitle}
                      onChange={(e) => setEditedTitle(e.target.value)}
                      className="text-2xl font-['Playfair_Display'] font-bold"
                    />
                  </div>
                  <div>
                    <Label htmlFor="description" className="mb-2 block">
                      Description
                    </Label>
                    <Textarea
                      id="description"
                      value={editedDescription}
                      onChange={(e) => setEditedDescription(e.target.value)}
                      className="min-h-[100px]"
                    />
                  </div>
                </div>
              ) : (
                <div>
                  <h1 className="text-3xl font-['Playfair_Display'] font-bold text-neutral-900 mb-2">
                    {book.title}
                  </h1>
                  {book.description && (
                    <p className="text-neutral-700">{book.description}</p>
                  )}
                </div>
              )}

              <div className="flex space-x-2 mt-4 md:mt-0">
                {isEditing ? (
                  <>
                    <Button onClick={handleSaveBookDetails} disabled={isSaving}>
                      {isSaving ? "Saving..." : "Save Details"}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => setIsEditing(false)}
                    >
                      Cancel
                    </Button>
                  </>
                ) : (
                  <>
                    <Button
                      variant="outline"
                      onClick={() => setIsEditing(true)}
                    >
                      <Edit className="h-4 w-4 mr-2" />
                      Edit Details
                    </Button>

                    {book.status === "complete" ? (
                      <Button asChild>
                        <a href={`/order-book/${book.id}`}>
                          <ShoppingCart className="h-4 w-4 mr-2" />
                          Order Print
                        </a>
                      </Button>
                    ) : (
                      <Button
                        disabled={bookMemories.length === 0}
                        onClick={handleCompleteBook}
                        variant="default"
                      >
                        <Check className="h-4 w-4 mr-2" />
                        Mark as Complete
                      </Button>
                    )}
                  </>
                )}
              </div>
            </div>

            <div className="flex flex-wrap gap-4 text-sm text-neutral-500 mb-6">
              <div className="flex items-center">
                <BookOpen className="h-4 w-4 mr-1" />
                {formattedDate}
              </div>
              <div>
                <span
                  className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold ${
                    book.status === "complete"
                      ? "bg-green-100 text-green-700"
                      : "bg-amber-100 text-amber-700"
                  }`}
                >
                  {book.status === "complete" ? "Complete" : "In Progress"}
                </span>
              </div>
              <div>
                {bookMemories.length}{" "}
                {bookMemories.length === 1 ? "story" : "stories"}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="md:col-span-1">
              <Card className="overflow-hidden bg-white border border-neutral-100 shadow-lg rounded-lg">
                <CardContent className="p-0">
                  {book.coverUrl ? (
                    <img
                      src={book.coverUrl}
                      alt={book.title}
                      className="w-full h-auto object-cover"
                    />
                  ) : (
                    <div className="bg-gradient-to-r from-primary/20 to-secondary/20 h-64 flex flex-col items-center justify-center">
                      <BookOpen className="h-16 w-16 text-primary/30 mb-4" />
                      <p className="text-neutral-500 text-sm">No cover image</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              <div className="mt-4">
                <label className="cursor-pointer w-full">
                  <Button
                    variant="outline"
                    className="w-full"
                    disabled={isUploading}
                  >
                    <ImageIcon className="h-4 w-4 mr-2" />
                    {isUploading
                      ? "Uploading..."
                      : book.coverUrl
                      ? "Change Cover"
                      : "Add Cover"}
                  </Button>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleCoverImageUpload}
                    disabled={isUploading}
                  />
                </label>
              </div>
            </div>

            <div className="md:col-span-3">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-['Playfair_Display'] font-bold">
                  Book Contents
                </h2>

                {book.status !== "complete" && (
                  <Button
                    variant="outline"
                    onClick={() => setIsAddMemoryDialogOpen(true)}
                    disabled={availableMemories.length === 0}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Memories
                  </Button>
                )}
              </div>

              {bookMemories.length > 0 ? (
                <div className="space-y-4">
                  {bookMemories.map((memory, index) => (
                    <Card
                      key={memory.id}
                      className="bg-white border border-neutral-100 shadow-sm"
                    >
                      <CardContent className="p-4">
                        <div className="flex justify-between">
                          <div className="flex items-center space-x-4">
                            <div className="bg-primary/10 h-12 w-12 rounded-full flex items-center justify-center">
                              <span className="text-primary font-bold">
                                {index + 1}
                              </span>
                            </div>
                            <div>
                              <h3 className="font-bold text-neutral-900">
                                {memory.title}
                              </h3>
                              <p className="text-sm text-neutral-500 line-clamp-1">
                                {memory.text}
                              </p>
                            </div>
                          </div>

                          {book.status !== "complete" && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-neutral-500 hover:text-red-500"
                              onClick={() =>
                                handleRemoveMemoryFromBook(memory.id)
                              }
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <Card className="bg-white border border-neutral-100 shadow-sm">
                  <CardContent className="p-6 text-center">
                    <BookOpen className="h-12 w-12 text-neutral-300 mx-auto mb-4" />
                    <h3 className="font-medium text-neutral-700 mb-2">
                      No stories added yet
                    </h3>
                    <p className="text-neutral-500 text-sm mb-4">
                      Add some of your memories to create your book.
                    </p>

                    <Button
                      onClick={() => setIsAddMemoryDialogOpen(true)}
                      disabled={availableMemories.length === 0}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add Memories
                    </Button>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </div>
      </main>

      <Footer />

      <Dialog
        open={isAddMemoryDialogOpen}
        onOpenChange={setIsAddMemoryDialogOpen}
      >
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Add Memories to Book</DialogTitle>
          </DialogHeader>

          {availableMemories.length > 0 ? (
            <div className="max-h-[60vh] overflow-y-auto">
              <div className="space-y-2">
                {availableMemories.map((memory) => (
                  <div
                    key={memory.id}
                    className={`p-3 border rounded-md cursor-pointer ${
                      selectedMemoryIds.includes(memory.id)
                        ? "border-primary bg-primary/5"
                        : "border-neutral-200 hover:border-primary"
                    }`}
                    onClick={() => {
                      if (selectedMemoryIds.includes(memory.id)) {
                        setSelectedMemoryIds(
                          selectedMemoryIds.filter((id) => id !== memory.id)
                        );
                      } else {
                        setSelectedMemoryIds([...selectedMemoryIds, memory.id]);
                      }
                    }}
                  >
                    <div className="flex items-start">
                      <div
                        className={`w-5 h-5 rounded-full border flex-shrink-0 mr-3 flex items-center justify-center ${
                          selectedMemoryIds.includes(memory.id)
                            ? "bg-primary border-primary"
                            : "border-neutral-300"
                        }`}
                      >
                        {selectedMemoryIds.includes(memory.id) && (
                          <Check className="h-3 w-3 text-white" />
                        )}
                      </div>
                      <div>
                        <h3 className="font-medium text-neutral-900">
                          {memory.title}
                        </h3>
                        <p className="text-sm text-neutral-500 line-clamp-2 mt-1">
                          {memory.text}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="text-center py-6">
              <p className="text-neutral-500">
                You don't have any additional memories to add. Create more
                memories first!
              </p>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsAddMemoryDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleAddMemoriesToBook}
              disabled={selectedMemoryIds.length === 0}
            >
              Add {selectedMemoryIds.length}{" "}
              {selectedMemoryIds.length === 1 ? "Memory" : "Memories"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default BookDetail;
