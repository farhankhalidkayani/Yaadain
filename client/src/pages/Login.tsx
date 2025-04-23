import { useState } from 'react';
import { Link, useLocation } from 'wouter';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { FcGoogle } from 'react-icons/fc';
import { loginWithEmail, loginWithGoogle } from '@/lib/firebase';
import { AlertCircle } from 'lucide-react';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [_, setLocation] = useLocation();
  const { toast } = useToast();
  
  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !password) {
      toast({
        title: 'Error',
        description: 'Please enter your email and password',
        variant: 'destructive',
      });
      return;
    }
    
    setIsLoading(true);
    
    try {
      await loginWithEmail(email, password);
      setLocation('/');
    } catch (error: any) {
      console.error('Login error:', error);
      
      let errorMessage = 'Failed to sign in';
      
      if (error.code === 'auth/invalid-credential') {
        errorMessage = 'Invalid email or password';
      } else if (error.code === 'auth/user-not-found') {
        errorMessage = 'No account found with this email';
      } else if (error.code === 'auth/wrong-password') {
        errorMessage = 'Incorrect password';
      }
      
      toast({
        title: 'Authentication Error',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleGoogleLogin = async () => {
    setIsLoading(true);
    
    try {
      await loginWithGoogle();
      setLocation('/');
    } catch (error: any) {
      console.error('Google login error:', error);
      
      toast({
        title: 'Authentication Error',
        description: 'Failed to sign in with Google',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#FDFBF8] bg-[url('https://www.transparenttextures.com/patterns/paper.png')] bg-fixed p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-['Playfair_Display'] font-bold text-primary">Yadein</h1>
          <p className="text-neutral-600">Your digital memory journal</p>
        </div>
        
        <Card>
          <CardHeader>
            <CardTitle className="text-xl">Welcome Back</CardTitle>
            <CardDescription>
              Sign in to access your memories
            </CardDescription>
          </CardHeader>
          
          <CardContent>
            <form onSubmit={handleEmailLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="your@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={isLoading}
                  required
                />
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">Password</Label>
                  <Link href="/forgot-password" className="text-sm text-primary hover:text-primary-dark">
                    Forgot password?
                  </Link>
                </div>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isLoading}
                  required
                />
              </div>
              
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? 'Signing in...' : 'Sign In'}
              </Button>
            </form>
            
            <div className="relative my-6">
              <Separator />
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="bg-white px-2 text-xs uppercase text-neutral-500">or</span>
              </div>
            </div>
            
            <Button
              variant="outline"
              onClick={handleGoogleLogin}
              disabled={isLoading}
              className="w-full mb-3"
            >
              <FcGoogle className="mr-2 h-5 w-5" />
              Sign In with Google
            </Button>
            
            <div className="bg-amber-50 border border-amber-200 rounded-md p-3 mb-3 flex items-start">
              <AlertCircle className="h-5 w-5 text-amber-500 mr-2 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-amber-800">Development Mode</p>
                <p className="text-xs text-amber-700">Firebase authentication is required but not configured. Use the test login button below.</p>
              </div>
            </div>
            
            <Button
              variant="secondary"
              onClick={() => {
                // Set test mode flag
                sessionStorage.setItem('testModeEnabled', 'true');
                setLocation('/');
              }}
              className="w-full"
            >
              Enter as Test User
            </Button>
          </CardContent>
          
          <CardFooter className="justify-center">
            <p className="text-sm text-neutral-600">
              Don't have an account?{' '}
              <Link href="/register" className="text-primary hover:text-primary-dark font-medium">
                Sign up
              </Link>
            </p>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
};

export default Login;
