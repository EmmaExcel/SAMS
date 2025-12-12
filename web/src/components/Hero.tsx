import { FiPlayCircle } from 'react-icons/fi';
import heroImage from '../assets/hmm.png';

import { Link } from 'react-router-dom';

const Hero = () => {
  return (
    <header className="pt-48 pb-20 relative z-10 overflow-hidden">
      <div className="grid lg:grid-cols-2 gap-12 items-center max-w-[1400px] mx-auto px-6">
        <div className="max-w-2xl">
          <h1 className="text-5xl lg:text-[72px] font-display font-medium leading-[1.1] mb-6 text-white tracking-tight">
            Make attendance <br/> 
            <span className="text-primary">smart</span> & seamless.
          </h1>
          <p className="text-xl text-text-muted mb-8 max-w-lg leading-relaxed font-light">
            SAMS helps universities track attendance, manage sessions, and visualize data in real-time. Built for speed and reliability.
          </p>
          <div className="flex flex-col sm:flex-row gap-4">
            <Link to="/download" className="bg-primary hover:bg-primary-dark text-[#171717] px-8 py-3.5 rounded-lg font-medium text-lg transition-colors inline-block text-center">
              Get Started
            </Link>
            <button className="text-white hover:text-primary px-8 py-3.5 rounded-lg font-medium text-lg transition-colors flex items-center gap-2 border border-white/20 hover:border-primary/50">
              <FiPlayCircle className="text-xl" /> Watch Demo
            </button>
          </div>
        </div>

        <div className="relative lg:h-[600px] flex items-center justify-center">
          {/* Abstract Firebase-like Background Shapes */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/20 blur-[100px] rounded-full opacity-40" />
           <div className="absolute top-0 right-0 w-64 h-64 bg-secondary/20 blur-[80px] rounded-full opacity-30" />
          
          <img 
            src={heroImage} 
            alt="App Interface" 
            className="relative z-10 w-full max-w-[380px] transform hover:scale-[1.02] transition-transform duration-500 rounded-[32px] shadow-2xl border border-white/10"
          />
        </div>
      </div>
    </header>
  );
};

export default Hero;
