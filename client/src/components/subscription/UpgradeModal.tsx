import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Sparkles, Check } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useLocation } from 'wouter';

interface UpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const UpgradeModal = ({ isOpen, onClose }: UpgradeModalProps) => {
  const [isPending, setIsPending] = useState(false);
  const { toast } = useToast();
  const [_, navigate] = useLocation();
  
  const handleUpgrade = () => {
    setIsPending(true);
    
    // Navigate to subscription page
    setTimeout(() => {
      setIsPending(false);
      onClose();
      navigate('/subscribe');
    }, 500);
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <div className="bg-primary-light/20 p-2 rounded-full">
              <Sparkles className="h-5 w-5 text-primary" />
            </div>
            Upgrade to Premium
          </DialogTitle>
          <DialogDescription>
            Unlock the full potential of Yadein with our Premium subscription
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 mt-2">
          <ul className="space-y-3">
            <li className="flex items-start">
              <Check className="h-5 w-5 text-green-500 mr-2 flex-shrink-0" />
              <span className="text-sm">Unlimited memory book storage</span>
            </li>
            <li className="flex items-start">
              <Check className="h-5 w-5 text-green-500 mr-2 flex-shrink-0" />
              <span className="text-sm">Create a special Year-End Memory Book</span>
            </li>
            <li className="flex items-start">
              <Check className="h-5 w-5 text-green-500 mr-2 flex-shrink-0" />
              <span className="text-sm">15% discount on all physical book orders</span>
            </li>
            <li className="flex items-start">
              <Check className="h-5 w-5 text-green-500 mr-2 flex-shrink-0" />
              <span className="text-sm">Priority support and early access to new features</span>
            </li>
          </ul>
          
          <div className="bg-neutral-50 rounded-lg p-4 text-center">
            <p className="text-xl font-bold text-primary">$5<span className="text-sm font-normal text-neutral-700">/month</span></p>
            <p className="text-xs text-neutral-500">Billed monthly, cancel anytime</p>
          </div>
        </div>
        
        <DialogFooter className="sm:justify-between">
          <Button
            variant="outline"
            onClick={onClose}
          >
            Maybe Later
          </Button>
          <Button
            onClick={handleUpgrade}
            disabled={isPending}
          >
            {isPending ? 'Processing...' : 'Upgrade Now'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default UpgradeModal;
