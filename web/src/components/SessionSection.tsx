import { FiClock, FiSettings, FiSave, FiPlay, FiStopCircle, FiCheck, FiArrowRight, FiUsers } from 'react-icons/fi';

const SessionSection = () => {
  return (
    <section className="py-24 relative overflow-hidden">
      <div className="max-w-[1400px] mx-auto px-6 grid lg:grid-cols-2 gap-20 items-center">
        
        {/* Left Side - CSS UI Mockup */}
        <div className="relative">
             {/* Glow effect behind the card */}
             <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[90%] h-[90%] bg-primary blur-[100px] opacity-20 -z-10 rounded-full" />

            <div className="bg-surface p-6 rounded-[32px] shadow-2xl border border-white/5 max-w-[420px] mx-auto rotate-[-2deg] hover:rotate-0 transition-transform duration-500">
                {/* Header Card */}
                <div className="bg-[#2e2f31] rounded-[24px] p-5 mb-5 text-text-main">
                    <div className="flex justify-between items-center mb-4">
                        <div className="flex items-center gap-2 text-green-400 text-sm font-medium">
                            <FiCheck className="bg-green-400/20 p-0.5 rounded-full w-5 h-5" />
                            Attendance Active
                        </div>
                        <span className="text-xs bg-white/5 px-3 py-1 rounded-full text-text-muted">Automatic Mode</span>
                    </div>
                    
                    <div className="text-sm text-text-muted mb-1">Mth565: Advanced Algorithms</div>
                    <div className="flex justify-between text-xs text-text-muted mb-6">
                        <span>Started: 3:17 AM</span>
                        <span>24 students</span>
                    </div>

                    <div className="bg-[#1e1e1e] rounded-[20px] p-4 text-center border border-white/5">
                        <div className="text-text-muted text-xs font-bold tracking-wider mb-1">TIME REMAINING</div>
                        <div className="text-4xl font-mono font-bold text-white mb-3 flex items-center justify-center gap-2">
                             <FiClock className="text-secondary w-6 h-6 animate-pulse" /> 29 : 56
                        </div>
                        <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
                            <div className="h-full bg-primary w-[30%] rounded-full" />
                        </div>
                    </div>
                </div>

                {/* Controls */}
                <div className="grid grid-cols-2 gap-3 mb-5">
                    <button className="bg-white/5 hover:bg-white/10 text-white py-3 rounded-xl font-medium flex items-center justify-center gap-2 transition-colors">
                        <FiPlay className="fill-current" /> Start
                    </button>
                    <button className="bg-red-500/80 hover:bg-red-500 text-white py-3 rounded-xl font-medium flex items-center justify-center gap-2 transition-colors">
                        <FiStopCircle /> Stop
                    </button>
                </div>

                {/* Bottom Status Card */}
                <div className="bg-[#2e2f31] rounded-[24px] p-6 text-center relative overflow-hidden flex flex-col items-center justify-center border border-white/5">
                    <FiUsers className="w-8 h-8 text-text-muted mx-auto mb-3" />
                    <h3 className="text-white font-medium text-lg mb-1">Waiting for Students</h3>
                    <p className="text-text-muted text-xs max-w-[200px] mx-auto text-center mb-4">
                        Scanning for nearby devices...
                    </p>
                    <div className="w-[140px] h-1 bg-white/10 rounded-full mx-auto overflow-hidden">
                            <div className="h-full bg-primary w-1/3 animate-[loading_2s_ease-in-out_infinite]" />
                    </div>
                </div>
            </div>
        </div>

        {/* Right Side - Content */}
        <div>
            <h2 className="text-3xl md:text-5xl font-display font-medium mb-6 leading-tight text-white">
                Effortless Session <br/> Management
            </h2>
            <p className="text-text-muted text-lg mb-10 leading-relaxed font-light">
                Lecturers can start sessions with a single tap. Set automatic timers, 
                monitor students joining in real-time, and handle late arrivals without 
                disrupting the class flow.
            </p>

            <ul className="space-y-6 mb-10">
                {[
                    "Automated session timers and countdowns.",
                    "Live student detection dashboard.",
                    "One-click data saving and export."
                ].map((item, i) => (
                    <li key={i} className="flex items-center gap-4">
                        <div className="bg-secondary/10 rounded-full p-1">
                            <FiCheck className="text-secondary w-5 h-5" />
                        </div>
                        <span className="text-text-main">{item}</span>
                    </li>
                ))}
            </ul>

            <button className="text-primary font-medium text-lg hover:text-primary-dark inline-flex items-center gap-2">
                See how it works <FiArrowRight className="transition-transform group-hover:translate-x-1" />
            </button>
        </div>

      </div>
    </section>
  );
};

export default SessionSection;
