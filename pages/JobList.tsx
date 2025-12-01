import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, MapPin, Clock, Filter, ArrowRight } from 'lucide-react';
import { JobCategory, JobStatus, RewardType, Job } from '../types';
import { db } from '../services/database';
import { getStatusColor } from './Dashboard';

export const JobList: React.FC = () => {
    const navigate = useNavigate();
    const [searchTerm, setSearchTerm] = useState('');
    const [filterCategory, setFilterCategory] = useState<string>('All');
    const [jobs, setJobs] = useState<Job[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchJobs = async () => {
            const data = await db.getJobs();
            setJobs(data);
            setLoading(false);
        };
        fetchJobs();
    }, []);

    const filteredJobs = jobs.filter(job => {
        const matchesSearch = job.title.toLowerCase().includes(searchTerm.toLowerCase()) || job.description.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesCategory = filterCategory === 'All' || job.category === filterCategory;
        // Ideally filter by published status for applicants, but we show all for demo
        return matchesSearch && matchesCategory;
    });

    if (loading) {
        return <div className="text-center py-20 text-zinc-500 dark:text-zinc-400">Loading jobs...</div>;
    }

    return (
        <div className="space-y-8 animate-fade-in">
            <div className="bg-zinc-900 dark:bg-white rounded-2xl p-8 md:p-12 text-white dark:text-zinc-900 relative overflow-hidden shadow-2xl shadow-zinc-200 dark:shadow-zinc-900/30">
                <div className="absolute top-0 right-0 w-64 h-64 bg-white dark:bg-black opacity-5 rounded-full -mr-16 -mt-16 blur-3xl"></div>
                <div className="relative z-10 max-w-2xl">
                    <h2 className="text-3xl md:text-4xl font-bold mb-4">Find Your Next Role</h2>
                    <p className="text-zinc-400 dark:text-zinc-600 text-lg mb-8">Browse opportunities to volunteer, work, and earn rewards within the community.</p>
                    
                    {/* Search Bar */}
                    <div className="flex flex-col md:flex-row gap-3">
                        <div className="flex-1 relative text-zinc-900">
                            <Search className="absolute left-4 top-4 text-zinc-400 w-5 h-5" />
                            <input 
                                type="text"
                                placeholder="Search by keyword..."
                                className="w-full pl-12 pr-4 py-4 rounded-xl focus:ring-2 focus:ring-white dark:focus:ring-zinc-900 focus:outline-none shadow-lg dark:shadow-sm"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                        <div className="w-full md:w-56 relative text-zinc-900">
                            <Filter className="absolute left-4 top-4 text-zinc-400 w-4 h-4" />
                            <select 
                                className="w-full pl-10 pr-8 py-4 rounded-xl focus:ring-2 focus:ring-white dark:focus:ring-zinc-900 focus:outline-none appearance-none shadow-lg dark:shadow-sm cursor-pointer bg-white"
                                value={filterCategory}
                                onChange={(e) => setFilterCategory(e.target.value)}
                            >
                                <option value="All">All Categories</option>
                                {Object.values(JobCategory).map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                        </div>
                    </div>
                </div>
            </div>

            {/* Job Cards */}
            <div className="grid gap-5">
                {filteredJobs.map(job => (
                    <div 
                        key={job.id} 
                        onClick={() => navigate(`/jobs/${job.id}`)}
                        className="bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 rounded-2xl p-6 md:p-8 hover:shadow-[0_20px_40px_-15px_rgba(0,0,0,0.1)] dark:hover:shadow-[0_20px_40px_-15px_rgba(0,0,0,0.5)] transition-all duration-300 group cursor-pointer relative top-0 hover:-top-1"
                    >
                        <div className="flex flex-col md:flex-row justify-between items-start gap-6">
                            <div className="flex-1">
                                <div className="flex flex-wrap items-center gap-2 mb-3">
                                    <span className={`px-2.5 py-1 text-xs font-bold rounded-md uppercase tracking-wide border ${getStatusColor(job.status)}`}>
                                        {job.status}
                                    </span>
                                    <span className="px-2.5 py-1 bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 text-xs font-bold rounded-md uppercase tracking-wide border border-zinc-200 dark:border-zinc-700">
                                        {job.category}
                                    </span>
                                    {job.rewardType !== RewardType.VOLUNTEER && (
                                        <span className="px-2.5 py-1 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 text-xs font-bold rounded-md uppercase tracking-wide flex items-center shadow-sm">
                                           {job.rewardType}
                                        </span>
                                    )}
                                </div>
                                <h3 className="text-xl font-bold text-zinc-900 dark:text-white group-hover:text-zinc-700 dark:group-hover:text-zinc-300 transition-colors mb-2">{job.title}</h3>
                                <p className="text-zinc-500 dark:text-zinc-400 text-sm line-clamp-2 leading-relaxed max-w-3xl">{job.description}</p>
                                
                                <div className="flex flex-wrap items-center gap-6 mt-6 text-sm font-medium text-zinc-500 dark:text-zinc-400">
                                    <div className="flex items-center bg-zinc-50 dark:bg-zinc-800 px-3 py-1.5 rounded-lg">
                                        <MapPin className="w-4 h-4 mr-2 text-zinc-400" />
                                        {job.location}
                                    </div>
                                    <div className="flex items-center bg-zinc-50 dark:bg-zinc-800 px-3 py-1.5 rounded-lg">
                                        <Clock className="w-4 h-4 mr-2 text-zinc-400" />
                                        {job.hoursRequired} hrs
                                    </div>
                                    {job.rewardValue && (
                                        <div className="text-zinc-900 dark:text-zinc-200 font-semibold">
                                            Reward: {job.rewardValue} {job.rewardType === RewardType.VIA_POINTS ? 'Pts' : ''}
                                        </div>
                                    )}
                                </div>
                            </div>
                            
                            <div className="hidden md:flex flex-col items-center justify-center h-full pl-6 border-l border-zinc-50 dark:border-zinc-800">
                                <div className="w-10 h-10 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-400 group-hover:bg-zinc-900 dark:group-hover:bg-zinc-100 group-hover:text-white dark:group-hover:text-zinc-900 transition-all duration-300">
                                    <ArrowRight className="w-5 h-5" />
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
                
                {!loading && filteredJobs.length === 0 && (
                    <div className="text-center py-20 bg-white dark:bg-zinc-900 rounded-2xl border border-dashed border-zinc-200 dark:border-zinc-800">
                        <div className="mx-auto w-16 h-16 bg-zinc-50 dark:bg-zinc-800 rounded-full flex items-center justify-center mb-4">
                            <Search className="w-8 h-8 text-zinc-300 dark:text-zinc-600" />
                        </div>
                        <h3 className="text-lg font-bold text-zinc-900 dark:text-white">No jobs found</h3>
                        <p className="text-zinc-500 dark:text-zinc-400">Try adjusting your filters or search terms.</p>
                    </div>
                )}
            </div>
        </div>
    );
};