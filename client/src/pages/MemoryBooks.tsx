import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import MemoryBookCard from "@/components/books/MemoryBookCard";
import { Button } from "@/components/ui/button";
import { getUserBooks, getUserProfile, getCurrentUser } from "@/lib/firebase";
import { useToast } from "@/hooks/use-toast";
import { Plus, RefreshCcw } from "lucide-react";

const MemoryBooks = () => {
  const [books, setBooks] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [location] = useLocation();
  const { toast } = useToast();

  const fetchBooks = async () => {
    const user = getCurrentUser();
    if (!user) {
      toast({
        title: "Authentication Required",
        description: "Please log in to view your memory books.",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsLoading(true);
      setIsError(false);

      // Fetch user profile and books in parallel
      const [profile, fetchedBooks] = await Promise.all([
        getUserProfile(user.uid),
        getUserBooks(user.uid),
      ]);

      setUserProfile(profile);
      setBooks(fetchedBooks || []);

      console.log(`Loaded ${fetchedBooks?.length || 0} memory books`);
    } catch (error) {
      console.error("Error fetching books:", error);
      setIsError(true);
      toast({
        title: "Error",
        description: "Failed to load your memory books. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch books when component mounts and when location changes
  useEffect(() => {
    // Only fetch when we're on the memory books page
    if (location === "/memory-books") {
      fetchBooks();
    }
  }, [location]);

  const canCreateNewBook =
    userProfile?.subscription === "premium" || (books && books.length < 3);

  return (
    <div className="min-h-screen flex flex-col bg-[#FDFBF8] bg-[url('https://www.transparenttextures.com/patterns/paper.png')] bg-fixed">
      <Header />

      <main className="flex-grow">
        <div className="container mx-auto px-4 py-6">
          <div className="mb-8">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
              <h1 className="text-3xl font-['Playfair_Display'] font-bold text-neutral-900">
                My Memory Books
              </h1>

              <div className="flex gap-2 mt-3 md:mt-0">
                {isError && (
                  <Button
                    variant="outline"
                    onClick={fetchBooks}
                    className="flex items-center"
                  >
                    <RefreshCcw className="h-4 w-4 mr-2" />
                    Retry
                  </Button>
                )}

                <Button asChild disabled={!canCreateNewBook}>
                  <Link href="/create-book">
                    <Plus className="h-4 w-4 mr-2" />
                    Create New Book
                  </Link>
                </Button>
              </div>
            </div>

            {!canCreateNewBook && (
              <div className="bg-amber-50 border border-amber-200 rounded-md p-4 mb-6">
                <p className="text-amber-800 text-sm">
                  Free users are limited to 3 memory books.{" "}
                  <Link href="/subscribe" className="text-primary font-medium">
                    Upgrade to Premium
                  </Link>{" "}
                  for unlimited books.
                </p>
              </div>
            )}
          </div>

          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="bg-white rounded-lg shadow-md h-80 animate-pulse"
                >
                  <div className="w-full h-48 bg-neutral-100"></div>
                  <div className="p-4">
                    <div className="flex justify-between mb-4">
                      <div className="h-3 bg-neutral-100 rounded w-1/3"></div>
                      <div className="h-3 bg-neutral-100 rounded w-1/4"></div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="h-8 bg-neutral-100 rounded"></div>
                      <div className="h-8 bg-neutral-100 rounded"></div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : isError ? (
            <div className="bg-red-50 border border-red-200 rounded-lg p-8 text-center">
              <p className="text-red-600 mb-4">
                Unable to load your memory books.
              </p>
              <p className="text-sm text-red-500 mb-6">
                There was a problem connecting to the server. Please check your
                network connection and try again.
              </p>
              <Button onClick={fetchBooks}>
                <RefreshCcw className="h-4 w-4 mr-2" />
                Try Again
              </Button>
            </div>
          ) : books.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {books.map((book) => (
                <MemoryBookCard key={book.id} book={book} />
              ))}

              {canCreateNewBook && (
                <div className="bg-white rounded-lg shadow-md border border-dashed border-primary-light transform transition hover:-translate-y-1 hover:shadow-lg flex flex-col items-center justify-center p-8 h-full">
                  <div className="bg-primary-light/20 p-4 rounded-full mb-4">
                    <Plus className="h-8 w-8 text-primary" />
                  </div>

                  <h3 className="font-['Playfair_Display'] font-bold text-lg mb-2 text-center">
                    Create a New Memory Book
                  </h3>
                  <p className="text-neutral-500 text-sm text-center mb-4">
                    Compile your favorite stories into a beautiful memory book.
                  </p>

                  <Button asChild>
                    <Link href="/create-book">Get Started</Link>
                  </Button>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow-md p-8 text-center">
              <p className="text-neutral-600 mb-4">
                You haven't created any memory books yet.
              </p>
              <p className="text-sm text-neutral-400 mb-6">
                Create your first memory book to compile your favorite stories.
              </p>
              <Button asChild>
                <Link href="/create-book">
                  <Plus className="h-4 w-4 mr-2" />
                  Create Your First Memory Book
                </Link>
              </Button>
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default MemoryBooks;
