import React, { useEffect, useState } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import { 
  TrendingUp, Users, CheckSquare, Clock, FileText, ArrowRight, Briefcase, Eye, ClipboardCheck
} from 'lucide-react';
import { UserRole, JobStatus, Job, Application } from '../types';
import { db } from '../services/database';
import { useNavigate } from 'react-router-dom';

interface DashboardProps {
  role: UserRole;
}

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
  <div className="glass-card p-8 rounded-3xl transition-all duration-300 group hover:-translate-y-1">
    <div className="flex items-start justify-between">
      <div>
        <p className="text-[10px] font-black text-zinc-400 dark:text-zinc-500 uppercase tracking-[0.2em] mb-3">{title}</p>
        <h3 className="text-4xl font-black text-zinc-900 dark:text-white tracking-tighter">{value}</h3>
      </div>
      <div className={`p-4 rounded-2xl ${color || 'bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400'} group-hover:scale-110 transition-transform`}>
        <Icon className="w-6 h-6" />
      </div>
    </div>
    {trend && (
        <div className="mt-6 flex items-center text-[10px] text-green-600 dark:text-green-400 font-black bg-green-50 dark:bg-green-900/20 w-fit px-3 py-1.5 rounded-xl uppercase tracking-widest">
            <TrendingUp className="w-3 h-3 mr-2" />
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
             setRecentJobs(jobs);
        } else {
             setRecentJobs(jobs.filter(j => j.createdBy === user.name));
        }

        setIsLoading(false);
    };

    loadData();
  }, [role]);

  if (isLoading) return <div className="flex justify-center p-20"><div className="animate-pulse font-bold text-zinc-400">Loading Tasker Stats...</div></div>;

  return (
    <div className="space-y-10 animate-fade-in">
       {/* KPIs */}
       <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <KPICard 
            title={role === UserRole.APPLICANT ? "Assigned Tasks" : "Total Tasks Created"} 
            value={role === UserRole.APPLICANT ? myApplications.length.toString() : recentJobs.length.toString()} 
            icon={ClipboardCheck} 
          />
          <KPICard 
            title={role === UserRole.APPLICANT ? "Hours Resolved" : "Active Tasks"} 
            value={role === UserRole.APPLICANT ? "42.5" : activeJobsCount.toString()} 
            icon={CheckSquare} 
            color="bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400"
          />
          <KPICard 
            title={role === UserRole.APPLICANT ? "Current Credits" : "Pending Review"} 
            value={role === UserRole.APPLICANT ? "1.2k" : recentJobs.filter(j => j.status === JobStatus.PENDING).length.toString()} 
            icon={Clock} 
            color="bg-amber-50 text-amber-600 dark:bg-amber-900/20 dark:text-amber-400"
          />
          <KPICard 
            title={role === UserRole.APPLICANT ? "Trust Score" : "Collaborators"} 
            value={role === UserRole.APPLICANT ? "98%" : (activeJobsCount * 3).toString()} 
            icon={Users} 
            color="bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400"
          />
       </div>

       <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 glass-card p-10 rounded-[2.5rem]">
             <div className="flex items-center justify-between mb-10">
                <h3 className="text-2xl font-black text-zinc-900 dark:text-white tracking-tighter">
                    {role === UserRole.MANAGER ? 'Task Resolution Activity' : 'Recent Task Activity'}
                </h3>
                <button onClick={() => navigate('/jobs')} className="text-xs font-black uppercase tracking-widest text-red-600 hover:underline">View All Tasks</button>
             </div>
             
             <div className="overflow-x-auto">
                 <table className="w-full">
                     <thead>
                         <tr className="text-left text-[10px] font-black text-zinc-400 uppercase tracking-[0.2em] border-b border-white/20 dark:border-white/5">
                             <th className="pb-6 pl-2">Task Designation</th>
                             <th className="pb-6">Domain</th>
                             <th className="pb-6">Status</th>
                             <th className="pb-6 text-right">Action</th>
                         </tr>
                     </thead>
                     <tbody className="divide-y divide-white/20 dark:divide-white/5">
                         {recentJobs.slice(0, 6).map((job) => (
                             <tr key={job.id} className="group hover:bg-white/40 dark:hover:bg-white/5 transition-all">
                                 <td className="py-6 pl-2 font-black text-zinc-900 dark:text-white text-base tracking-tight">{job.title}</td>
                                 <td className="py-6 text-sm font-semibold text-zinc-500 dark:text-zinc-400">{job.category}</td>
                                 <td className="py-6">
                                     <span className={`px-3 py-1.5 text-[10px] font-black rounded-xl uppercase tracking-widest border ${getStatusColor(job.status)}`}>
                                        {job.status}
                                     </span>
                                 </td>
                                 <td className="py-6 text-right">
                                     <button 
                                        onClick={() => navigate(`/jobs/${job.id}`)}
                                        className="p-3 bg-white/60 dark:bg-zinc-800/60 hover:bg-red-600 hover:text-white rounded-2xl transition-all shadow-sm"
                                     >
                                         <ArrowRight className="w-4 h-4" />
                                     </button>
                                 </td>
                             </tr>
                         ))}
                     </tbody>
                 </table>
             </div>
          </div>

          <div className="glass-card p-10 rounded-[2.5rem]">
              <h3 className="text-2xl font-black text-zinc-900 dark:text-white tracking-tighter mb-10">Recent Submissions</h3>
              <div className="space-y-8">
                   {(role === UserRole.MANAGER ? [
                       { name: 'Nasir', status: 'Pending', job: 'Backend Dev' },
                       { name: 'Ali Raza', status: 'Resolved', job: 'Sys Admin' },
                       { name: 'Shumaila', status: 'Declined', job: 'Data Entry' }
                   ] : []).map((app, i) => (
                       <div key={i} className="flex items-center justify-between group cursor-pointer">
                           <div className="flex items-center">
                               <img src={`https://i.pravatar.cc/100?u=${app.name}`} alt="" className="w-12 h-12 rounded-2xl object-cover border-2 border-white dark:border-zinc-800" />
                               <div className="ml-4">
                                   <p className="text-sm font-black text-zinc-900 dark:text-white group-hover:text-red-600 transition-colors">{app.name}</p>
                                   <p className="text-xs font-bold text-zinc-500 dark:text-zinc-400">{app.job}</p>
                               </div>
                           </div>
                           <span className={`text-[9px] font-black px-3 py-1 rounded-full uppercase tracking-widest ${
                               app.status === 'Resolved' ? 'bg-emerald-100 text-emerald-800' : 
                               app.status === 'Declined' ? 'bg-red-100 text-red-800' : 'bg-amber-100 text-amber-800'
                           }`}>
                               {app.status}
                           </span>
                       </div>
                   ))}
                   
                   {role !== UserRole.MANAGER && (
                        <div className="text-center py-20">
                             <FileText className="w-12 h-12 text-zinc-300 dark:text-zinc-700 mx-auto mb-4" />
                             <p className="text-sm font-bold text-zinc-400">No new submissions found</p>
                        </div>
                   )}
              </div>
          </div>
       </div>
    </div>
  );
};