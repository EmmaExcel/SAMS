import { FiSmartphone, FiDownload, FiInfo, FiCheck } from 'react-icons/fi';
import { FaAndroid, FaApple } from 'react-icons/fa';

const Download = () => {
  return (
    <div className="pt-32 pb-24 min-h-screen bg-bg">
      <div className="max-w-[1200px] mx-auto px-6">
        
        {/* Header */}
        <div className="text-center mb-16">
          <h1 className="text-4xl md:text-6xl font-display font-medium text-white mb-6">
            Get SAMS for Mobile
          </h1>
          <p className="text-xl text-text-muted max-w-2xl mx-auto font-light leading-relaxed">
            Experience the full power of the Smart Attendance Management System on your device. 
            Real-time tracking, offline mode, and instant sync.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto mb-20">
          {/* Android Card - Primary */}
          <div className="bg-surface p-10 rounded-[32px] border border-primary/20 hover:border-primary/50 transition-all group relative overflow-hidden shadow-2xl">
             <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity transform group-hover:scale-110 duration-700">
                <FaAndroid className="text-[180px] text-primary" />
             </div>
             
             <div className="relative z-10 flex flex-col h-full">
                <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mb-8 text-primary text-3xl">
                    <FaAndroid />
                </div>
                
                <h3 className="text-3xl font-display font-medium text-white mb-4">Android</h3>
                <div className="space-y-3 mb-8">
                    <div className="flex items-center gap-3 text-text-muted">
                        <FiCheck className="text-primary" /> <span>Compatible with Android 8.0+</span>
                    </div>
                    <div className="flex items-center gap-3 text-text-muted">
                        <FiCheck className="text-primary" /> <span>Background Location Support</span>
                    </div>
                    <div className="flex items-center gap-3 text-text-muted">
                        <FiCheck className="text-primary" /> <span>Offline Data Sync</span>
                    </div>
                </div>

                <div className="mt-auto">
                    <button className="w-full bg-primary hover:bg-primary-dark text-[#171717] font-medium py-4 rounded-xl flex items-center justify-center gap-3 transition-colors text-lg shadow-lg shadow-primary/25">
                        <FiDownload className="text-xl" /> Download APK
                    </button>
                    <div className="mt-4 flex items-center justify-center gap-2 text-xs text-text-muted bg-white/5 p-3 rounded-lg border border-white/5">
                        <FiInfo className="flex-shrink-0" />
                        <span className="font-mono">v1.2.0 (Beta) • 45MB • arm64-v8a</span>
                    </div>
                </div>
             </div>
          </div>

          {/* iOS Card - Secondary */}
          <div className="bg-surface p-10 rounded-[32px] border border-white/5 relative overflow-hidden flex flex-col">
             <div className="absolute top-0 right-0 p-8 opacity-5">
                <FaApple className="text-[180px] text-white" />
             </div>
             
             <div className="relative z-10">
                <div className="w-16 h-16 bg-white/5 rounded-2xl flex items-center justify-center mb-8 text-white text-3xl">
                    <FaApple />
                </div>
                <h3 className="text-3xl font-display font-medium text-white mb-4">iOS</h3>
                 <p className="text-text-muted mb-8 leading-relaxed">
                   We are currently in TestFlight beta. Join the waitlist to get early access to the iOS version when it becomes available.
                </p>
                
                <div className="space-y-4">
                     <button disabled className="w-full bg-white/5 text-text-muted font-medium py-4 rounded-xl flex items-center justify-center gap-2 cursor-not-allowed border border-white/5">
                        <FiSmartphone /> Join TestFlight
                    </button>
                    <p className="text-xs text-center text-text-muted">
                        Expected availability: Q2 2025
                    </p>
                </div>
             </div>
          </div>
        </div>

        {/* QR Code Section */}
        <div className="max-w-xl mx-auto text-center bg-surface p-8 rounded-3xl border border-white/5">
            <h3 className="text-white font-medium mb-4">Scan to Download</h3>
            <p className="text-sm text-text-muted mb-6">Use your phone's camera to download the app directly.</p>
            <div className="w-48 h-48 bg-white mx-auto rounded-xl p-2 mb-4">
                 {/* Placeholder for QR Code */}
                 <div className="w-full h-full bg-black/10 rounded-lg flex items-center justify-center">
                    <FiSmartphone className="text-6xl text-black/20" />
                 </div>
            </div>
             <p className="text-xs text-text-muted font-mono">scan.sams.app/dl</p>
        </div>

      </div>
    </div>
  );
};

export default Download;
