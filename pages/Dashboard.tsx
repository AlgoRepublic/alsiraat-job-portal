
import React, { useEffect, useState } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import { 
  TrendingUp, Users, CheckSquare, Clock, FileText, ArrowRight, Briefcase, Eye
} from 'lucide-react';
import { UserRole, JobStatus, Job, Application } from '../types';
import { db } from '../services/database';
import { useNavigate } from 'react-router-dom';

interface DashboardProps {
  role: UserRole;
}

const mockChartData = [
  { name: 'Jan', jobs: 4, apps: 12 },
  { name: 'Feb', jobs: 7, apps: 25 },
  { name: 'Mar', jobs: 5, apps: 18 },
  { name: 'Apr', jobs: 12, apps: 40 },
  { name: 'May', jobs: 9, apps: 32 },
  { name: 'Jun', jobs: 15, apps: 55 },
];

export const getStatusColor = (status: JobStatus) => {
  switch (status) {
    case JobStatus.PUBLISHED: return 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800';
    case JobStatus.APPROVED: return 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800';
    case JobStatus.DRAFT: return 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-700';
    case JobStatus.PENDING: return 'bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800';
    case JobStatus.CLOSED: return 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300 border border-red-200 dark:border-red-800';
    case JobStatus.DECLINED: return 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300 border border-red-200 dark:border-red-800';
    case JobStatus.ARCHIVED: return 'bg-zinc-800 dark:bg-zinc-700 text-zinc-300 dark:text-zinc-400 border border-zinc-700 dark:border-zinc-600';
    default: return 'bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200';
  }
};

const KPICard: React.FC<{ title: string; value: string; icon: any; trend?: string; color?: string }> = ({ title, value, icon: Icon, trend, color }) => (
  <div className="bg-white dark:bg-zinc-900 p-6 rounded-2xl shadow-[0_2px_8px_rgb(0,0,0,0.04)] dark:shadow-none border border-zinc-100 dark:border-zinc-800 hover:shadow-[0_8px_16px_rgb(0,0,0,0.06)] dark:hover:border-zinc-700 transition-all duration-300 group">
    <div className="flex items-start justify-between">
      <div>
        <p className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">{title}</p>
        <h3 className="text-3xl font-bold text-zinc-900 dark:text-white mt-2">{value}</h3>
      </div>
      <div className={`p-3 rounded-xl ${color || 'bg-zinc-50 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400'} group-hover:bg-zinc-900 dark:group-hover:bg-zinc-100 group-hover:text-white dark:group-hover:text-zinc-900 transition-colors`}>
        <Icon className="w-6 h-6" />
      </div>
    </div>
    {trend && (
        <div className="mt-4 flex items-center text-xs text-green-600 dark:text-green-400 font-medium bg-green-50 dark:bg-green-900/20 w-fit px-2 py-1 rounded-full">
            <TrendingUp className="w-3 h-3 mr-1" />
            <span>{trend}</span>
        </div>
    )}
  </div>
);

