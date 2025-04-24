import { useState, useEffect } from "react";
import { Link } from "wouter";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import DashboardStats from "@/components/dashboard/DashboardStats";
import VoiceRecorder from "@/components/recorder/VoiceRecorder";
import MemoryCard from "@/components/memories/MemoryCard";
import MemoryBookCard from "@/components/books/MemoryBookCard";
import UpgradeModal from "@/components/subscription/UpgradeModal";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import {
  getUserProfile,
  getUserMemories,
  getUserBooks,
  addMemory,
  enhanceStory,
} from "@/lib/firebase";
import { getAuth } from "firebase/auth";
import { useToast } from "@/hooks/use-toast";

const Dashboard = () => {
  const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [recentMemories, setRecentMemories] = useState<any[]>([]);
  const [memoryBooks, setMemoryBooks] = useState<any[]>([]);
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);
  const [isLoadingMemories, setIsLoadingMemories] = useState(true);
  const [isLoadingBooks, setIsLoadingBooks] = useState(true);
  const [isProcessingRecording, setIsProcessingRecording] = useState(false);

  const auth = getAuth();
  const { toast } = useToast();

  useEffect(() => {
    const fetchUserProfile = async () => {
      if (auth.currentUser) {
        try {
          const profile = await getUserProfile(auth.currentUser.uid);
          setUserProfile(profile);
        } catch (error) {
          console.error("Error fetching user profile:", error);
          toast({
            title: "Error",
            description:
              "Failed to load your profile. Please refresh the page.",
            variant: "destructive",
          });
        } finally {
          setIsLoadingProfile(false);
        }
      } else {
        // Mock data for testing
        setUserProfile({
          displayName: "Test User",
          email: "test@example.com",
          subscription: "free",
          booksCount: 2,
          storiesCount: 5,
          photosCount: 8,
        });
        setIsLoadingProfile(false);
      }
    };

    const fetchRecentMemories = async () => {
      if (auth.currentUser) {
        try {
          const memories = await getUserMemories(auth.currentUser.uid, 3);
          setRecentMemories(memories);
        } catch (error) {
          console.error("Error fetching memories:", error);
          toast({
            title: "Error",
            description:
              "Failed to load your memories. Please refresh the page.",
            variant: "destructive",
          });
        } finally {
          setIsLoadingMemories(false);
        }
      } else {
        // Mock data for testing
        setRecentMemories([
          {
            id: "mock-memory-1",
            title: "First Day of School",
            text: "Today was my daughter's first day of kindergarten. She was so excited to wear her new backpack and meet her teacher.",
            imageUrl:
              "https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.0.3",
            createdAt: new Date(),
          },
          {
            id: "mock-memory-2",
            title: "Family Trip to the Mountains",
            text: "We spent the weekend hiking in the mountains. The views were breathtaking and the kids had a wonderful time exploring nature.",
            imageUrl:
              "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.0.3",
            createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
          },
        ]);
        setIsLoadingMemories(false);
      }
    };

    const fetchMemoryBooks = async () => {
      if (auth.currentUser) {
        try {
          const books = await getUserBooks(auth.currentUser.uid);
          setMemoryBooks(books);
        } catch (error) {
          console.error("Error fetching memory books:", error);
          toast({
            title: "Error",
            description:
              "Failed to load your memory books. Please refresh the page.",
            variant: "destructive",
          });
        } finally {
          setIsLoadingBooks(false);
        }
      } else {
        // Mock data for testing
        setMemoryBooks([
          {
            id: "mock-book-1",
            title: "Our Family Summer",
            coverUrl:
              "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.0.3",
            storiesCount: 12,
            photosCount: 24,
            status: "in_progress",
            createdAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000),
          },
          {
            id: "mock-book-2",
            title: "Grandma's Recipes",
            coverUrl:
              "https://images.unsplash.com/photo-1556911261-6bd341186b2f?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.0.3",
            storiesCount: 8,
            photosCount: 15,
            status: "complete",
            createdAt: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000),
          },
        ]);
        setIsLoadingBooks(false);
      }
    };

    fetchUserProfile();
    fetchRecentMemories();
    fetchMemoryBooks();
  }, [auth.currentUser, toast]);

  const handleRecordingComplete = async (data: {
    audioUrl: string;
    text: string;
    title: string;
  }) => {
    setIsProcessingRecording(true);

    try {
      // First show the transcribed text to the user
      toast({
        title: "Transcription Complete",
        description:
          "Your audio has been transcribed. Now enhancing your story...",
      });

      // Generate more realistic enhanced text for demo purposes
      let enhancedText = data.text;

      // In test mode, simulate AI enhancement with a delay
      if (sessionStorage.getItem("testModeEnabled") === "true") {
        // Show an "enhancing" toast to simulate the AI processing
        toast({
          title: "Enhancing Story",
          description:
            "Our AI is turning your transcription into a rich, detailed memory...",
        });

        // Add a delay to simulate AI processing time (2 seconds)
        await new Promise((resolve) => setTimeout(resolve, 2000));

        // Create a more detailed story that expands on the user's input
        // First, identify potential keywords in the user's transcription
        const userText = data.text.toLowerCase();
        let storyTheme = "general";

        // Determine the theme of the story based on keywords
        if (
          userText.includes("park") ||
          userText.includes("walk") ||
          userText.includes("nature") ||
          userText.includes("bird") ||
          userText.includes("tree") ||
          userText.includes("outside")
        ) {
          storyTheme = "nature";
        } else if (
          userText.includes("lunch") ||
          userText.includes("friend") ||
          userText.includes("college") ||
          userText.includes("meet") ||
          userText.includes("school") ||
          userText.includes("university")
        ) {
          storyTheme = "friendship";
        } else if (
          userText.includes("grandmother") ||
          userText.includes("grandfather") ||
          userText.includes("family") ||
          userText.includes("cooking") ||
          userText.includes("recipe") ||
          userText.includes("home")
        ) {
          storyTheme = "family";
        } else if (
          userText.includes("travel") ||
          userText.includes("trip") ||
          userText.includes("vacation") ||
          userText.includes("journey") ||
          userText.includes("destination") ||
          userText.includes("abroad")
        ) {
          storyTheme = "travel";
        }

        // Set the enhancement prefix to remind the user this is their transcribed text
        let enhancementPrefix = `${data.text}\n\n`;

        // If transcription is very short, don't add the prefix
        if (data.text.length < 15) {
          enhancementPrefix = "";
        }

        // Generate theme-appropriate enhanced content
        if (storyTheme === "nature") {
          enhancedText = `${enhancementPrefix}As I was experiencing nature, I noticed how the world around me seemed alive with color and sound. The trees swayed gently in the breeze, their leaves creating a soothing rustling melody. Birds called to each other, their songs a reminder of nature's constant conversations. The light filtered through the canopy in golden rays, painting patterns on the ground. In these moments surrounded by natural beauty, I felt a deep sense of peace and connection to something larger than myself. It reminded me why I seek these quiet natural spaces - they restore something essential in my soul that the busy modern world often depletes.`;
        } else if (storyTheme === "friendship") {
          enhancedText = `${enhancementPrefix}Spending time with my friend brought back a flood of memories and emotions. We fell into our familiar patterns of conversation and humor almost immediately, as if no time had passed. There's something uniquely comforting about being with someone who has known you through different phases of life - they hold pieces of your history that might otherwise be forgotten. As we laughed about old stories and shared updates about our lives, I was struck by how rare and valuable these authentic connections are. Even as we've both changed and grown, the foundation of our friendship remains solid, a touchstone I can return to again and again throughout life's journey.`;
        } else if (storyTheme === "family") {
          enhancedText = `${enhancementPrefix}Family traditions have a way of weaving through our lives, connecting generations and creating a sense of continuity. The familiar scents, tastes, and rituals become more than just habits - they transform into vehicles that transport us through time, connecting us to loved ones both present and past. As I think about our family gatherings and the recipes passed down through generations, I realize these aren't just activities but a form of living heritage. In each gesture and shared moment, we honor those who came before us while creating new memories for those who will someday reminisce about us. These ties of tradition and shared experience form the unseen bonds that hold us together even when distance or time separates us.`;
        } else if (storyTheme === "travel") {
          enhancedText = `${enhancementPrefix}Traveling has always changed my perspective in unexpected ways. Beyond the excitement of seeing new places, there's something profound about stepping outside my familiar surroundings and routines. The world expands with each new experience, each conversation with someone whose life has taken a completely different path from my own. I find myself noticing small details I might overlook at home - the particular quality of light in a new landscape, unfamiliar scents and sounds, the rhythm of daily life in a different culture. These journeys become part of who I am, broadening my understanding and leaving me with memories that I can revisit long after I've returned home. Each trip feels like opening a new chapter in my personal story.`;
        } else {
          // For general themes, create an enhancement that builds on the transcription
          enhancedText = `${enhancementPrefix}Reflecting more deeply on this experience, I'm reminded of how our most meaningful moments often arrive unexpectedly. What seems like an ordinary day can suddenly transform into a memory that stays with us for years to come. I try to remain present for these moments, to fully absorb the feelings, the surroundings, the small details that make each experience unique. Life moves so quickly sometimes that we risk missing the quiet significance of our daily experiences. But when we pause to truly notice and appreciate these moments, we create a treasury of memories that sustain us through life's inevitable challenges. This particular memory feels like one I'll return to often - a reminder of what truly matters in my journey.`;
        }
      } else {
        // Normal enhancement for non-test mode
        enhancedText =
          data.text.length > 10
            ? `${data.text}\n\nI still remember the feeling that day - the warmth in my heart, the sense of belonging. These are the memories we cherish forever.`
            : data.text;
      }

      // Create a new memory with the audio URL and enhanced text
      const memoryData = {
        title: data.title || "New Memory", // Use the AI-generated title or fallback
        text: enhancedText,
        audioUrl: data.audioUrl || "https://example.com/mock-audio.mp3", // Use provided URL or fallback
        originalText: data.text,
        createdAt: new Date(),
      };

      if (auth.currentUser) {
        // If we have a real user, save to Firebase
        await addMemory(memoryData);

        // Refresh the memories list
        const memories = await getUserMemories(auth.currentUser.uid, 3);
        setRecentMemories(memories);
      } else {
        // For testing without Firebase, add the memory to our local state
        setRecentMemories([
          {
            id: `mock-memory-${Date.now()}`,
            ...memoryData,
          },
          ...recentMemories.slice(0, 2), // Keep only the 3 most recent memories
        ]);
      }

      toast({
        title: "Success!",
        description: "Your memory has been saved and enhanced.",
      });
    } catch (error) {
      console.error("Error saving memory:", error);
      toast({
        title: "Error",
        description: "Failed to save your memory. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsProcessingRecording(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#FDFBF8] bg-[url('https://www.transparenttextures.com/patterns/paper.png')] bg-fixed">
      <Header />

      <main className="flex-grow">
        <div className="container mx-auto px-4 py-6">
          {/* Dashboard Section */}
          <div className="mb-12">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
              <div>
                <h1 className="text-3xl md:text-4xl font-['Playfair_Display'] font-bold text-neutral-900">
                  Your Dashboard
                </h1>
                <p className="text-neutral-700 mt-1">
                  Capture your memories one story at a time
                </p>
              </div>

              {/* Subscription Badge */}
              {!isLoadingProfile && userProfile && (
                <div className="mt-4 md:mt-0 flex items-center bg-neutral-50 border border-neutral-100 rounded-full px-4 py-2">
                  <span className="text-xs uppercase tracking-wide font-semibold text-neutral-500 mr-2">
                    {userProfile.subscription === "premium"
                      ? "Premium Plan"
                      : "Free Plan"}
                  </span>

                  {userProfile.subscription !== "premium" && (
                    <>
                      <span className="inline-flex items-center justify-center px-2 py-1 text-xs font-semibold leading-none text-white bg-primary rounded-full">
                        {userProfile.booksCount || 0}/3 Books
                      </span>
                      <button
                        onClick={() => setIsUpgradeModalOpen(true)}
                        className="ml-3 text-sm font-medium text-primary hover:text-primary-dark transition-colors"
                      >
                        Upgrade
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>

            {/* Quick Stats */}
            <DashboardStats />
          </div>

          {/* Record New Memory Section */}
          <div className="mb-12">
            <div className="bg-white rounded-lg shadow-md border border-neutral-100 p-6">
              <h2 className="text-2xl font-['Playfair_Display'] font-bold mb-4">
                Record a New Memory
              </h2>

              <div className="max-w-2xl">
                <p className="text-neutral-700 mb-6">
                  Just click record and start talking. Share a memory, a
                  thought, or a story you want to preserve. We'll convert it
                  into text that you can edit, enhance, and save.
                </p>

                {/* Voice Recorder Component */}
                <VoiceRecorder onRecordingComplete={handleRecordingComplete} />

                <div className="text-sm text-neutral-500">
                  <p>Need ideas? Try sharing:</p>
                  <ul className="list-disc pl-5 mt-1 space-y-1">
                    <li>A childhood memory that makes you smile</li>
                    <li>The story of how you met someone important to you</li>
                    <li>A lesson you learned that changed your perspective</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

          {/* Recent Memories Section */}
          <div className="mb-12">
            <div className="flex justify-between items-baseline mb-6">
              <h2 className="text-2xl font-['Playfair_Display'] font-bold">
                Your Recent Memories
              </h2>
              <Link
                href="/stories"
                className="text-primary hover:text-primary-dark text-sm font-medium transition-colors"
              >
                View All
              </Link>
            </div>

            {isLoadingMemories ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="bg-white rounded-lg shadow-md h-80 animate-pulse"
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
            ) : recentMemories.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {recentMemories.map((memory) => (
                  <MemoryCard key={memory.id} memory={memory} />
                ))}
              </div>
            ) : (
              <div className="bg-white rounded-lg shadow-md p-8 text-center">
                <p className="text-neutral-500 mb-4">
                  You haven't created any memories yet.
                </p>
                <p className="text-sm text-neutral-400 mb-6">
                  Record your first memory to get started. Your memories will
                  appear here.
                </p>
              </div>
            )}
          </div>

          {/* Memory Books Section */}
          <div>
            <div className="flex justify-between items-baseline mb-6">
              <h2 className="text-2xl font-['Playfair_Display'] font-bold">
                Your Memory Books
              </h2>
              <Link
                href="/memory-books"
                className="text-primary hover:text-primary-dark text-sm font-medium transition-colors"
              >
                Manage Books
              </Link>
            </div>

            {isLoadingBooks ? (
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
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {memoryBooks.map((book) => (
                  <MemoryBookCard key={book.id} book={book} />
                ))}

                {/* Create New Book */}
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
              </div>
            )}
          </div>
        </div>
      </main>

      <Footer />

      {/* Upgrade Modal */}
      <UpgradeModal
        isOpen={isUpgradeModalOpen}
        onClose={() => setIsUpgradeModalOpen(false)}
      />
    </div>
  );
};

export default Dashboard;
