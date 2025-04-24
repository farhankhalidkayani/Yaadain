import { useState, useEffect } from "react";
import { Link } from "wouter";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import MemoryCard from "@/components/memories/MemoryCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getUserMemories, deleteMemory } from "@/lib/firebase";
import { getAuth } from "firebase/auth";
import { useToast } from "@/hooks/use-toast";
import { Search, Plus, Mic } from "lucide-react";

// Function to safely parse dates in various formats
const safeGetDate = (dateValue: any): Date => {
  try {
    // Case 1: Already a Date object
    if (dateValue instanceof Date) {
      return dateValue;
    }

    // Case 2: Firebase Timestamp with toDate() method
    if (dateValue && typeof dateValue.toDate === "function") {
      return dateValue.toDate();
    }

    // Case 3: ISO string or other string format
    if (typeof dateValue === "string") {
      return new Date(dateValue);
    }

    // Case 4: Unix timestamp (number in milliseconds)
    if (typeof dateValue === "number") {
      return new Date(dateValue);
    }

    // Default case: If no valid date can be extracted, return current date
    console.warn("Invalid date format encountered:", dateValue);
    return new Date();
  } catch (error) {
    console.error("Error parsing date:", error, dateValue);
    return new Date(); // Fallback to current date
  }
};

const Stories = () => {
  const [memories, setMemories] = useState<any[]>([]);
  const [filteredMemories, setFilteredMemories] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState("newest");

  const auth = getAuth();
  const { toast } = useToast();

  useEffect(() => {
    const fetchMemories = async () => {
      if (auth.currentUser) {
        try {
          setIsLoading(true);
          const fetchedMemories = await getUserMemories(
            auth.currentUser.uid,
            100
          ); // Fetch up to 100 memories
          setMemories(fetchedMemories);
          setFilteredMemories(fetchedMemories);
        } catch (error) {
          console.error("Error fetching memories:", error);
          toast({
            title: "Error",
            description: "Failed to load your memories. Please try again.",
            variant: "destructive",
          });
        } finally {
          setIsLoading(false);
        }
      }
    };

    fetchMemories();
  }, [auth.currentUser, toast]);

  useEffect(() => {
    // Filter memories based on search query
    let filtered = [...memories];

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (memory) =>
          memory.title.toLowerCase().includes(query) ||
          memory.text.toLowerCase().includes(query)
      );
    }

    // Sort memories
    if (sortBy === "newest") {
      filtered.sort((a, b) => {
        const dateA = safeGetDate(a.createdAt);
        const dateB = safeGetDate(b.createdAt);
        return dateB.getTime() - dateA.getTime();
      });
    } else if (sortBy === "oldest") {
      filtered.sort((a, b) => {
        const dateA = safeGetDate(a.createdAt);
        const dateB = safeGetDate(b.createdAt);
        return dateA.getTime() - dateB.getTime();
      });
    } else if (sortBy === "alphabetical") {
      filtered.sort((a, b) => a.title.localeCompare(b.title));
    }

    setFilteredMemories(filtered);
  }, [memories, searchQuery, sortBy]);

  const handleDeleteMemory = async (id: string) => {
    try {
      await deleteMemory(id);
      setMemories(memories.filter((memory) => memory.id !== id));
      toast({
        title: "Memory Deleted",
        description: "Your memory has been permanently deleted.",
      });
    } catch (error) {
      console.error("Error deleting memory:", error);
      toast({
        title: "Error",
        description: "Failed to delete memory. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#FDFBF8] bg-[url('https://www.transparenttextures.com/patterns/paper.png')] bg-fixed">
      <Header />

      <main className="flex-grow">
        <div className="container mx-auto px-4 py-6">
          <div className="mb-8">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
              <h1 className="text-3xl font-['Playfair_Display'] font-bold text-neutral-900">
                My Stories
              </h1>

              <div className="mt-4 md:mt-0 flex space-x-3">
                <Button asChild>
                  <Link href="/">
                    <Mic className="h-4 w-4 mr-2" />
                    Record New
                  </Link>
                </Button>
                <Button variant="outline" asChild>
                  <Link href="/stories/new">
                    <Plus className="h-4 w-4 mr-2" />
                    Write New
                  </Link>
                </Button>
              </div>
            </div>

            {/* Search and Filters */}
            <div className="flex flex-col md:flex-row gap-4">
              <div className="relative flex-grow">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-neutral-400" />
                <Input
                  placeholder="Search your stories..."
                  className="pl-10"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>

              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-full md:w-[180px]">
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="newest">Newest First</SelectItem>
                  <SelectItem value="oldest">Oldest First</SelectItem>
                  <SelectItem value="alphabetical">Alphabetical</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div
                  key={i}
                  className="bg-white rounded-lg shadow-lg h-80 animate-pulse"
                >
                  <div className="w-full h-48 bg-neutral-100"></div>
                  <div className="p-4">
                    <div className="h-4 bg-neutral-100 rounded w-3/4 mb-3"></div>
                    <div className="h-3 bg-neutral-100 rounded w-full mb-2"></div>
                    <div className="h-3 bg-neutral-100 rounded w-5/6"></div>
                  </div>
                </div>
              ))}
            </div>
          ) : filteredMemories.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredMemories.map((memory) => (
                <MemoryCard
                  key={memory.id}
                  memory={memory}
                  onDelete={handleDeleteMemory}
                />
              ))}
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow-md p-8 text-center">
              {searchQuery ? (
                <>
                  <p className="text-neutral-600 mb-2">
                    No memories found matching "{searchQuery}"
                  </p>
                  <p className="text-sm text-neutral-500">
                    Try a different search term or clear your search
                  </p>
                </>
              ) : (
                <>
                  <p className="text-neutral-600 mb-4">
                    You haven't created any memories yet.
                  </p>
                  <p className="text-sm text-neutral-400 mb-6">
                    Record your first memory to get started. Your memories will
                    appear here.
                  </p>
                  <Button asChild>
                    <Link href="/">
                      <Mic className="h-4 w-4 mr-2" />
                      Record Your First Memory
                    </Link>
                  </Button>
                </>
              )}
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Stories;
