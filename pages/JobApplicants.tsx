
import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { db } from '../services/database';
import { Application, Job } from '../types';
import { ArrowLeft, Mail, User } from 'lucide-react';

export const JobApplicants: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [applicants, setApplicants] = useState<Application[]>([]);
    const [job, setJob] = useState<Job | undefined>();
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            if (id) {
                const [jobData, appsData] = await Promise.all([
                    db.getJob(id),
                    db.getApplicationsForJob(id)
                ]);
                setJob(jobData);
                setApplicants(appsData);
                setLoading(false);
            }
        };
        fetchData();
    }, [id]);

    if (loading) return <div className="p-10 text-center animate-pulse">Loading applicants...</div>;
    if (!job) return <div>Job not found</div>;

    return (
        <div className="max-w-5xl mx-auto space-y-6 animate-fade-in">
            <button 
                onClick={() => navigate(`/jobs/${id}`)}
                className="flex items-center text-sm text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors"
            >
                <ArrowLeft className="w-4 h-4 mr-2" /> Back to Job
            </button>

            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-6 rounded-2xl">
                <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">Applicants</h1>
                <p className="text-zinc-500 dark:text-zinc-400">Manage candidates for <span className="font-semibold text-zinc-900 dark:text-zinc-200">{job.title}</span></p>
            </div>

            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-zinc-50 dark:bg-zinc-800 border-b border-zinc-200 dark:border-zinc-700">
                            <tr>
                                <th className="px-6 py-4 text-left text-xs font-bold text-zinc-500 uppercase tracking-wider">Image</th>
                                <th className="px-6 py-4 text-left text-xs font-bold text-zinc-500 uppercase tracking-wider">Name</th>
                                <th className="px-6 py-4 text-left text-xs font-bold text-zinc-500 uppercase tracking-wider">Email</th>
                                <th className="px-6 py-4 text-left text-xs font-bold text-zinc-500 uppercase tracking-wider">Status</th>
                                <th className="px-6 py-4 text-right text-xs font-bold text-zinc-500 uppercase tracking-wider">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                            {applicants.map((app) => (
                                <tr key={app.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors">
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <img src={app.applicantAvatar || "https://i.pravatar.cc/150"} alt="" className="w-10 h-10 rounded-full bg-zinc-200" />
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-zinc-900 dark:text-white">{app.applicantName}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-zinc-500 dark:text-zinc-400">{app.applicantEmail}</td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                            app.status === 'Approved' ? 'bg-green-100 text-green-800' : 
                                            app.status === 'Rejected' ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'
                                        }`}>
                                            {app.status}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                        <button 
                                            onClick={() => navigate(`/application/${app.id}`)}
                                            className="text-zinc-600 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white bg-zinc-100 dark:bg-zinc-800 px-3 py-1.5 rounded-lg transition-colors"
                                        >
                                            View
                                        </button>
                                    </td>
                                </tr>
                            ))}
                            {applicants.length === 0 && (
                                <tr>
                                    <td colSpan={5} className="px-6 py-10 text-center text-zinc-500">No applicants yet.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};
