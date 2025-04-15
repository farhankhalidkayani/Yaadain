import { Link, useLocation } from 'wouter';
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { Menu, Bell, ChevronDown } from 'lucide-react';
import { getAuth, signOut } from 'firebase/auth';
import { getUserProfile } from '@/lib/firebase';

const Header = () => {
  const [location] = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [user, setUser] = useState<any>(null);
  const auth = getAuth();
  
  useEffect(() => {
    const fetchUserProfile = async () => {
      if (auth.currentUser) {
        const userProfile = await getUserProfile(auth.currentUser.uid);
        setUser({
          ...auth.currentUser,
          profile: userProfile
        });
      }
    };
    
    fetchUserProfile();
  }, [auth.currentUser]);
  
  const handleSignOut = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };
  
  const isActive = (path: string) => {
    return location === path;
  };
  
  return (
    <header className="bg-white shadow-sm border-b border-neutral-100 sticky top-0 z-10">
      <div className="container mx-auto px-4 py-3 flex justify-between items-center">
        <Link href="/" className="flex items-center">
          <span className="text-2xl font-['Playfair_Display'] font-bold text-primary">Yadein</span>
          <span className="ml-1 text-sm text-neutral-500 italic">memories that last</span>
        </Link>
        
        {/* Desktop Navigation */}
        <nav className="hidden md:flex space-x-6 text-sm">
          <Link href="/" className={`relative ${isActive('/') ? 'text-primary font-medium' : 'text-neutral-700 hover:text-primary transition-colors'}`}>
            Dashboard
            {isActive('/') && <div className="absolute bottom-[-8px] left-0 right-0 h-[3px] bg-primary rounded-full"></div>}
          </Link>
          <Link href="/stories" className={`relative ${isActive('/stories') ? 'text-primary font-medium' : 'text-neutral-700 hover:text-primary transition-colors'}`}>
            My Stories
            {isActive('/stories') && <div className="absolute bottom-[-8px] left-0 right-0 h-[3px] bg-primary rounded-full"></div>}
          </Link>
          <Link href="/memory-books" className={`relative ${isActive('/memory-books') ? 'text-primary font-medium' : 'text-neutral-700 hover:text-primary transition-colors'}`}>
            Memory Books
            {isActive('/memory-books') && <div className="absolute bottom-[-8px] left-0 right-0 h-[3px] bg-primary rounded-full"></div>}
          </Link>
          <Link href="/subscribe" className={`relative ${isActive('/subscribe') ? 'text-primary font-medium' : 'text-neutral-700 hover:text-primary transition-colors'}`}>
            Subscription
            {isActive('/subscribe') && <div className="absolute bottom-[-8px] left-0 right-0 h-[3px] bg-primary rounded-full"></div>}
          </Link>
        </nav>
        
        {/* User Menu */}
        {user ? (
          <div className="flex items-center space-x-4">
            <div className="hidden md:block">
              <Button variant="ghost" size="icon" className="text-neutral-700 hover:text-primary transition-colors">
                <Bell className="h-6 w-6" />
              </Button>
            </div>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="flex items-center space-x-2 focus:ring-0">
                  <Avatar className="w-8 h-8">
                    <AvatarImage src={user.photoURL || ''} alt={user.displayName || 'User'} />
                    <AvatarFallback className="bg-primary/10 text-primary">
                      {user.displayName ? user.displayName.charAt(0).toUpperCase() : 'U'}
                    </AvatarFallback>
                  </Avatar>
                  <span className="ml-2 text-sm font-medium hidden md:block">
                    {user.displayName || user.email}
                  </span>
                  <ChevronDown className="h-4 w-4 text-neutral-500" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem asChild>
                  <Link href="/profile">Your Profile</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/profile?tab=settings">Settings</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/profile?tab=help">Help & Support</Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="text-red-500" onClick={handleSignOut}>
                  Sign Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            
            <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
              <Menu className="h-6 w-6" />
            </Button>
          </div>
        ) : (
          <div className="flex items-center space-x-4">
            <Link href="/login">
              <Button variant="ghost">Login</Button>
            </Link>
            <Link href="/register">
              <Button>Register</Button>
            </Link>
          </div>
        )}
      </div>
      
      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-white border-t border-neutral-100">
          <div className="px-4 py-3 space-y-1">
            <Link href="/" className={`block py-2 ${isActive('/') ? 'text-primary font-medium' : 'text-neutral-700'}`}>
              Dashboard
            </Link>
            <Link href="/stories" className={`block py-2 ${isActive('/stories') ? 'text-primary font-medium' : 'text-neutral-700'}`}>
              My Stories
            </Link>
            <Link href="/memory-books" className={`block py-2 ${isActive('/memory-books') ? 'text-primary font-medium' : 'text-neutral-700'}`}>
              Memory Books
            </Link>
            <Link href="/subscribe" className={`block py-2 ${isActive('/subscribe') ? 'text-primary font-medium' : 'text-neutral-700'}`}>
              Subscription
            </Link>
          </div>
        </div>
      )}
    </header>
  );
};

export default Header;
