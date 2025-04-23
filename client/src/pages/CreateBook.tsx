import { useState } from "react";
import { useLocation } from "wouter";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import {
  addBook,
  getCurrentUser,
  getUserProfile,
  uploadImage,
} from "@/lib/firebase";
import { ArrowLeft, BookOpen, Upload } from "lucide-react";

const CreateBook = () => {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [coverImage, setCoverImage] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const [_, navigate] = useLocation();
  const { toast } = useToast();

  const handleCoverImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;

    const file = e.target.files[0];
    setCoverImage(file);

    // Create a preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setCoverPreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim()) {
      toast({
        title: "Error",
        description: "Please enter a title for your memory book",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      const user = getCurrentUser();
      if (!user) {
        throw new Error("You must be logged in to create a memory book");
      }

      // Check if user is allowed to create a new book (premium or less than 3 books)
      const userProfile = await getUserProfile(user.uid);
      if (
        userProfile &&
        userProfile.subscription !== "premium" &&
        userProfile.booksCount >= 3
      ) {
        toast({
          title: "Limit Reached",
          description:
            "Free users can only create up to 3 memory books. Please upgrade to premium for unlimited books.",
          variant: "destructive",
        });
        setIsLoading(false);
        return;
      }

      // Create new book data
      const bookData = {
        title,
        description: description.trim() ? description : null,
        status: "in_progress",
        userId: user.uid,
        memories: [], // Explicitly initialize memories as empty array
      };

      // If cover image is provided, upload it first
      let coverUrl = null;
      if (coverImage) {
        try {
          console.log("Uploading cover image...");
          // Use the uploadImage function from firebase.ts instead of direct fetch
          coverUrl = await uploadImage(coverImage);
          console.log("Image upload successful, URL:", coverUrl);
        } catch (uploadError) {
          console.error("Error during image upload:", uploadError);
          throw new Error(
            "Failed to upload cover image: " +
              (uploadError instanceof Error
                ? uploadError.message
                : "Unknown error")
          );
        }
      }

      console.log("Creating book with data:", { ...bookData, coverUrl });

      // Add the book with or without cover
      try {
        const bookId = await addBook({
          ...bookData,
          coverUrl,
        });

        console.log("Book created successfully with ID:", bookId);

        toast({
          title: "Success",
          description: "Memory book created successfully!",
        });

        // Make sure bookId is a string before navigating
        if (bookId && typeof bookId === "string") {
          console.log("Navigating to:", `/memory-books/${bookId}`);
          navigate(`/memory-books/${bookId}`);
        } else {
          console.error("Invalid bookId returned:", bookId);
          throw new Error("Failed to get a valid book ID");
        }
      } catch (bookError) {
        console.error("Error in addBook operation:", bookError);
        throw new Error(
          "Failed to create book: " +
            (bookError instanceof Error ? bookError.message : "Unknown error")
        );
      }
    } catch (error) {
      console.error("Error creating memory book:", error);
      toast({
        title: "Error",
        description: `Failed to create memory book: ${
          error instanceof Error ? error.message : "Please try again"
        }`,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#FDFBF8] bg-[url('https://www.transparenttextures.com/patterns/paper.png')] bg-fixed">
      <Header />

      <main className="flex-grow">
        <div className="container mx-auto px-4 py-6">
          <Button
            variant="ghost"
            onClick={() => navigate("/memory-books")}
            className="mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Memory Books
          </Button>

          <div className="mb-6">
            <h1 className="text-3xl font-['Playfair_Display'] font-bold text-neutral-900">
              Create a New Memory Book
            </h1>
            <p className="text-neutral-700 mt-1">
              Compile your favorite memories into a beautiful book
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Left Column - Cover Preview */}
            <div className="md:col-span-1">
              <Card className="overflow-hidden bg-white border border-neutral-100 shadow-lg rounded-lg">
                <CardContent className="p-0">
                  {coverPreview ? (
                    <img
                      src={coverPreview}
                      alt="Book Cover Preview"
                      className="w-full h-auto object-cover"
                    />
                  ) : (
                    <div className="bg-gradient-to-r from-primary/20 to-secondary/20 h-64 flex flex-col items-center justify-center">
                      <BookOpen className="h-16 w-16 text-primary/30 mb-4" />
                      <p className="text-neutral-500 text-sm">Cover Preview</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              <div className="mt-4">
                <Label htmlFor="cover-image" className="mb-2 block">
                  Book Cover (Optional)
                </Label>
                <label className="cursor-pointer">
                  <div className="bg-white border border-dashed border-neutral-300 rounded-md p-6 flex flex-col items-center justify-center">
                    <Upload className="h-8 w-8 text-neutral-400 mb-2" />
                    <p className="text-sm text-neutral-500 text-center mb-1">
                      {coverImage
                        ? coverImage.name
                        : "Click to upload a cover image"}
                    </p>
                    <p className="text-xs text-neutral-400 text-center">
                      JPG, PNG or JPEG (max. 5MB)
                    </p>
                  </div>
                  <input
                    id="cover-image"
                    type="file"
                    className="hidden"
                    accept="image/jpeg,image/png,image/jpg"
                    onChange={handleCoverImageChange}
                  />
                </label>
              </div>
            </div>

            {/* Right Column - Book Details Form */}
            <div className="md:col-span-2">
              <Card className="bg-white border border-neutral-100 shadow-md">
                <CardContent className="p-6">
                  <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="space-y-2">
                      <Label htmlFor="title" className="text-lg">
                        Book Title
                      </Label>
                      <Input
                        id="title"
                        placeholder="My Summer Memories"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        className="text-lg"
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="description" className="text-lg">
                        Description (Optional)
                      </Label>
                      <Textarea
                        id="description"
                        placeholder="A collection of memories from our family vacation..."
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        className="min-h-[120px]"
                      />
                    </div>

                    <div className="pt-4">
                      <p className="text-neutral-500 text-sm mb-6">
                        After creating your book, you'll be able to add memories
                        to it and organize them in any order.
                      </p>

                      <div className="flex justify-end">
                        <Button
                          type="button"
                          variant="outline"
                          className="mr-2"
                          onClick={() => navigate("/memory-books")}
                        >
                          Cancel
                        </Button>
                        <Button type="submit" disabled={isLoading}>
                          {isLoading ? "Creating..." : "Create Memory Book"}
                        </Button>
                      </div>
                    </div>
                  </form>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default CreateBook;
