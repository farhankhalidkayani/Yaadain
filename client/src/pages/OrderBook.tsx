import { useState, useEffect } from 'react';
import { useParams, useLocation } from 'wouter';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { getBook, getCurrentUser, getUserProfile } from '@/lib/firebase';
import { createBookOrderPayment } from '@/lib/stripe';
import { ArrowLeft, Book, BookOpen, ShoppingCart, CreditCard } from 'lucide-react';

// Simplified payment component
const SimplePaymentForm = ({ 
  onSuccess 
}: { 
  onSuccess: () => void 
}) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const { toast } = useToast();
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    setIsProcessing(true);
    
    try {
      // Simulate a slight delay to mimic payment processing
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Payment successful
      toast({
        title: 'Order Placed Successfully',
        description: 'Your order has been placed! You will receive a confirmation shortly.',
      });
      onSuccess();
    } catch (error) {
      console.error('Payment error:', error);
      toast({
        title: 'Error',
        description: 'An unexpected error occurred. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsProcessing(false);
    }
  };
  
  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="rounded-lg border p-5 shadow-sm">
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="card-name">Name on Card</Label>
            <Input id="card-name" placeholder="John Doe" />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="card-number">Card Number</Label>
            <Input id="card-number" placeholder="1234 5678 9012 3456" />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="expiry">Expiry Date</Label>
              <Input id="expiry" placeholder="MM/YY" />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="cvc">CVC</Label>
              <Input id="cvc" placeholder="123" />
            </div>
          </div>
        </div>
      </div>
      
      <Button 
        type="submit" 
        className="w-full" 
        disabled={isProcessing}
      >
        {isProcessing ? 'Processing...' : 'Complete Purchase'}
      </Button>
    </form>
  );
};

