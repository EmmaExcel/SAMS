import { FiMap, FiUsers, FiCheckSquare } from 'react-icons/fi';

const Features = () => {
  return (
    <section id="features" className="py-24 relative z-20">
      <div className="max-w-[1400px] mx-auto px-6">
        <h2 className="text-3xl md:text-4xl font-display font-medium text-center mb-16 text-white">
          Everything you need to <span className="text-primary">manage classes</span>
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="bg-surface p-8 rounded-2xl border border-white/5 hover:border-white/10 transition-colors group">
            <div className="w-12 h-12 bg-primary/10 text-primary rounded-lg flex items-center justify-center text-2xl mb-6 group-hover:bg-primary/20 transition-colors">
              <FiMap />
            </div>
            <h3 className="text-xl font-display font-medium mb-3 text-white">Location-Based Tracking</h3>
            <p className="text-text-muted text-sm leading-relaxed mb-6">
              Ensure students are physically present with precise geofenced verification that works indoors and outdoors.
            </p>
            <a href="#" className="text-primary font-medium text-sm hover:text-primary-dark inline-flex items-center gap-1">
              Read docs <span className="text-lg">→</span>
            </a>
          </div>

          <div className="bg-surface p-8 rounded-2xl border border-white/5 hover:border-white/10 transition-colors group">
            <div className="w-12 h-12 bg-secondary/10 text-secondary rounded-lg flex items-center justify-center text-2xl mb-6 group-hover:bg-secondary/20 transition-colors">
              <FiUsers />
            </div>
            <h3 className="text-xl font-display font-medium mb-3 text-white">Student Management</h3>
            <p className="text-text-muted text-sm leading-relaxed mb-6">
              Access detailed profiles, export attendance records, and visualize performance trends over the semester.
            </p>
            <a href="#" className="text-primary font-medium text-sm hover:text-primary-dark inline-flex items-center gap-1">
              View console <span className="text-lg">→</span>
            </a>
          </div>

          <div className="bg-surface p-8 rounded-2xl border border-white/5 hover:border-white/10 transition-colors group">
            <div className="w-12 h-12 bg-green-500/10 text-green-400 rounded-lg flex items-center justify-center text-2xl mb-6 group-hover:bg-green-500/20 transition-colors">
              <FiCheckSquare />
            </div>
            <h3 className="text-xl font-display font-medium mb-3 text-white">Task Assignments</h3>
            <p className="text-text-muted text-sm leading-relaxed mb-6">
               Distribute quizzes and track academic tasks directly through the platform with real-time feedback.
            </p>
            <a href="#" className="text-primary font-medium text-sm hover:text-primary-dark inline-flex items-center gap-1">
              Start building <span className="text-lg">→</span>
            </a>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Features;
