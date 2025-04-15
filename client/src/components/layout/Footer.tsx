import { Link } from 'wouter';

const Footer = () => {
  return (
    <footer className="bg-white border-t border-neutral-100">
      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col md:flex-row justify-between items-center">
          <div className="mb-4 md:mb-0">
            <span className="text-xl font-['Playfair_Display'] font-bold text-primary">Yadein</span>
            <p className="text-sm text-neutral-500 mt-1">© {new Date().getFullYear()} Yadein. All rights reserved.</p>
          </div>
          
          <div className="flex space-x-6">
            <Link href="/terms" className="text-neutral-500 hover:text-primary transition-colors">
              Terms
            </Link>
            <Link href="/privacy" className="text-neutral-500 hover:text-primary transition-colors">
              Privacy
            </Link>
            <Link href="/help" className="text-neutral-500 hover:text-primary transition-colors">
              Help
            </Link>
            <Link href="/contact" className="text-neutral-500 hover:text-primary transition-colors">
              Contact
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
