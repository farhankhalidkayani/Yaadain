import { useState, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import Header from "@/components/layout/Header";

// Define Memory interface here since it's not exported from firebase.ts
export interface Memory {
  id: string;
  title: string;
  text: string;
  audioUrl?: string;
  imageUrl?: string;
  createdAt: Date | { toDate(): Date };
  updatedAt?: Date | { toDate(): Date };
  userId: string;
}

import Footer from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import {
  getMemory,
  updateMemory,
  deleteMemory,
  uploadImage,
} from "@/lib/firebase";
import { useToast } from "@/hooks/use-toast";
import {
  ArrowLeft,
  Calendar,
  ImageIcon,
  Save,
  Trash2,
  Play,
} from "lucide-react";

const StoryDetail = () => {
  const { id } = useParams();
  const [_, navigate] = useLocation();
  const [memory, setMemory] = useState<Memory | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editedTitle, setEditedTitle] = useState("");
  const [editedText, setEditedText] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioPlayer, setAudioPlayer] = useState<HTMLAudioElement | null>(null);

  const { toast } = useToast();

  useEffect(() => {
    const fetchMemory = async () => {
      if (!id) return;

      try {
        setIsLoading(true);
        const fetchedMemory = await getMemory(id);

        if (!fetchedMemory) {
          toast({
            title: "Error",
            description: "Memory not found",
            variant: "destructive",
          });
          navigate("/stories");
          return;
        }

        // Type assertion to ensure fetchedMemory matches the Memory interface
        const typedMemory = fetchedMemory as unknown as Memory;
        setMemory(typedMemory);
        setEditedTitle(typedMemory.title || "");
        setEditedText(typedMemory.text || "");
      } catch (error) {
        console.error("Error fetching memory:", error);
        toast({
          title: "Error",
          description: "Failed to load memory. Please try again.",
          variant: "destructive",
        });
        navigate("/stories");
      } finally {
        setIsLoading(false);
      }
    };

    fetchMemory();
  }, [id, navigate, toast]);

  const handlePlayAudio = () => {
    if (!memory?.audioUrl) {
      toast({
        title: "No Audio",
        description: "This memory does not have an audio recording.",
        variant: "destructive",
      });
      return;
    }

    try {
      if (isPlaying && audioPlayer) {
        // If already playing, pause it
        audioPlayer.pause();
        setIsPlaying(false);
        return;
      }

      // Create a new audio player if one doesn't exist
      const audio = audioPlayer || new Audio(memory.audioUrl);

      // Set up event listeners if this is a new audio player
      if (!audioPlayer) {
        audio.addEventListener("ended", () => setIsPlaying(false));
        audio.addEventListener("error", (e) => {
          console.error("Error playing audio:", e);
          toast({
            title: "Playback Error",
            description:
              "There was a problem playing this audio. The file may be corrupted or unavailable.",
            variant: "destructive",
          });
          setIsPlaying(false);
        });
        setAudioPlayer(audio);
      }

      // Play the audio
      const playPromise = audio.play();

      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            setIsPlaying(true);
          })
          .catch((error) => {
            console.error("Error playing audio:", error);
            toast({
              title: "Playback Error",
              description:
                "Failed to play the recording. The audio may be unavailable.",
              variant: "destructive",
            });
          });
      }
    } catch (error) {
      console.error("Error in audio playback:", error);
      toast({
        title: "Error",
        description: "Failed to play the audio recording.",
        variant: "destructive",
      });
    }
  };

  const handleSave = async () => {
    if (!memory) return;

    setIsSaving(true);

    try {
      await updateMemory(memory.id, {
        title: editedTitle,
        text: editedText,
        updatedAt: new Date(),
      });

      setMemory({
        ...memory,
        title: editedTitle,
        text: editedText,
        updatedAt: new Date(),
      });

      setIsEditing(false);

      toast({
        title: "Success",
        description: "Memory updated successfully",
      });
    } catch (error) {
      console.error("Error updating memory:", error);
      toast({
        title: "Error",
        description: "Failed to update memory. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!memory) return;

    setIsDeleting(true);

    try {
      await deleteMemory(memory.id);
      toast({
        title: "Success",
        description: "Memory deleted successfully",
      });
      navigate("/stories");
    } catch (error) {
      console.error("Error deleting memory:", error);
      toast({
        title: "Error",
        description: "Failed to delete memory. Please try again.",
        variant: "destructive",
      });
      setIsDeleting(false);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!memory || !e.target.files || e.target.files.length === 0) {
      console.log("No memory or no file selected");
      return;
    }

    const file = e.target.files[0];
    console.log(
      "File selected for upload:",
      file.name,
      "Size:",
      file.size,
      "Type:",
      file.type
    );

    setIsUploading(true);
    toast({
      title: "Uploading...",
      description: "Your image is being uploaded",
    });

    try {
      console.log("Starting image upload process");
      const imageUrl = await uploadImage(file);
      console.log("Image uploaded successfully, received URL:", imageUrl);

      console.log("Updating memory with new image URL");
      await updateMemory(memory.id, {
        imageUrl,
        updatedAt: new Date(),
      });

      setMemory({
        ...memory,
        imageUrl,
        updatedAt: new Date(),
      });

      toast({
        title: "Success",
        description: "Image uploaded successfully",
      });
    } catch (error) {
      console.error("Error uploading image:", error);
      toast({
        title: "Error",
        description: "Failed to upload image. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
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

  if (!memory) {
    return (
      <div className="min-h-screen flex flex-col bg-[#FDFBF8] bg-[url('https://www.transparenttextures.com/patterns/paper.png')] bg-fixed">
        <Header />
        <div className="flex-grow flex items-center justify-center">
          <div className="text-center">
            <h2 className="text-2xl font-bold mb-2">Memory not found</h2>
            <p className="text-neutral-500 mb-4">
              The memory you're looking for doesn't exist or was deleted.
            </p>
            <Button asChild>
              <a href="/stories">Go back to stories</a>
            </Button>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  const createdAt =
    memory.createdAt instanceof Date
      ? memory.createdAt
      : (memory.createdAt as { toDate(): Date }).toDate();

  const formattedDate = createdAt.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  return (
    <div className="min-h-screen flex flex-col bg-[#FDFBF8] bg-[url('https://www.transparenttextures.com/patterns/paper.png')] bg-fixed">
      <Header />

      <main className="flex-grow">
        <div className="container mx-auto px-4 py-6">
          <div className="mb-6">
            <Button
              variant="ghost"
              onClick={() => navigate("/stories")}
              className="mb-4"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Stories
            </Button>

            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-4">
              {isEditing ? (
                <div className="w-full md:w-3/4 mb-4 md:mb-0">
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
              ) : (
                <h1 className="text-3xl font-['Playfair_Display'] font-bold text-neutral-900">
                  {memory.title}
                </h1>
              )}

              <div className="flex space-x-2">
                {isEditing ? (
                  <>
                    <Button onClick={handleSave} disabled={isSaving}>
                      <Save className="h-4 w-4 mr-2" />
                      {isSaving ? "Saving..." : "Save"}
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
                      Edit
                    </Button>

                    <Button
                      variant="outline"
                      className="text-red-500 hover:text-red-700 hover:bg-red-50"
                      onClick={handleDelete}
                      disabled={isDeleting}
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      {isDeleting ? "Deleting..." : "Delete"}
                    </Button>
                  </>
                )}
              </div>
            </div>

            <div className="flex flex-wrap gap-4 text-sm text-neutral-500 mb-6">
              <div className="flex items-center">
                <Calendar className="h-4 w-4 mr-1" />
                {formattedDate}
              </div>

              {memory.audioUrl && (
                <Button
                  variant="outline"
                  size="sm"
                  className="text-xs px-3 py-1 h-auto"
                  onClick={handlePlayAudio}
                >
                  <Play className="h-3 w-3 mr-2" />
                  {isPlaying ? "Pause Audio" : "Play Audio"}
                </Button>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {memory.imageUrl ? (
              <div className="md:col-span-1">
                <Card className="overflow-hidden bg-white border border-neutral-100 shadow-lg rounded-lg">
                  <CardContent className="p-0">
                    <img
                      src={memory.imageUrl}
                      alt={memory.title}
                      className="w-full h-auto object-cover"
                    />
                    <div className="p-3 bg-white border-t border-neutral-100">
                      <label className="cursor-pointer w-full">
                        <Button
                          variant="outline"
                          className="w-full"
                          disabled={isUploading}
                        >
                          <ImageIcon className="h-4 w-4 mr-2" />
                          {isUploading ? "Uploading..." : "Change Image"}
                        </Button>
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={handleImageUpload}
                          disabled={isUploading}
                        />
                      </label>
                    </div>
                  </CardContent>
                </Card>
              </div>
            ) : (
              <div className="md:col-span-1">
                <Card className="bg-white border border-neutral-100 shadow-lg rounded-lg">
                  <CardContent className="p-6">
                    <div className="flex flex-col items-center justify-center py-8">
                      <div className="bg-neutral-50 p-4 rounded-full mb-4">
                        <ImageIcon className="h-8 w-8 text-neutral-400" />
                      </div>
                      <h3 className="text-lg font-medium text-neutral-700 mb-2">
                        No Image Added
                      </h3>
                      <p className="text-neutral-500 text-center text-sm mb-4">
                        Add an image to enhance your memory
                      </p>
                      <label htmlFor="image-upload" className="cursor-pointer">
                        <Button
                          variant="outline"
                          type="button"
                          className={isUploading ? "opacity-50" : ""}
                          disabled={isUploading}
                          onClick={() =>
                            document.getElementById("image-upload")?.click()
                          }
                        >
                          <ImageIcon className="h-4 w-4 mr-2" />
                          {isUploading ? "Uploading..." : "Add Image"}
                        </Button>
                        <input
                          id="image-upload"
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={handleImageUpload}
                          disabled={isUploading}
                        />
                      </label>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            <div
              className={`${
                memory.imageUrl ? "md:col-span-2" : "md:col-span-2"
              }`}
            >
              <Card className="bg-white shadow-md border border-neutral-100 overflow-hidden">
                <CardContent className="p-6">
                  {isEditing ? (
                    <div className="space-y-4">
                      <Label htmlFor="content" className="block mb-2">
                        Content
                      </Label>
                      <Textarea
                        id="content"
                        value={editedText}
                        onChange={(e) => setEditedText(e.target.value)}
                        className="min-h-[300px] p-4 font-['Nunito_Sans'] text-neutral-800 leading-relaxed bg-[#FDFBF8] bg-[url('https://www.transparenttextures.com/patterns/lined-paper.png')]"
                      />
                    </div>
                  ) : (
                    <div className="story-paper p-6 font-['Nunito_Sans'] text-neutral-800 leading-relaxed min-h-[300px] rounded-md bg-[#FDFBF8] bg-[url('https://www.transparenttextures.com/patterns/lined-paper.png')]">
                      {memory.text
                        .split("\n")
                        .map((paragraph: string, index: number) => (
                          <p key={index} className="mb-4">
                            {paragraph}
                          </p>
                        ))}
                    </div>
                  )}
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

export default StoryDetail;
