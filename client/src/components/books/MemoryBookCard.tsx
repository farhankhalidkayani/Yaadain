import { Card, CardContent } from "@/components/ui/card";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { generateBookPDF } from "@/lib/pdfUtils";
import { getBook, getUserMemories } from "@/lib/firebase";
import { FileDown } from "lucide-react";

interface MemoryBookProps {
  book: {
    id: string;
    title: string;
    description?: string;
    coverUrl?: string;
    status?: string;
    memories?: any[];
    createdAt: any;
    updatedAt?: any;
  };
}

const MemoryBookCard = ({ book }: MemoryBookProps) => {
  const [isDownloading, setIsDownloading] = useState(false);
  const { toast } = useToast();

  // Convert various timestamp formats to JS Date
  let createdAt: Date;
  if (book.createdAt instanceof Date) {
    createdAt = book.createdAt;
  } else if (
    book.createdAt &&
    typeof book.createdAt === "object" &&
    book.createdAt.toDate &&
    typeof book.createdAt.toDate === "function"
  ) {
    // Handle Firestore Timestamp
    createdAt = book.createdAt.toDate();
  } else if (book.createdAt && typeof book.createdAt.seconds === "number") {
    // Handle Firestore Timestamp-like object with seconds
    createdAt = new Date(book.createdAt.seconds * 1000);
  } else if (book.createdAt && typeof book.createdAt === "string") {
    // Handle ISO string
    createdAt = new Date(book.createdAt);
  } else {
    // Fallback
    createdAt = new Date();
    console.warn("Unknown date format for book:", book.id);
  }

  const formattedDate = createdAt.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  // Calculate counts
  const storiesCount = book.memories?.length || 0;
  const photosCount =
    book.memories?.filter((memory) => memory.imageUrl).length || 0;

  const handleDownloadPdf = async (e: React.MouseEvent) => {
    e.preventDefault();

    if (!book || isDownloading) return;

    setIsDownloading(true);

    try {
      toast({
        title: "Preparing PDF",
        description: "Please wait while we generate your memory book PDF...",
      });

      // Need to fetch full book data and memories
      const fullBook = await getBook(book.id);
      if (!fullBook) {
        throw new Error("Failed to load book details");
      }

      // Get memories for this book
      const allMemories = await getUserMemories(fullBook.userId);
      const bookMemoryIds =
        fullBook.memories?.map((memory: any) => memory.id) || [];
      const bookMemories = allMemories.filter((memory: any) =>
        bookMemoryIds.includes(memory.id)
      );

      if (bookMemories.length === 0) {
        throw new Error("This book has no memories to download");
      }

      await generateBookPDF(fullBook, bookMemories);

      toast({
        title: "Success",
        description: "Your memory book PDF has been downloaded!",
      });
    } catch (error) {
      console.error("Error generating PDF:", error);
      toast({
        title: "Error",
        description:
          typeof error === "string"
            ? error
            : "Failed to generate PDF. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <Card className="bg-white rounded-lg shadow-lg border border-neutral-100 transform transition hover:-translate-y-1 hover:shadow-xl overflow-hidden">
      <div className="relative">
        {book.coverUrl ? (
          <img
            src={book.coverUrl}
            alt={`${book.title} cover`}
            className="w-full h-48 object-cover"
          />
        ) : (
          <div className="w-full h-48 bg-gradient-to-r from-primary/20 to-secondary/20 flex items-center justify-center">
            <span className="font-['Playfair_Display'] text-2xl text-primary/50">
              {book.title}
            </span>
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent flex items-end">
          <div className="p-4 text-white">
            <h3 className="font-['Playfair_Display'] font-bold text-xl">
              {book.title}
            </h3>
            <p className="text-sm opacity-90">
              {storiesCount} stories • {photosCount} photos
            </p>
          </div>
        </div>
      </div>

      <CardContent className="p-4 text-center">
        <div className="flex justify-between items-center mb-4">
          <span className="text-xs font-medium text-neutral-500">
            Created on {formattedDate}
          </span>
          <span
            className={`text-xs font-medium ${
              book.status === "complete" ? "text-green-500" : "text-amber-500"
            }`}
          >
            {book.status === "complete" ? "Complete" : "In Progress"}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Button asChild>
            <Link href={`/memory-books/${book.id}`}>
              {book.status === "complete" ? "View Book" : "Edit Book"}
            </Link>
          </Button>

          <Button
            variant="outline"
            onClick={handleDownloadPdf}
            disabled={isDownloading}
            className={
              isDownloading
                ? "opacity-50 cursor-not-allowed"
                : "text-primary hover:text-primary-dark border-primary hover:border-primary-dark"
            }
          >
            {isDownloading ? (
              "Downloading..."
            ) : (
              <>
                <FileDown className="h-4 w-4 mr-2" />
                Download PDF
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default MemoryBookCard;
