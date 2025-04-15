import { Card, CardContent } from '@/components/ui/card';
import { Link } from 'wouter';
import { Button } from '@/components/ui/button';

interface MemoryBookProps {
  book: {
    id: string;
    title: string;
    coverUrl?: string;
    storiesCount: number;
    photosCount: number;
    status: 'complete' | 'in_progress';
    createdAt: { toDate: () => Date } | Date;
  };
}

const MemoryBookCard = ({ book }: MemoryBookProps) => {
  // Convert Firestore timestamp to JS Date if needed
  const createdAt = book.createdAt instanceof Date 
    ? book.createdAt 
    : book.createdAt.toDate();
  
  const formattedDate = createdAt.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
  
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
            <span className="font-['Playfair_Display'] text-2xl text-primary/50">{book.title}</span>
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent flex items-end">
          <div className="p-4 text-white">
            <h3 className="font-['Playfair_Display'] font-bold text-xl">{book.title}</h3>
            <p className="text-sm opacity-90">{book.storiesCount} stories • {book.photosCount} photos</p>
          </div>
        </div>
      </div>
      
      <CardContent className="p-4 text-center">
        <div className="flex justify-between items-center mb-4">
          <span className="text-xs font-medium text-neutral-500">Created on {formattedDate}</span>
          <span className={`text-xs font-medium ${book.status === 'complete' ? 'text-green-500' : 'text-amber-500'}`}>
            {book.status === 'complete' ? 'Complete' : 'In Progress'}
          </span>
        </div>
        
        <div className="grid grid-cols-2 gap-3">
          <Button asChild>
            <Link href={`/memory-books/${book.id}`}>
              {book.status === 'complete' ? 'View Book' : 'Edit Book'}
            </Link>
          </Button>
          
          <Button 
            variant="outline" 
            asChild
            disabled={book.status !== 'complete'}
            className={book.status !== 'complete' ? 'opacity-50 cursor-not-allowed' : ''}
          >
            <Link href={book.status === 'complete' ? `/order-book/${book.id}` : '#'}>
              Order Print
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default MemoryBookCard;
