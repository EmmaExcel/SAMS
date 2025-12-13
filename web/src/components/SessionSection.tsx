import { useState, useEffect } from 'react';
import { FiClock, FiPlay, FiStopCircle, FiCheck, FiArrowRight, FiUsers, FiWifi } from 'react-icons/fi';
import { motion, AnimatePresence } from 'framer-motion';

const SessionSection = () => {
  const INITIAL_TIME = 5 * 60; 
  const [isActive, setIsActive] = useState(false);
  const [timeLeft, setTimeLeft] = useState(INITIAL_TIME);
  const [studentCount, setStudentCount] = useState(0);
  const [scannedStudents, setScannedStudents] = useState<string[]>([]);

  const STUDENTS = [
    "Alex M.", "Sarah K.", "John D.", "Emily R.", "Michael B.", 
    "Jessica T.", "David W.", "Sophia L.", "James H.", "Olivia P."
  ];

  
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')} : ${secs.toString().padStart(2, '0')}`;
  };

  
  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (isActive && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft((prev) => prev - 1);
      }, 1000);
    } else if (timeLeft === 0) {
      setIsActive(false);
    }
    return () => clearInterval(interval);
  }, [isActive, timeLeft]);

  
  useEffect(() => {
    let studentInterval: ReturnType<typeof setInterval>;
    if (isActive) {
      studentInterval = setInterval(() => {
        if (Math.random() > 0.4) {
           const newStudent = STUDENTS[Math.floor(Math.random() * STUDENTS.length)];
           setScannedStudents(prev => {
             if (prev.includes(newStudent)) return prev;
             return [newStudent, ...prev].slice(0, 3); 
           });
           setStudentCount(prev => prev + 1);
        }
      }, 1500);
    } else {
        setScannedStudents([]);
        setStudentCount(0);
    }
    return () => clearInterval(studentInterval);
  }, [isActive]);

  const handleStart = () => setIsActive(true);
  const handleStop = () => setIsActive(false);

  const progressPercentage = (timeLeft / INITIAL_TIME) * 100;

  return (
    <section className="py-24 relative overflow-hidden">
      <div className="max-w-[1400px] mx-auto px-6 grid lg:grid-cols-2 gap-20 items-center">
        
        {}
        <div className="relative perspective-1000">
             {}
             <motion.div 
               animate={{ 
                 opacity: isActive ? [0.2, 0.3, 0.2] : 0.2,
                 scale: isActive ? [1, 1.05, 1] : 1
               }}
               transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
               className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[90%] h-[90%] bg-primary blur-[100px] -z-10 rounded-full" 
             />

            <motion.div 
               initial={{ rotate: -2, y: 0 }}
               whileHover={{ rotate: 0, scale: 1.02 }}
               transition={{ type: "spring", stiffness: 300, damping: 20 }}
               className="bg-surface p-6 rounded-[32px] shadow-2xl border border-white/5 max-w-[420px] mx-auto relative z-10"
            >
                {}
                <div className="bg-[#2e2f31] rounded-[24px] p-5 mb-5 text-text-main transition-colors duration-300">
                    <div className="flex justify-between items-center mb-4">
                        <div className={`flex items-center gap-2 text-sm font-medium transition-colors duration-300 ${isActive ? 'text-green-400' : 'text-gray-400'}`}>
                            <div className={`p-0.5 rounded-full w-5 h-5 flex items-center justify-center ${isActive ? 'bg-green-400/20' : 'bg-gray-400/20'}`}>
                                {isActive ? <FiCheck /> : <div className="w-2 h-2 bg-gray-400 rounded-full" />}
                            </div>
                            {isActive ? 'Attendance Active' : 'Session Paused'}
                        </div>
                        <span className="text-xs bg-white/5 px-3 py-1 rounded-full text-text-muted">Automatic Mode</span>
                    </div>
                    
                    <div className="text-sm text-text-muted mb-1">Mth565: Advanced Algorithms</div>
                    <div className="flex justify-between text-xs text-text-muted mb-6">
                        <span>Started: 3:17 AM</span>
                        <motion.span 
                          key={studentCount}
                          initial={{ scale: 1.2, color: "#fff" }}
                          animate={{ scale: 1, color: "#9ca3af" }}
                        >
                            {studentCount} students
                        </motion.span>
                    </div>

                    <div className="bg-[#1e1e1e] rounded-[20px] p-4 text-center border border-white/5 relative overflow-hidden">
                        <div className="text-text-muted text-xs font-bold tracking-wider mb-1">TIME REMAINING</div>
                        <div className="text-4xl font-mono font-bold text-white mb-3 flex items-center justify-center gap-2">
                             <FiClock className={`w-6 h-6 transition-colors duration-300 ${isActive ? 'text-secondary animate-pulse' : 'text-gray-500'}`} /> 
                             {formatTime(timeLeft)}
                        </div>
                        <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
                            <motion.div 
                                className="h-full bg-primary rounded-full"
                                initial={{ width: "100%" }}
                                animate={{ width: `${progressPercentage}%` }}
                                transition={{ ease: "linear", duration: 1 }} 
                            />
                        </div>
                    </div>
                </div>

                {}
                <div className="grid grid-cols-2 gap-3 mb-5">
                    <motion.button 
                        whileTap={{ scale: 0.95 }}
                        onClick={handleStart}
                        className={`py-3 rounded-xl font-medium flex items-center justify-center gap-2 transition-all duration-300 ${isActive ? 'bg-primary/20 text-primary cursor-default' : 'bg-primary text-bg hover:bg-primary-dark shadow-lg shadow-primary/20'}`}
                        disabled={isActive}
                    >
                        <FiPlay className="fill-current" /> {isActive ? 'Running' : 'Start'}
                    </motion.button>
                    <motion.button 
                        whileTap={{ scale: 0.95 }}
                        onClick={handleStop}
                        className={`py-3 rounded-xl font-medium flex items-center justify-center gap-2 transition-all duration-300 ${!isActive ? 'bg-white/5 text-gray-500 cursor-not-allowed' : 'bg-red-500/80 hover:bg-red-500 text-white shadow-lg shadow-red-500/20'}`}
                        disabled={!isActive}
                    >
                        <FiStopCircle /> Stop
                    </motion.button>
                </div>

                {}
                <div className="bg-[#2e2f31] rounded-[24px] p-6 text-center relative overflow-hidden flex flex-col items-center justify-center border border-white/5 h-[160px]">
                    <AnimatePresence mode='wait'>
                        {isActive ? (
                            <motion.div 
                                key="list"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className="w-full h-full flex flex-col"
                            >   
                                <div className="flex items-center justify-between mb-3 px-1">
                                    <h3 className="text-white font-medium text-sm flex items-center gap-2">
                                        <span className="relative flex h-2 w-2">
                                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                                          <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                                        </span>
                                        Live Feed
                                    </h3>
                                    <span className="text-[10px] text-text-muted bg-white/5 px-2 py-0.5 rounded-full">Real-time</span>
                                </div>
                                
                                <div className="flex-1 space-y-2 overflow-hidden relative">
                                    <AnimatePresence initial={false}>
                                        {scannedStudents.length === 0 ? (
                                            <motion.div
                                                initial={{ opacity: 0 }}
                                                animate={{ opacity: 1 }}
                                                exit={{ opacity: 0 }}
                                                className="absolute inset-0 flex flex-col items-center justify-center text-text-muted"
                                            >
                                                <FiWifi className="w-6 h-6 mb-2 animate-pulse text-secondary" />
                                                <span className="text-xs">Scanning...</span>
                                            </motion.div>
                                        ) : (
                                            scannedStudents.map((student, i) => (
                                                <motion.div
                                                    key={`${student}-${i}`}
                                                    initial={{ opacity: 0, x: -20, height: 0 }}
                                                    animate={{ opacity: 1, x: 0, height: 'auto' }}
                                                    exit={{ opacity: 0, height: 0 }}
                                                    className="bg-white/5 rounded-lg p-2.5 flex items-center justify-between border border-white/5"
                                                >
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-6 h-6 rounded-full bg-linear-to-br from-primary to-blue-600 flex items-center justify-center text-[10px] text-bg font-bold">
                                                            {student.charAt(0)}
                                                        </div>
                                                        <span className="text-xs text-text-main font-medium">{student}</span>
                                                    </div>
                                                    <FiCheck className="text-green-400 w-3 h-3" />
                                                </motion.div>
                                            ))
                                        )}
                                    </AnimatePresence>
                                </div>
                            </motion.div>
                        ) : (
                            <motion.div 
                                key="waiting"
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                className="flex flex-col items-center justify-center h-full"
                            >
                                <FiUsers className="w-8 h-8 text-text-muted mx-auto mb-3" />
                                <h3 className="text-white font-medium text-lg mb-1">Ready to Start</h3>
                                <p className="text-text-muted text-xs max-w-[200px] mx-auto text-center mb-0">
                                    Press Start to begin attendance
                                </p>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </motion.div>
        </div>

        {}
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

            <button className="text-primary font-medium text-lg hover:text-primary-dark inline-flex items-center gap-2 group">
                See how it works <FiArrowRight className="transition-transform group-hover:translate-x-1" />
            </button>
        </div>

      </div>
    </section>
  );
};

export default SessionSection;