const OrderBook = () => {
  const { id } = useParams();
  const [_, navigate] = useLocation();
  const [book, setBook] = useState<any>(null);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('details');
  const [copies, setCopies] = useState(1);
  const [coverType, setCoverType] = useState('softcover');
  const [shippingAddress, setShippingAddress] = useState({
    name: '',
    addressLine1: '',
    addressLine2: '',
    city: '',
    state: '',
    postalCode: '',
    country: 'US'
  });
  const [total, setTotal] = useState(0);
  const [discountedTotal, setDiscountedTotal] = useState(0);
  const [orderComplete, setOrderComplete] = useState(false);
  
  const { toast } = useToast();
  
  useEffect(() => {
    const fetchData = async () => {
      if (!id) return;
      
      try {
        setIsLoading(true);
        
        // Get current user
        const user = getCurrentUser();
        if (!user) {
          navigate('/login');
          return;
        }
        
        // Fetch book details
        const fetchedBook = await getBook(id);
        if (!fetchedBook) {
          toast({
            title: 'Error',
            description: 'Book not found',
            variant: 'destructive',
          });
          navigate('/memory-books');
          return;
        }
        
        // Check if book is completed
        if (fetchedBook.status !== 'complete') {
          toast({
            title: 'Error',
            description: 'This book is not yet complete. Please complete it before ordering.',
            variant: 'destructive',
          });
          navigate(`/memory-books/${id}`);
          return;
        }
        
        setBook(fetchedBook);
        
        // Fetch user profile to check subscription status
        const profile = await getUserProfile(user.uid);
        setUserProfile(profile);
        
        // Prefill shipping info if available
        if (user.displayName) {
          setShippingAddress(prev => ({ ...prev, name: user.displayName }));
        }
      } catch (error) {
        console.error('Error fetching data:', error);
        toast({
          title: 'Error',
          description: 'Failed to load data. Please try again.',
          variant: 'destructive',
        });
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchData();
  }, [id, navigate, toast]);
  
  useEffect(() => {
    // Calculate order total
    let basePrice = 2999; // $29.99 base price
    
    // Add cost for premium cover
    if (coverType === 'hardcover') {
      basePrice += 1000; // $10 extra for hardcover
    }
    
    // Calculate total (multiply by copies)
    const calculatedTotal = basePrice * copies;
    setTotal(calculatedTotal);
    
    // Apply discount for premium users
    const discount = userProfile?.subscription === 'premium' ? 0.15 : 0; // 15% discount
    setDiscountedTotal(Math.round(calculatedTotal * (1 - discount)));
  }, [copies, coverType, userProfile]);
  
  const handleAddressChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setShippingAddress(prev => ({ ...prev, [name]: value }));
  };
  
  const handleContinueToPayment = () => {
    // Validate shipping address
    const requiredFields = ['name', 'addressLine1', 'city', 'state', 'postalCode', 'country'];
    const missingFields = requiredFields.filter(field => !shippingAddress[field as keyof typeof shippingAddress]);
    
    if (missingFields.length > 0) {
      toast({
        title: 'Missing Information',
        description: 'Please fill in all required shipping fields',
        variant: 'destructive',
      });
      return;
    }
    
    setActiveTab('payment');
    initializePayment();
  };
  
  const initializePayment = async () => {
    if (!book) return;
    
    const user = getCurrentUser();
    if (!user) {
      navigate('/login');
      return;
    }
    
    // Validate shipping address before continuing
    const requiredFields = ['name', 'addressLine1', 'city', 'state', 'postalCode', 'country'];
    const missingFields = requiredFields.filter(field => !shippingAddress[field as keyof typeof shippingAddress]);
    
    if (missingFields.length > 0) {
      setActiveTab('details');
      toast({
        title: 'Missing Information',
        description: 'Please fill in all required shipping fields',
        variant: 'destructive',
      });
      return;
    }
    
    try {
      setIsLoading(true);
      
      // In our simplified version, we'll just simulate the API call
      // But still make a call to give a more realistic experience
      await createBookOrderPayment(book.id, {
        copies,
        coverType,
        shippingAddress
      });
      
      // Simulate a slight delay to mimic server processing
      await new Promise(resolve => setTimeout(resolve, 500));
    } catch (error) {
      console.error('Error initializing payment:', error);
      toast({
        title: 'Error',
        description: 'Failed to initialize payment. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  const handlePaymentSuccess = () => {
    setOrderComplete(true);
  };
  
  const formatPrice = (cents: number) => {
    return `$${(cents / 100).toFixed(2)}`;
  };
  
  const renderContent = () => {
    if (isLoading) {
      return (
        <div className="flex justify-center py-12">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
        </div>
      );
    }
    
    if (orderComplete) {
      return (
        <div className="text-center py-8">
          <div className="inline-flex items-center justify-center p-4 bg-green-100 text-green-700 rounded-full mb-4">
            <ShoppingCart className="h-8 w-8" />
          </div>
          <h2 className="text-2xl font-bold mb-2">Order Placed Successfully!</h2>
          <p className="text-neutral-600 mb-6">
            Thank you for your order. We've received your payment and will begin processing your memory book.
          </p>
          <Button onClick={() => navigate('/memory-books')}>
            Back to Memory Books
          </Button>
        </div>
      );
    }
    
    if (!book) {
      return (
        <div className="text-center py-8">
          <p className="text-neutral-600 mb-4">Book not found or not yet complete.</p>
          <Button onClick={() => navigate('/memory-books')}>
            Back to Memory Books
          </Button>
        </div>
      );
    }
    
    return (
      <Tabs value={activeTab} onValueChange={tab => {
          if (tab === 'payment' && !shippingAddress.name) {
            toast({
              title: 'Missing Information',
              description: 'Please fill in all required shipping fields',
              variant: 'destructive',
            });
          } else {
            setActiveTab(tab);
            if (tab === 'payment') {
              // Initialize payment when switching to payment tab
              initializePayment();
            }
          }
        }} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="details">1. Order Details</TabsTrigger>
          <TabsTrigger value="payment">2. Payment</TabsTrigger>
        </TabsList>
        
        <TabsContent value="details" className="mt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div>
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Book className="h-5 w-5 mr-2" />
                    Book Options
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="copies">Number of Copies</Label>
                    <Select
                      value={String(copies)}
                      onValueChange={(value) => setCopies(Number(value))}
                    >
                      <SelectTrigger id="copies">
                        <SelectValue placeholder="Select quantity" />
                      </SelectTrigger>
                      <SelectContent>
                        {[1, 2, 3, 4, 5].map((num) => (
                          <SelectItem key={num} value={String(num)}>
                            {num} {num === 1 ? 'copy' : 'copies'}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Cover Type</Label>
                    <RadioGroup
                      value={coverType}
                      onValueChange={setCoverType}
                      className="flex flex-col space-y-3"
                    >
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="softcover" id="softcover" />
                        <Label htmlFor="softcover" className="flex-1">
                          <div className="font-medium">Softcover</div>
                          <div className="text-sm text-neutral-500">Standard softcover finish</div>
                        </Label>
                        <div className="text-right font-medium">{formatPrice(2999)}</div>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="hardcover" id="hardcover" />
                        <Label htmlFor="hardcover" className="flex-1">
                          <div className="font-medium">Hardcover</div>
                          <div className="text-sm text-neutral-500">Premium hardcover finish</div>
                        </Label>
                        <div className="text-right font-medium">{formatPrice(3999)}</div>
                      </div>
                    </RadioGroup>
                  </div>
                </CardContent>
              </Card>
              
              <Card className="mt-6">
                <CardHeader>
                  <CardTitle>Shipping Address</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Full Name</Label>
                    <Input
                      id="name"
                      name="name"
                      value={shippingAddress.name}
                      onChange={handleAddressChange}
                      placeholder="John Doe"
                      required
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="addressLine1">Address Line 1</Label>
                    <Input
                      id="addressLine1"
                      name="addressLine1"
                      value={shippingAddress.addressLine1}
                      onChange={handleAddressChange}
                      placeholder="123 Main St"
                      required
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="addressLine2">Address Line 2 (Optional)</Label>
                    <Input
                      id="addressLine2"
                      name="addressLine2"
                      value={shippingAddress.addressLine2}
                      onChange={handleAddressChange}
                      placeholder="Apt 4B"
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="city">City</Label>
                      <Input
                        id="city"
                        name="city"
                        value={shippingAddress.city}
                        onChange={handleAddressChange}
                        placeholder="New York"
                        required
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="state">State/Province</Label>
                      <Input
                        id="state"
                        name="state"
                        value={shippingAddress.state}
                        onChange={handleAddressChange}
                        placeholder="NY"
                        required
                      />
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="postalCode">Postal Code</Label>
                      <Input
                        id="postalCode"
                        name="postalCode"
                        value={shippingAddress.postalCode}
                        onChange={handleAddressChange}
                        placeholder="10001"
                        required
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="country">Country</Label>
                      <Select
                        value={shippingAddress.country}
                        onValueChange={(value) => setShippingAddress(prev => ({ ...prev, country: value }))}
                      >
                        <SelectTrigger id="country">
                          <SelectValue placeholder="Select country" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="US">United States</SelectItem>
                          <SelectItem value="CA">Canada</SelectItem>
                          <SelectItem value="GB">United Kingdom</SelectItem>
                          <SelectItem value="AU">Australia</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </CardContent>
                <CardFooter>
                  <Button 
                    className="w-full" 
                    onClick={handleContinueToPayment}
                  >
                    Continue to Payment
                  </Button>
                </CardFooter>
              </Card>
            </div>
            
            <div>
              <Card className="sticky top-6">
                <CardHeader>
                  <CardTitle>Order Summary</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center mb-4">
                    <div className="w-20 h-20 bg-neutral-100 rounded-md mr-4 overflow-hidden">
                      {book.coverUrl ? (
                        <img 
                          src={book.coverUrl} 
                          alt={book.title} 
                          className="w-full h-full object-cover" 
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <BookOpen className="h-8 w-8 text-neutral-400" />
                        </div>
                      )}
                    </div>
                    <div>
                      <h3 className="font-medium">{book.title}</h3>
                      <p className="text-sm text-neutral-500">
                        {book.storiesCount} {book.storiesCount === 1 ? 'story' : 'stories'} • 
                        {book.photosCount} {book.photosCount === 1 ? 'photo' : 'photos'}
                      </p>
                    </div>
                  </div>
                  
                  <Separator className="my-4" />
                  
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span>Book Price ({coverType})</span>
                      <span>{formatPrice(coverType === 'hardcover' ? 3999 : 2999)}</span>
                    </div>
                    
                    <div className="flex justify-between">
                      <span>Quantity</span>
                      <span>{copies} {copies === 1 ? 'copy' : 'copies'}</span>
                    </div>
                    
                    <div className="flex justify-between">
                      <span>Subtotal</span>
                      <span>{formatPrice(total)}</span>
                    </div>
                    
                    {userProfile?.subscription === 'premium' && (
                      <div className="flex justify-between text-green-600">
                        <span>Premium Discount (15%)</span>
                        <span>-{formatPrice(total * 0.15)}</span>
                      </div>
                    )}
                    
                    <Separator className="my-2" />
                    
                    <div className="flex justify-between font-bold text-lg">
                      <span>Total</span>
                      <span>{formatPrice(discountedTotal)}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>
        
        <TabsContent value="payment" className="mt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div>
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <CreditCard className="h-5 w-5 mr-2" />
                    Payment Details
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {isLoading ? (
                    <div className="flex justify-center py-6">
                      <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
                    </div>
                  ) : (
                    <SimplePaymentForm onSuccess={handlePaymentSuccess} />
                  )}
                </CardContent>
              </Card>
            </div>
            
            <div>
              <Card className="sticky top-6">
                <CardHeader>
                  <CardTitle>Order Summary</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center mb-4">
                    <div className="w-20 h-20 bg-neutral-100 rounded-md mr-4 overflow-hidden">
                      {book.coverUrl ? (
                        <img 
                          src={book.coverUrl} 
                          alt={book.title} 
                          className="w-full h-full object-cover" 
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <BookOpen className="h-8 w-8 text-neutral-400" />
                        </div>
                      )}
                    </div>
                    <div>
                      <h3 className="font-medium">{book.title}</h3>
                      <p className="text-sm text-neutral-500">
                        {book.storiesCount} {book.storiesCount === 1 ? 'story' : 'stories'} • 
                        {book.photosCount} {book.photosCount === 1 ? 'photo' : 'photos'}
                      </p>
                    </div>
                  </div>
                  
                  <Separator className="my-4" />
                  
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span>Book Price ({coverType})</span>
                      <span>{formatPrice(coverType === 'hardcover' ? 3999 : 2999)}</span>
                    </div>
                    
                    <div className="flex justify-between">
                      <span>Quantity</span>
                      <span>{copies} {copies === 1 ? 'copy' : 'copies'}</span>
                    </div>
                    
                    <div className="flex justify-between">
                      <span>Subtotal</span>
                      <span>{formatPrice(total)}</span>
                    </div>
                    
                    {userProfile?.subscription === 'premium' && (
                      <div className="flex justify-between text-green-600">
                        <span>Premium Discount (15%)</span>
                        <span>-{formatPrice(total * 0.15)}</span>
                      </div>
                    )}
                    
                    <Separator className="my-2" />
                    
                    <div className="flex justify-between font-bold text-lg">
                      <span>Total</span>
                      <span>{formatPrice(discountedTotal)}</span>
                    </div>
                  </div>
                  
                  <div className="mt-6 text-sm text-neutral-500">
                    <p>Shipping address:</p>
                    <p className="mt-1">{shippingAddress.name}</p>
                    <p>{shippingAddress.addressLine1}</p>
                    {shippingAddress.addressLine2 && <p>{shippingAddress.addressLine2}</p>}
                    <p>{shippingAddress.city}, {shippingAddress.state} {shippingAddress.postalCode}</p>
                    <p>{shippingAddress.country}</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    );
  };
  
  return (
    <div className="min-h-screen flex flex-col bg-[#FDFBF8] bg-[url('https://www.transparenttextures.com/patterns/paper.png')] bg-fixed">
      <Header />
      
      <main className="flex-grow">
        <div className="container mx-auto px-4 py-6">
          <Button variant="ghost" onClick={() => navigate(`/memory-books/${id}`)} className="mb-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Book
          </Button>
          
          <div className="mb-6">
            <h1 className="text-3xl font-['Playfair_Display'] font-bold text-neutral-900">
              Order Printed Book
            </h1>
            <p className="text-neutral-700 mt-1">
              Get a beautiful physical copy of your memory book
            </p>
          </div>
          
          {renderContent()}
        </div>
      </main>
      
      <Footer />
    </div>
  );
};

export default OrderBook;
