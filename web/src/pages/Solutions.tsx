import { FiCode, FiSmartphone, FiGlobe, FiBarChart2, FiUserCheck, FiArrowRight } from 'react-icons/fi';

const solutions = [
  {
    title: 'Attendance for Lecturers',
    description: 'Streamline class roll‑calls, automate session timers and get real‑time insights.',
    icon: <FiUserCheck className='text-4xl text-primary' />, // placeholder
    link: '#',
  },
  {
    title: 'Student Mobile App',
    description: 'Allow students to view their attendance records, receive notifications, and sync with the platform.',
    icon: <FiSmartphone className='text-4xl text-primary' />, 
    link: '#',
  },
  {
    title: 'Analytics Dashboard',
    description: 'Visualize attendance trends, export CSV reports, and integrate with BI tools.',
    icon: <FiBarChart2 className='text-4xl text-primary' />, 
    link: '#',
  },
  {
    title: 'API & Integrations',
    description: 'RESTful API, webhooks and SDKs to embed attendance data in your own systems.',
    icon: <FiCode className='text-4xl text-primary' />, 
    link: '#',
  },
  {
    title: 'Cross‑Platform Support',
    description: 'Web, Android and iOS clients share the same data model for a unified experience.',
    icon: <FiGlobe className='text-4xl text-primary' />, 
    link: '#',
  },
];

const Solutions = () => {
  return (
    <section className="pt-32 pb-24 min-h-screen bg-bg">
      <div className="max-w-[1400px] mx-auto px-6">
        {/* Hero */}
        <div className="text-center mb-16">
          <h1 className="text-5xl md:text-6xl font-display font-medium text-white mb-6">
            Solutions for Smart Attendance
          </h1>
          <p className="text-xl text-text-muted max-w-2xl mx-auto font-light">
            Choose the right set of tools for lecturers, administrators, and students. All built on a secure, real‑time backend.
          </p>
        </div>

        {/* Grid of solution cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {solutions.map((s, i) => (
            <a key={i} href={s.link} className="group bg-surface p-8 rounded-2xl border border-white/5 hover:border-white/10 transition-colors shadow-lg hover:shadow-2xl">
              <div className="flex flex-col items-center text-center">
                <div className="mb-6 text-primary">
                  {s.icon}
                </div>
                <h3 className="text-2xl font-display font-medium text-white mb-3">
                  {s.title}
                </h3>
                <p className="text-text-muted mb-4">
                  {s.description}
                </p>
                <span className="text-primary font-medium inline-flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                  Learn more <FiArrowRight className="text-sm" />
                </span>
              </div>
            </a>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Solutions;
