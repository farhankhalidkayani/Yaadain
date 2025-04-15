import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Mic, Book, Image } from 'lucide-react';
import { getUserProfile } from '@/lib/firebase';
import { getAuth } from 'firebase/auth';

const DashboardStats = () => {
  const [stats, setStats] = useState({
    recordings: 0,
    stories: 0,
    photos: 0
  });
  const [loading, setLoading] = useState(true);
  const auth = getAuth();
  
  useEffect(() => {
    const fetchUserStats = async () => {
      if (auth.currentUser) {
        try {
          const userProfile = await getUserProfile(auth.currentUser.uid);
          if (userProfile) {
            setStats({
              recordings: userProfile.storiesCount || 0,
              stories: userProfile.storiesCount || 0,
              photos: userProfile.photosCount || 0
            });
          }
        } catch (error) {
          console.error("Error fetching user stats:", error);
        } finally {
          setLoading(false);
        }
      }
    };
    
    fetchUserStats();
  }, [auth.currentUser]);
  
  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="bg-white rounded-lg shadow-sm border border-neutral-100">
            <CardContent className="p-4">
              <div className="flex items-center">
                <div className="bg-primary-light/20 p-3 rounded-full animate-pulse">
                  <div className="h-6 w-6 bg-primary-light/50 rounded-full"></div>
                </div>
                <div className="ml-4">
                  <div className="h-4 w-24 bg-neutral-100 rounded animate-pulse"></div>
                  <div className="h-6 w-12 bg-neutral-100 rounded mt-2 animate-pulse"></div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }
  
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
      <Card className="bg-white rounded-lg shadow-sm border border-neutral-100">
        <CardContent className="p-4">
          <div className="flex items-center">
            <div className="bg-primary-light/20 p-3 rounded-full">
              <Mic className="h-6 w-6 text-primary" />
            </div>
            <div className="ml-4">
              <h3 className="text-neutral-500 text-sm font-medium">Voice Recordings</h3>
              <p className="text-2xl font-bold">{stats.recordings}</p>
            </div>
          </div>
        </CardContent>
      </Card>
      
      <Card className="bg-white rounded-lg shadow-sm border border-neutral-100">
        <CardContent className="p-4">
          <div className="flex items-center">
            <div className="bg-secondary-light/20 p-3 rounded-full">
              <Book className="h-6 w-6 text-secondary-dark" />
            </div>
            <div className="ml-4">
              <h3 className="text-neutral-500 text-sm font-medium">Stories Written</h3>
              <p className="text-2xl font-bold">{stats.stories}</p>
            </div>
          </div>
        </CardContent>
      </Card>
      
      <Card className="bg-white rounded-lg shadow-sm border border-neutral-100">
        <CardContent className="p-4">
          <div className="flex items-center">
            <div className="bg-accent-light/20 p-3 rounded-full">
              <Image className="h-6 w-6 text-accent-dark" />
            </div>
            <div className="ml-4">
              <h3 className="text-neutral-500 text-sm font-medium">Photos Added</h3>
              <p className="text-2xl font-bold">{stats.photos}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default DashboardStats;
