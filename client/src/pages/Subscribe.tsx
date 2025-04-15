import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { getUserProfile, getCurrentUser, upgradeToSubscription } from '@/lib/firebase';
import { Sparkles, Check, BookOpen, Gem, Percent } from 'lucide-react';

const Subscribe = () => {
  const [userProfile, setUserProfile] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [subscriptionComplete, setSubscriptionComplete] = useState(false);
  const [_, navigate] = useLocation();
  const { toast } = useToast();
  
  useEffect(() => {
    const fetchUserProfile = async () => {
      const user = getCurrentUser();
      if (!user) {
        navigate('/login');
        return;
      }
      
      try {
        setIsLoading(true);
        const profile = await getUserProfile(user.uid);
        setUserProfile(profile);
        
        // If already premium, no need to show payment
        if (profile && profile.subscription === 'premium') {
          setSubscriptionComplete(true);
        }
      } catch (error) {
        console.error('Error fetching user profile:', error);
        toast({
          title: 'Error',
          description: 'Failed to load your profile. Please try again.',
          variant: 'destructive',
        });
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchUserProfile();
  }, [navigate, toast]);
  
  const handleInitiateSubscription = async () => {
    const user = getCurrentUser();
    if (!user) {
      navigate('/login');
      return;
    }
    
    try {
      setIsLoading(true);
      const result = await upgradeToSubscription();
      
      if (result.success) {
        // Immediately mark as complete since we're using a simplified flow
        setSubscriptionComplete(true);
        
        // Update the user profile to reflect the new subscription status
        if (userProfile) {
          setUserProfile({
            ...userProfile,
            subscription: 'premium'
          });
        }
        
        toast({
          title: 'Success',
          description: 'You are now a premium member!',
        });
      } else {
        toast({
          title: 'Error',
          description: result.message || 'Failed to complete subscription',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error initiating subscription:', error);
      toast({
        title: 'Error',
        description: 'Failed to initiate subscription process. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  const renderContent = () => {
    if (isLoading) {
      return (
        <div className="flex justify-center py-12">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
        </div>
      );
    }
    
    if (subscriptionComplete) {
      return (
        <div className="text-center py-8">
          <div className="inline-flex items-center justify-center p-4 bg-green-100 text-green-700 rounded-full mb-4">
            <Check className="h-8 w-8" />
          </div>
          <h2 className="text-2xl font-bold mb-2">You're a Premium Member!</h2>
          <p className="text-neutral-600 mb-6">
            Thank you for subscribing to Yadein Premium. Enjoy all the premium features!
          </p>
          <Button onClick={() => navigate('/')}>
            Go to Dashboard
          </Button>
        </div>
      );
    }
    
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div>
          <h2 className="text-2xl font-bold mb-4">Upgrade to Premium</h2>
          <p className="text-neutral-600 mb-6">
            Unlock all the features of Yadein with our Premium subscription. Preserve your memories without limits.
          </p>
          
          <div className="space-y-4 mb-8">
            <div className="flex items-start">
              <div className="bg-primary/10 p-2 rounded-full mr-3">
                <BookOpen className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold">Unlimited Memory Books</h3>
                <p className="text-sm text-neutral-500">Create as many memory books as you want</p>
              </div>
            </div>
            
            <div className="flex items-start">
              <div className="bg-primary/10 p-2 rounded-full mr-3">
                <Gem className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold">Year-End Memory Book</h3>
                <p className="text-sm text-neutral-500">Create a special annual collection of your best memories</p>
              </div>
            </div>
            
            <div className="flex items-start">
              <div className="bg-primary/10 p-2 rounded-full mr-3">
                <Percent className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold">15% Discount on Physical Books</h3>
                <p className="text-sm text-neutral-500">Save on all physical book orders</p>
              </div>
            </div>
            
            <div className="flex items-start">
              <div className="bg-primary/10 p-2 rounded-full mr-3">
                <Sparkles className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold">Priority Support</h3>
                <p className="text-sm text-neutral-500">Get help faster and early access to new features</p>
              </div>
            </div>
          </div>
        </div>
        
        <div>
          <Card className="border border-primary/20 shadow-lg">
            <CardHeader className="bg-primary/5 border-b border-primary/10">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-2xl flex items-center">
                    <Sparkles className="h-5 w-5 mr-2 text-primary" />
                    Premium Plan
                  </CardTitle>
                  <CardDescription>Unlimited memories, unlimited possibilities</CardDescription>
                </div>
                <div className="text-right">
                  <div className="text-3xl font-bold text-primary">$5</div>
                  <div className="text-sm text-neutral-500">per month</div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-6">
              <ul className="space-y-3">
                {[
                  'Unlimited memory books',
                  'Year-End Memory Book',
                  '15% discount on physical books',
                  'Priority support',
                  'Early access to new features',
                  'Cancel anytime'
                ].map((feature, index) => (
                  <li key={index} className="flex items-center">
                    <Check className="h-5 w-5 text-green-500 mr-2" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
            <CardFooter>
              <Button 
                className="w-full" 
                size="lg"
                onClick={handleInitiateSubscription}
              >
                <Sparkles className="h-4 w-4 mr-2" />
                Subscribe Now
              </Button>
            </CardFooter>
          </Card>
          
          <p className="text-center text-sm text-neutral-500 mt-4">
            You can cancel your subscription at any time from your account settings.
          </p>
        </div>
      </div>
    );
  };
  
  return (
    <div className="min-h-screen flex flex-col bg-[#FDFBF8] bg-[url('https://www.transparenttextures.com/patterns/paper.png')] bg-fixed">
      <Header />
      
      <main className="flex-grow">
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-8">
              <h1 className="text-3xl md:text-4xl font-['Playfair_Display'] font-bold text-neutral-900">
                Upgrade Your Memory Experience
              </h1>
              <p className="text-neutral-600 mt-2">
                Preserve your most precious memories with premium features
              </p>
            </div>
            
            {renderContent()}
          </div>
        </div>
      </main>
      
      <Footer />
    </div>
  );
};

export default Subscribe;
