import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { getCurrentUser, getUserProfile, updateUserProfile, logoutUser, uploadImage } from '@/lib/firebase';
import { Sparkles, User, Settings, HelpCircle, Loader2, Camera, LogOut, CreditCard, Check } from 'lucide-react';

const Profile = () => {
  const [location, setLocation] = useLocation();
  const [activeTab, setActiveTab] = useState('profile');
  const [user, setUser] = useState<any>(null);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isConfirmDeleteDialogOpen, setIsConfirmDeleteDialogOpen] = useState(false);
  
  // Form states
  const [displayName, setDisplayName] = useState('');
  const [bio, setBio] = useState('');
  
  const { toast } = useToast();
  
  // Parse query params for active tab
  useEffect(() => {
    const tabFromURL = new URLSearchParams(location.split('?')[1]).get('tab');
    if (tabFromURL && ['profile', 'settings', 'help'].includes(tabFromURL)) {
      setActiveTab(tabFromURL);
    }
  }, [location]);
  
  useEffect(() => {
    const fetchUserData = async () => {
      const currentUser = getCurrentUser();
      if (!currentUser) {
        setLocation('/login');
        return;
      }
      
      try {
        setIsLoading(true);
        const profile = await getUserProfile(currentUser.uid);
        
        setUser(currentUser);
        setUserProfile(profile);
        
        // Initialize form values
        setDisplayName(currentUser.displayName || '');
        setBio(profile?.bio || '');
      } catch (error) {
        console.error('Error fetching user data:', error);
        toast({
          title: 'Error',
          description: 'Failed to load your profile. Please try again.',
          variant: 'destructive',
        });
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchUserData();
  }, [setLocation, toast]);
  
  const handleUpdateProfile = async () => {
    if (!user) return;
    
    setIsSaving(true);
    
    try {
      // Update user profile in Firestore
      await updateUserProfile(user.uid, {
        displayName,
        bio
      });
      
      toast({
        title: 'Profile Updated',
        description: 'Your profile has been successfully updated.',
      });
    } catch (error) {
      console.error('Error updating profile:', error);
      toast({
        title: 'Error',
        description: 'Failed to update your profile. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };
  
  const handleProfilePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!user || !e.target.files || e.target.files.length === 0) return;
    
    const file = e.target.files[0];
    setIsUploading(true);
    
    try {
      const photoURL = await uploadImage(file);
      
      // Update user profile
      await updateUserProfile(user.uid, {
        photoURL
      });
      
      // Update local state
      setUser({
        ...user,
        photoURL
      });
      
      toast({
        title: 'Photo Updated',
        description: 'Your profile photo has been successfully updated.',
      });
    } catch (error) {
      console.error('Error uploading profile photo:', error);
      toast({
        title: 'Error',
        description: 'Failed to upload your profile photo. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsUploading(false);
    }
  };
  
  const handleLogout = async () => {
    try {
      await logoutUser();
      setLocation('/login');
    } catch (error) {
      console.error('Error logging out:', error);
      toast({
        title: 'Error',
        description: 'Failed to log out. Please try again.',
        variant: 'destructive',
      });
    }
  };
  
  const handleDeleteAccount = () => {
    setIsDeleteDialogOpen(true);
  };
  
  const confirmDeleteAccount = async () => {
    setIsConfirmDeleteDialogOpen(false);
    
    // In a real app, you would implement account deletion logic here
    toast({
      title: 'Feature Not Implemented',
      description: 'Account deletion is not implemented in this demo.',
      variant: 'destructive',
    });
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
  
  return (
    <div className="min-h-screen flex flex-col bg-[#FDFBF8] bg-[url('https://www.transparenttextures.com/patterns/paper.png')] bg-fixed">
      <Header />
      
      <main className="flex-grow">
        <div className="container mx-auto px-4 py-6">
          <div className="mb-6">
            <h1 className="text-3xl font-['Playfair_Display'] font-bold text-neutral-900">Your Account</h1>
            <p className="text-neutral-700 mt-1">Manage your profile and preferences</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {/* Left sidebar */}
            <div className="md:col-span-1">
              <Card>
                <CardContent className="p-6">
                  <div className="flex flex-col items-center mb-6">
                    <div className="relative mb-4">
                      <Avatar className="w-24 h-24">
                        <AvatarImage src={user?.photoURL || ''} alt={user?.displayName || 'User'} />
                        <AvatarFallback className="bg-primary/10 text-primary text-lg">
                          {user?.displayName ? user.displayName.charAt(0).toUpperCase() : 'U'}
                        </AvatarFallback>
                      </Avatar>
                      
                      <label className="absolute bottom-0 right-0 rounded-full bg-primary text-white p-1 cursor-pointer">
                        <Camera className="h-4 w-4" />
                        <input 
                          type="file" 
                          className="hidden" 
                          onChange={handleProfilePhotoUpload}
                          accept="image/*"
                          disabled={isUploading}
                        />
                      </label>
                    </div>
                    
                    <h2 className="text-lg font-medium">{user?.displayName || 'User'}</h2>
                    <p className="text-sm text-neutral-500">{user?.email}</p>
                    
                    <div className="mt-2">
                      {userProfile?.subscription === 'premium' ? (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary">
                          <Sparkles className="h-3 w-3 mr-1" />
                          Premium
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-neutral-100 text-neutral-700">
                          Free Plan
                        </span>
                      )}
                    </div>
                  </div>
                  
                  <Tabs value={activeTab} onValueChange={(value) => {
                    setActiveTab(value);
                    setLocation(`/profile?tab=${value}`);
                  }} orientation="vertical" className="w-full">
                    <TabsList className="flex flex-col items-stretch h-auto bg-transparent space-y-1">
                      <TabsTrigger 
                        value="profile" 
                        className="justify-start py-2 px-3 data-[state=active]:bg-primary/10 data-[state=active]:text-primary"
                      >
                        <User className="h-4 w-4 mr-2" />
                        Profile
                      </TabsTrigger>
                      <TabsTrigger 
                        value="settings" 
                        className="justify-start py-2 px-3 data-[state=active]:bg-primary/10 data-[state=active]:text-primary"
                      >
                        <Settings className="h-4 w-4 mr-2" />
                        Settings
                      </TabsTrigger>
                      <TabsTrigger 
                        value="help" 
                        className="justify-start py-2 px-3 data-[state=active]:bg-primary/10 data-[state=active]:text-primary"
                      >
                        <HelpCircle className="h-4 w-4 mr-2" />
                        Help & Support
                      </TabsTrigger>
                    </TabsList>
                  </Tabs>
                  
                  <Separator className="my-4" />
                  
                  <Button 
                    variant="outline" 
                    className="w-full justify-start text-red-500 hover:text-red-600 hover:bg-red-50"
                    onClick={handleLogout}
                  >
                    <LogOut className="h-4 w-4 mr-2" />
                    Log Out
                  </Button>
                </CardContent>
              </Card>
            </div>
            
            {/* Right content area */}
            <div className="md:col-span-3">
              <TabsContent value="profile" className="mt-0">
                <Card>
                  <CardHeader>
                    <CardTitle>Profile Information</CardTitle>
                    <CardDescription>
                      Update your personal information
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="space-y-2">
                      <Label htmlFor="displayName">Display Name</Label>
                      <Input 
                        id="displayName" 
                        value={displayName} 
                        onChange={(e) => setDisplayName(e.target.value)} 
                        placeholder="Your display name"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="email">Email</Label>
                      <Input 
                        id="email" 
                        value={user?.email || ''} 
                        disabled 
                        className="bg-neutral-50"
                      />
                      <p className="text-xs text-neutral-500">Email cannot be changed</p>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="bio">Bio</Label>
                      <Textarea 
                        id="bio" 
                        value={bio} 
                        onChange={(e) => setBio(e.target.value)} 
                        placeholder="A brief description about yourself"
                        className="min-h-[100px]"
                      />
                    </div>
                  </CardContent>
                  <CardFooter className="flex justify-between">
                    <Button variant="outline" onClick={() => {
                      setDisplayName(user?.displayName || '');
                      setBio(userProfile?.bio || '');
                    }}>
                      Cancel
                    </Button>
                    <Button onClick={handleUpdateProfile} disabled={isSaving}>
                      {isSaving ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Saving...
                        </>
                      ) : 'Save Changes'}
                    </Button>
                  </CardFooter>
                </Card>
                
                <Card className="mt-6">
                  <CardHeader>
                    <CardTitle>Subscription Status</CardTitle>
                    <CardDescription>
                      Manage your subscription plan
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-col md:flex-row items-start md:items-center justify-between">
                      <div>
                        <h3 className="text-lg font-medium mb-1">
                          {userProfile?.subscription === 'premium' ? 'Premium Plan' : 'Free Plan'}
                        </h3>
                        <p className="text-sm text-neutral-500">
                          {userProfile?.subscription === 'premium' 
                            ? 'You have unlimited access to all features' 
                            : 'Limited to 3 memory books'}
                        </p>
                      </div>
                      
                      {userProfile?.subscription === 'premium' ? (
                        <div className="mt-4 md:mt-0 inline-flex items-center px-3 py-1 rounded-full bg-green-100 text-green-700">
                          <Check className="h-4 w-4 mr-2" />
                          Active
                        </div>
                      ) : (
                        <Button 
                          className="mt-4 md:mt-0"
                          onClick={() => setLocation('/subscribe')}
                        >
                          <Sparkles className="h-4 w-4 mr-2" />
                          Upgrade to Premium
                        </Button>
                      )}
                    </div>
                    
                    {userProfile?.subscription === 'premium' && (
                      <>
                        <Separator className="my-4" />
                        <div className="space-y-4">
                          <div className="flex justify-between text-sm">
                            <span className="text-neutral-500">Next billing date</span>
                            <span>June 15, 2023</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-neutral-500">Payment method</span>
                            <span className="flex items-center">
                              <CreditCard className="h-4 w-4 mr-1" />
                              •••• 4242
                            </span>
                          </div>
                          
                          <Button variant="outline" size="sm" className="w-full mt-2">
                            Manage Subscription
                          </Button>
                        </div>
                      </>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
              
              <TabsContent value="settings" className="mt-0">
                <Card>
                  <CardHeader>
                    <CardTitle>Account Settings</CardTitle>
                    <CardDescription>
                      Manage your account preferences
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="space-y-2">
                      <Label htmlFor="password">Password</Label>
                      <div className="flex items-center gap-2">
                        <Input 
                          id="password" 
                          type="password" 
                          value="••••••••" 
                          disabled 
                          className="bg-neutral-50"
                        />
                        <Button variant="outline">Change</Button>
                      </div>
                    </div>
                    
                    <Separator />
                    
                    <div>
                      <h3 className="text-lg font-medium mb-2">Danger Zone</h3>
                      <p className="text-sm text-neutral-500 mb-4">
                        Once you delete your account, there is no going back. Please be certain.
                      </p>
                      <Button 
                        variant="outline" 
                        className="text-red-500 hover:text-red-600 hover:bg-red-50"
                        onClick={handleDeleteAccount}
                      >
                        Delete Account
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
              
              <TabsContent value="help" className="mt-0">
                <Card>
                  <CardHeader>
                    <CardTitle>Help & Support</CardTitle>
                    <CardDescription>
                      Get help with your account and app usage
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div>
                      <h3 className="text-lg font-medium mb-2">Frequently Asked Questions</h3>
                      <div className="space-y-4">
                        <div>
                          <h4 className="font-medium">How do I create a memory book?</h4>
                          <p className="text-sm text-neutral-600 mt-1">
                            To create a memory book, go to the Memory Books page and click the "Create New Book" button. 
                            Follow the prompts to name your book and add memories to it.
                          </p>
                        </div>
                        
                        <div>
                          <h4 className="font-medium">How does voice recording work?</h4>
                          <p className="text-sm text-neutral-600 mt-1">
                            On the Dashboard, click the microphone button to start recording your memory. 
                            After recording, the app will transcribe your voice to text and allow you to edit it before saving.
                          </p>
                        </div>
                        
                        <div>
                          <h4 className="font-medium">What's included in the Premium plan?</h4>
                          <p className="text-sm text-neutral-600 mt-1">
                            Premium users get unlimited memory books, a special Year-End Memory Book, 
                            15% discount on physical book orders, and priority support.
                          </p>
                        </div>
                      </div>
                    </div>
                    
                    <Separator />
                    
                    <div>
                      <h3 className="text-lg font-medium mb-2">Contact Support</h3>
                      <p className="text-sm text-neutral-600 mb-4">
                        Need more help? Contact our support team and we'll get back to you as soon as possible.
                      </p>
                      <Button>
                        <HelpCircle className="h-4 w-4 mr-2" />
                        Contact Support
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </div>
          </div>
        </div>
      </main>
      
      <Footer />
      
      {/* Delete Account Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-red-500">Delete Account</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete your account? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="sm:justify-between">
            <Button
              variant="outline"
              onClick={() => setIsDeleteDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                setIsDeleteDialogOpen(false);
                setIsConfirmDeleteDialogOpen(true);
              }}
            >
              Yes, Delete My Account
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Confirm Delete Account Dialog */}
      <Dialog open={isConfirmDeleteDialogOpen} onOpenChange={setIsConfirmDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-red-500">Final Confirmation</DialogTitle>
            <DialogDescription>
              This will permanently delete all your data, including memories, books, and account information. 
              Type "DELETE" to confirm.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Input placeholder="Type DELETE to confirm" />
          </div>
          <DialogFooter className="sm:justify-between">
            <Button
              variant="outline"
              onClick={() => setIsConfirmDeleteDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDeleteAccount}
            >
              Permanently Delete Account
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Profile;
