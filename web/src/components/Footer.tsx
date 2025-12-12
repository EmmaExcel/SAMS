import { Link } from 'react-router-dom';
import { FiTwitter, FiGithub, FiYoutube, FiLinkedin } from 'react-icons/fi';

const Footer = () => {
  return (
    <footer className="bg-surface border-t border-white/5 pt-20 pb-12">
      <div className="max-w-[1400px] mx-auto px-6">
        <div className="grid grid-cols-2 md:grid-cols-6 gap-8 mb-16">
          
          <div className="col-span-2 md:col-span-2 pr-8">
            <div className="flex items-center gap-2">
          <Link to="/" className="text-xl font-display font-medium text-white tracking-[-0.5px]">
            SAMS <span className="text-text-muted font-normal">Attendance</span>
          </Link>
        </div>
            <p className="text-text-muted text-sm leading-relaxed mb-8">
              Open source attendance management for modern universities. Built by educators, for educators.
            </p>
            <div className="flex gap-4">
              <a href="#" className="text-text-muted hover:text-white transition-colors"><FiTwitter size={20} /></a>
              <a href="#" className="text-text-muted hover:text-white transition-colors"><FiGithub size={20} /></a>
              <a href="#" className="text-text-muted hover:text-white transition-colors"><FiYoutube size={20} /></a>
              <a href="#" className="text-text-muted hover:text-white transition-colors"><FiLinkedin size={20} /></a>
            </div>
          </div>

          <div>
            <h4 className="text-white font-medium mb-6 text-sm">Product</h4>
            <ul className="space-y-4 text-sm text-text-muted">
              <li><Link to="/solutions" className="hover:text-primary transition-colors">Solutions</Link></li>
              <li><Link to="/download" className="hover:text-primary transition-colors">Download</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="text-white font-medium mb-6 text-sm">Developers</h4>
            <ul className="space-y-4 text-sm text-text-muted">
              <li><a href="#" className="hover:text-primary transition-colors">Docs</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">API Reference</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">Status</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">GitHub</a></li>
            </ul>
          </div>

          <div>
            <h4 className="text-white font-medium mb-6 text-sm">Company</h4>
            <ul className="space-y-4 text-sm text-text-muted">
              <li><a href="#" className="hover:text-primary transition-colors">About</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">Careers</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">Terms</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">Privacy</a></li>
            </ul>
          </div>

        </div>

        <div className="pt-8 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-6">
           <div className="flex items-center gap-8">
             <span className="text-text-muted text-sm font-medium">SAMS</span>
             <a href="#" className="text-text-muted text-sm hover:text-white">Privacy</a>
             <a href="#" className="text-text-muted text-sm hover:text-white">Terms</a>
           </div>
           <p className="text-text-muted text-sm">
             © 2024 SAMS Inc.
           </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
