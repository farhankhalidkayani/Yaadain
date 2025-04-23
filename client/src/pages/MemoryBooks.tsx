import { useState, useEffect } from 'react';
import { Link } from 'wouter';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import MemoryBookCard from '@/components/books/MemoryBookCard';
import { Button } from '@/components/ui/button';
import { getUserBooks } from '@/lib/firebase';
import { getAuth } from 'firebase/auth';
import { useToast } from '@/hooks/use-toast';
import { Plus } from 'lucide-react';

const MemoryBooks = () => {
  const [books, setBooks] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [userProfile, setUserProfile] = useState<any>(null);
  
  const auth = getAuth();
  const { toast } = useToast();
  
  useEffect(() => {
    const fetchBooks = async () => {
      if (auth.currentUser) {
        try {
          setIsLoading(true);
          const fetchedBooks = await getUserBooks(auth.currentUser.uid);
          setBooks(fetchedBooks);
        } catch (error) {
          console.error('Error fetching books:', error);
          toast({
            title: 'Error',
            description: 'Failed to load your memory books. Please try again.',
            variant: 'destructive',
          });
        } finally {
          setIsLoading(false);
        }
      }
    };
    
    fetchBooks();
  }, [auth.currentUser, toast]);
  
  const canCreateNewBook = userProfile?.subscription === 'premium' || books.length < 3;
  
  return (
    <div className="min-h-screen flex flex-col bg-[#FDFBF8] bg-[url('https://www.transparenttextures.com/patterns/paper.png')] bg-fixed">
      <Header />
      
      <main className="flex-grow">
        <div className="container mx-auto px-4 py-6">
          <div className="mb-8">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
              <h1 className="text-3xl font-['Playfair_Display'] font-bold text-neutral-900">My Memory Books</h1>
              
              <Button asChild disabled={!canCreateNewBook}>
                <Link href="/create-book">
                  <Plus className="h-4 w-4 mr-2" />
                  Create New Book
                </Link>
              </Button>
            </div>
            
            {!canCreateNewBook && (
              <div className="bg-amber-50 border border-amber-200 rounded-md p-4 mb-6">
                <p className="text-amber-800 text-sm">
                  Free users are limited to 3 memory books. <Link href="/subscribe" className="text-primary font-medium">Upgrade to Premium</Link> for unlimited books.
                </p>
              </div>
            )}
          </div>
          
          {isLoading ? (
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
              )}
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow-md p-8 text-center">
              <p className="text-neutral-600 mb-4">You haven't created any memory books yet.</p>
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
