import { useState, useEffect } from 'react';
import { Link } from 'wouter';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import DashboardStats from '@/components/dashboard/DashboardStats';
import VoiceRecorder from '@/components/recorder/VoiceRecorder';
import MemoryCard from '@/components/memories/MemoryCard';
import MemoryBookCard from '@/components/books/MemoryBookCard';
import UpgradeModal from '@/components/subscription/UpgradeModal';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { getUserProfile, getUserMemories, getUserBooks, addMemory, enhanceStory } from '@/lib/firebase';
import { getAuth } from 'firebase/auth';
import { useToast } from '@/hooks/use-toast';

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
          console.error('Error fetching user profile:', error);
          toast({
            title: 'Error',
            description: 'Failed to load your profile. Please refresh the page.',
            variant: 'destructive',
          });
        } finally {
          setIsLoadingProfile(false);
        }
      }
    };
    
    const fetchRecentMemories = async () => {
      if (auth.currentUser) {
        try {
          const memories = await getUserMemories(auth.currentUser.uid, 3);
          setRecentMemories(memories);
        } catch (error) {
          console.error('Error fetching memories:', error);
          toast({
            title: 'Error',
            description: 'Failed to load your memories. Please refresh the page.',
            variant: 'destructive',
          });
        } finally {
          setIsLoadingMemories(false);
        }
      }
    };
    
    const fetchMemoryBooks = async () => {
      if (auth.currentUser) {
        try {
          const books = await getUserBooks(auth.currentUser.uid);
          setMemoryBooks(books);
        } catch (error) {
          console.error('Error fetching memory books:', error);
          toast({
            title: 'Error',
            description: 'Failed to load your memory books. Please refresh the page.',
            variant: 'destructive',
          });
        } finally {
          setIsLoadingBooks(false);
        }
      }
    };
    
    fetchUserProfile();
    fetchRecentMemories();
    fetchMemoryBooks();
  }, [auth.currentUser, toast]);
  
  const handleRecordingComplete = async (data: { audioUrl: string, text: string }) => {
    if (!auth.currentUser) return;
    
    setIsProcessingRecording(true);
    
    try {
      // Get enhanced text from OpenAI
      const enhancedResult = await enhanceStory(data.text);
      
      // Create a new memory with the audio URL and enhanced text
      const memoryData = {
        title: enhancedResult.enhancedText.split('\n')[0] || 'New Memory',
        text: enhancedResult.enhancedText,
        audioUrl: data.audio,
        originalText: data.text,
        createdAt: new Date()
      };
      
      await addMemory(memoryData);
      
      toast({
        title: 'Success!',
        description: 'Your memory has been saved and enhanced.',
      });
      
      // Refresh the memories list
      const memories = await getUserMemories(auth.currentUser.uid, 3);
      setRecentMemories(memories);
    } catch (error) {
      console.error('Error saving memory:', error);
      toast({
        title: 'Error',
        description: 'Failed to save your memory. Please try again.',
        variant: 'destructive',
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
                <h1 className="text-3xl md:text-4xl font-['Playfair_Display'] font-bold text-neutral-900">Your Dashboard</h1>
                <p className="text-neutral-700 mt-1">Capture your memories one story at a time</p>
              </div>
              
              {/* Subscription Badge */}
              {!isLoadingProfile && userProfile && (
                <div className="mt-4 md:mt-0 flex items-center bg-neutral-50 border border-neutral-100 rounded-full px-4 py-2">
                  <span className="text-xs uppercase tracking-wide font-semibold text-neutral-500 mr-2">
                    {userProfile.subscription === 'premium' ? 'Premium Plan' : 'Free Plan'}
                  </span>
                  
                  {userProfile.subscription !== 'premium' && (
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
              <h2 className="text-2xl font-['Playfair_Display'] font-bold mb-4">Record a New Memory</h2>
              
              <div className="max-w-2xl">
                <p className="text-neutral-700 mb-6">
                  Just click record and start talking. Share a memory, a thought, or a story you want to preserve. 
                  We'll convert it into text that you can edit, enhance, and save.
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
              <h2 className="text-2xl font-['Playfair_Display'] font-bold">Your Recent Memories</h2>
              <Link href="/stories" className="text-primary hover:text-primary-dark text-sm font-medium transition-colors">
                View All
              </Link>
            </div>
            
            {isLoadingMemories ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="bg-white rounded-lg shadow-md h-80 animate-pulse">
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
                <p className="text-neutral-500 mb-4">You haven't created any memories yet.</p>
                <p className="text-sm text-neutral-400 mb-6">
                  Record your first memory to get started. Your memories will appear here.
                </p>
              </div>
            )}
          </div>
          
          {/* Memory Books Section */}
          <div>
            <div className="flex justify-between items-baseline mb-6">
              <h2 className="text-2xl font-['Playfair_Display'] font-bold">Your Memory Books</h2>
              <Link href="/memory-books" className="text-primary hover:text-primary-dark text-sm font-medium transition-colors">
                Manage Books
              </Link>
            </div>
            
            {isLoadingBooks ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="bg-white rounded-lg shadow-md h-80 animate-pulse">
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
                  
                  <h3 className="font-['Playfair_Display'] font-bold text-lg mb-2 text-center">Create a New Memory Book</h3>
                  <p className="text-neutral-500 text-sm text-center mb-4">
                    Compile your favorite stories into a beautiful memory book.
                  </p>
                  
                  <Button asChild>
                    <Link href="/create-book">
                      Get Started
                    </Link>
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
