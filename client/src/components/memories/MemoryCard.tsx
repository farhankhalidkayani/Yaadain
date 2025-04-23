import { Link } from "wouter";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar, Edit, Book, Trash2, Play } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface MemoryCardProps {
  memory: {
    id: string;
    title: string;
    text: string;
    imageUrl?: string;
    audioUrl?: string;
    createdAt: any; // More flexible typing for createdAt
  };
  onDelete?: (id: string) => void;
}

const MemoryCard = ({ memory, onDelete }: MemoryCardProps) => {
  const handlePlayAudio = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (memory.audioUrl) {
      const audio = new Audio(memory.audioUrl);
      audio.play();
    }
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (onDelete) {
      onDelete(memory.id);
    }
  };

  // Convert various timestamp formats to JS Date
  let createdAt: Date;
  if (memory.createdAt instanceof Date) {
    createdAt = memory.createdAt;
  } else if (
    memory.createdAt &&
    typeof memory.createdAt === "object" &&
    memory.createdAt.toDate &&
    typeof memory.createdAt.toDate === "function"
  ) {
    // Handle Firestore Timestamp
    createdAt = memory.createdAt.toDate();
  } else if (memory.createdAt && typeof memory.createdAt.seconds === "number") {
    // Handle Firestore Timestamp-like object with seconds
    createdAt = new Date(memory.createdAt.seconds * 1000);
  } else if (memory.createdAt && typeof memory.createdAt === "string") {
    // Handle ISO string
    createdAt = new Date(memory.createdAt);
  } else {
    // Fallback
    createdAt = new Date();
    console.warn("Unknown date format for memory:", memory.id);
  }

  const formattedDate = createdAt.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  const timeAgo = formatDistanceToNow(createdAt, { addSuffix: true });

  return (
    <Link href={`/stories/${memory.id}`}>
      <Card className="bg-white rounded-lg shadow-lg transform transition hover:-translate-y-1 hover:shadow-xl cursor-pointer overflow-hidden group">
        <div className="relative">
          {memory.imageUrl ? (
            <img
              src={memory.imageUrl}
              alt={memory.title}
              className="w-full h-48 object-cover"
            />
          ) : (
            <div className="w-full h-48 bg-gradient-to-r from-primary/10 to-secondary/10 flex items-center justify-center">
              <Book className="h-12 w-12 text-primary/30" />
            </div>
          )}
          <div className="absolute top-3 right-3">
            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-white bg-opacity-75 text-neutral-700">
              <Calendar className="h-3 w-3 mr-1" />
              {formattedDate}
            </span>
          </div>
        </div>

        <div className="p-4">
          <h3 className="font-['Playfair_Display'] font-bold text-lg mb-2">
            {memory.title}
          </h3>
          <p className="text-neutral-700 text-sm line-clamp-3 mb-3">
            {memory.text}
          </p>

          <div className="flex justify-between items-center">
            <div className="flex space-x-2">
              <Button
                variant="ghost"
                size="icon"
                className="text-neutral-500 hover:text-primary transition-colors"
                asChild
              >
                <Link href={`/stories/${memory.id}/edit`}>
                  <Edit className="h-5 w-5" />
                </Link>
              </Button>

              <Button
                variant="ghost"
                size="icon"
                className="text-neutral-500 hover:text-primary transition-colors"
                onClick={handleDelete}
              >
                <Trash2 className="h-5 w-5" />
              </Button>
            </div>

            {memory.audioUrl && (
              <Button
                variant="outline"
                size="sm"
                className="text-xs px-3 py-1 bg-primary/10 text-primary font-medium rounded-full hover:bg-primary/20 transition-colors border-0"
                onClick={handlePlayAudio}
              >
                <Play className="h-3 w-3 mr-1" />
                Listen
              </Button>
            )}
          </div>
        </div>
      </Card>
    </Link>
  );
};

export default MemoryCard;
