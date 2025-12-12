import { Link } from 'react-router-dom';

const Navbar = () => {
  return (
    <nav className="fixed top-0 left-0 w-full z-50 bg-[#171717]/95 backdrop-blur-sm border-b border-white/5 transition-all">
      <div className="max-w-[1400px] mx-auto px-6 h-16 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <Link to="/" className="text-xl font-display font-medium text-white tracking-[-0.5px]">
            SAMS <span className="text-text-muted font-normal">Attendance</span>
          </Link>
        </div>
        
        <div className="hidden md:flex items-center gap-8">
          <Link to="/solutions" className="text-sm font-medium text-text-muted hover:text-white transition-colors">Solutions</Link>
          <Link to="/download" className="text-sm font-medium text-text-muted hover:text-white transition-colors">Download</Link>
        </div>

        <div className="flex items-center gap-4">
          <Link to="/download" className="bg-primary hover:bg-primary-dark text-[#171717] px-5 py-2 rounded-md text-sm font-medium transition-colors">
            Get Started
          </Link>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