export const Dashboard: React.FC<DashboardProps> = ({ role }) => {
  const navigate = useNavigate();
  const [activeJobsCount, setActiveJobsCount] = useState(0);
  const [totalApplications, setTotalApplications] = useState(0);
  const [myApplications, setMyApplications] = useState<Application[]>([]);
  const [recentJobs, setRecentJobs] = useState<Job[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
        setIsLoading(true);
        const [jobs, apps, user] = await Promise.all([
            db.getJobs(),
            db.getApplications(),
            db.getCurrentUser()
        ]);
        
        const published = jobs.filter(j => j.status === JobStatus.PUBLISHED);
        setActiveJobsCount(published.length);
        setTotalApplications(apps.length);
        
        if (role === UserRole.APPLICANT) {
            const myApps = apps.filter(a => a.userId === user.id);
            setMyApplications(myApps);
            setRecentJobs(jobs.slice(0, 5));
        } else if (role === UserRole.MANAGER || role === UserRole.ADMIN) {
             setRecentJobs(jobs); // Managers see all jobs to approve
        } else {
             setRecentJobs(jobs.filter(j => j.createdBy === user.name)); // Advertisers see their own
        }

        setIsLoading(false);
    };

    loadData();
  }, [role]);

  if (isLoading) return <div className="flex justify-center p-20"><div className="animate-pulse">Loading...</div></div>;

  return (
    <div className="space-y-8 animate-fade-in">
       {/* KPIs */}
       <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <KPICard 
            title={role === UserRole.APPLICANT ? "Applications Sent" : "Total Jobs Posted"} 
            value={role === UserRole.APPLICANT ? myApplications.length.toString() : recentJobs.length.toString()} 
            icon={Briefcase} 
          />
          <KPICard 
            title={role === UserRole.APPLICANT ? "Verified Hours" : "Jobs Approved"} 
            value={role === UserRole.APPLICANT ? "40" : activeJobsCount.toString()} 
            icon={CheckSquare} 
            color="bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400"
          />
          <KPICard 
            title={role === UserRole.APPLICANT ? "Total Rewards" : "Pending Jobs"} 
            value={role === UserRole.APPLICANT ? "$3000" : recentJobs.filter(j => j.status === JobStatus.PENDING).length.toString()} 
            icon={Clock} 
            color="bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400"
          />
          <KPICard 
            title={role === UserRole.APPLICANT ? "Complete Job Ratio" : "Active"} 
            value={role === UserRole.APPLICANT ? "40" : activeJobsCount.toString()} 
            icon={Users} 
          />
       </div>

       <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Activity Table */}
          <div className="lg:col-span-2 bg-white dark:bg-zinc-900 p-8 rounded-2xl shadow-[0_2px_8px_rgb(0,0,0,0.04)] dark:shadow-none border border-zinc-100 dark:border-zinc-800">
             <h3 className="text-lg font-bold text-zinc-900 dark:text-white mb-6">
                 {role === UserRole.MANAGER ? 'Job Approval Activity' : 'Recent Activity'}
             </h3>
             
             <div className="overflow-x-auto">
                 <table className="w-full">
                     <thead>
                         <tr className="text-left text-xs font-bold text-zinc-400 uppercase tracking-wider border-b border-zinc-100 dark:border-zinc-800">
                             <th className="pb-4 pl-2">Job Title</th>
                             <th className="pb-4">Category</th>
                             <th className="pb-4">Status</th>
                             <th className="pb-4 text-right">Action</th>
                         </tr>
                     </thead>
                     <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                         {recentJobs.slice(0, 6).map((job) => (
                             <tr key={job.id} className="group hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors">
                                 <td className="py-4 pl-2 font-medium text-zinc-900 dark:text-white">{job.title}</td>
                                 <td className="py-4 text-sm text-zinc-500 dark:text-zinc-400">{job.category}</td>
                                 <td className="py-4">
                                     <span className={`px-2.5 py-1 text-xs font-bold rounded-md uppercase tracking-wide border ${getStatusColor(job.status)}`}>
                                        {job.status}
                                     </span>
                                 </td>
                                 <td className="py-4 text-right">
                                     <button 
                                        onClick={() => navigate(`/jobs/${job.id}`)}
                                        className="text-xs font-semibold px-3 py-1.5 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded-lg text-zinc-600 dark:text-zinc-300 transition-colors"
                                     >
                                         View
                                     </button>
                                 </td>
                             </tr>
                         ))}
                     </tbody>
                 </table>
             </div>
          </div>

          {/* Sidebar Stats / Secondary List */}
          <div className="bg-white dark:bg-zinc-900 p-8 rounded-2xl shadow-[0_2px_8px_rgb(0,0,0,0.04)] dark:shadow-none border border-zinc-100 dark:border-zinc-800">
              <h3 className="text-lg font-bold text-zinc-900 dark:text-white mb-6">Recent Applications</h3>
              <div className="space-y-6">
                   {(role === UserRole.MANAGER ? [
                       { name: 'Nasir', status: 'Pending', job: 'Math Teacher' },
                       { name: 'Ali Raza', status: 'Approved', job: 'Lab Assistant' },
                       { name: 'Shumaila', status: 'Declined', job: 'Helper' }
                   ] : []).map((app, i) => (
                       <div key={i} className="flex items-center justify-between">
                           <div className="flex items-center">
                               <div className="w-8 h-8 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-xs font-bold text-zinc-600 dark:text-zinc-400">
                                   {app.name.charAt(0)}
                               </div>
                               <div className="ml-3">
                                   <p className="text-sm font-bold text-zinc-900 dark:text-white">{app.name}</p>
                                   <p className="text-xs text-zinc-500 dark:text-zinc-400">{app.job}</p>
                               </div>
                           </div>
                           <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                               app.status === 'Approved' ? 'bg-green-100 text-green-700' : 
                               app.status === 'Declined' ? 'bg-red-100 text-red-700' : 'bg-orange-100 text-orange-700'
                           }`}>
                               {app.status}
                           </span>
                       </div>
                   ))}
                   
                   {role === UserRole.ADVERTISER && (
                       <div className="text-center py-10 text-zinc-400 text-sm">No recent applications</div>
                   )}

                   {role === UserRole.APPLICANT && myApplications.map(app => (
                        <div key={app.id} className="p-3 bg-zinc-50 dark:bg-zinc-800 rounded-xl border border-zinc-100 dark:border-zinc-700">
                            <p className="text-sm font-bold text-zinc-900 dark:text-white mb-1">Applied to Job #{app.jobId}</p>
                            <p className="text-xs text-zinc-500">{new Date(app.appliedAt).toLocaleDateString()}</p>
                            <div className="mt-2 text-xs font-semibold text-emerald-600">{app.status}</div>
                        </div>
                   ))}
              </div>
          </div>
       </div>
    </div>
  );
};
