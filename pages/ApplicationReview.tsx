
import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { db } from '../services/database';
import { Application, Job } from '../types';
import { ArrowLeft, CheckCircle, XCircle, Calendar, User, Mail, Phone, MapPin } from 'lucide-react';

export const ApplicationReview: React.FC = () => {
    const { appId } = useParams<{ appId: string }>();
    const navigate = useNavigate();
    const [app, setApp] = useState<Application | undefined>();
    const [job, setJob] = useState<Job | undefined>();
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            if (appId) {
                const application = await db.getApplication(appId);
                if (application) {
                    setApp(application);
                    const jobData = await db.getJob(application.jobId);
                    setJob(jobData);
                }
                setLoading(false);
            }
        };
        fetchData();
    }, [appId]);

    const handleStatusUpdate = async (status: 'Approved' | 'Rejected') => {
        if (app) {
            await db.updateApplicationStatus(app.id, status);
            setApp({ ...app, status });
        }
    };

    if (loading) return <div className="p-10 text-center animate-pulse">Loading application...</div>;
    if (!app || !job) return <div>Application not found</div>;

    return (
        <div className="max-w-4xl mx-auto space-y-6 animate-fade-in pb-20">
             <button 
                onClick={() => navigate(-1)}
                className="flex items-center text-sm text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors"
            >
                <ArrowLeft className="w-4 h-4 mr-2" /> Back
            </button>

            {/* Header */}
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 shadow-sm">
                <div className="flex items-center gap-4">
                    <img src={app.applicantAvatar} alt="" className="w-16 h-16 rounded-full bg-zinc-200 object-cover" />
                    <div>
                        <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">{app.applicantName}</h1>
                        <p className="text-zinc-500 dark:text-zinc-400 text-sm">{app.applicantEmail}</p>
                        <div className="flex items-center gap-2 mt-2">
                            <span className="text-xs font-semibold bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 px-2 py-1 rounded">
                                Applied for: {job.title}
                            </span>
                        </div>
                    </div>
                </div>
                <div className="flex flex-col items-end">
                    <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide mb-2 ${
                        app.status === 'Approved' ? 'bg-green-100 text-green-800' : 
                        app.status === 'Rejected' ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'
                    }`}>
                        {app.status}
                    </span>
                    <p className="text-xs text-zinc-400">Applied on {new Date(app.appliedAt).toLocaleDateString()}</p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="md:col-span-2 space-y-6">
                    {/* Cover Letter */}
                    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6">
                        <h3 className="text-sm font-bold text-zinc-400 uppercase tracking-wide mb-4">Cover Letter</h3>
                        <p className="text-zinc-700 dark:text-zinc-300 whitespace-pre-wrap leading-relaxed">
                            {app.coverLetter}
                        </p>
                    </div>
                    
                    {/* Availability */}
                    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6">
                         <h3 className="text-sm font-bold text-zinc-400 uppercase tracking-wide mb-4">Expected Availability</h3>
                         <div className="flex items-start gap-3 p-4 bg-zinc-50 dark:bg-zinc-800/50 rounded-xl">
                            <Calendar className="w-5 h-5 text-zinc-400 mt-0.5" />
                            <p className="text-zinc-900 dark:text-zinc-200 font-medium">{app.availability}</p>
                         </div>
                    </div>
                </div>

                {/* Sidebar Info */}
                <div className="space-y-6">
                     <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6">
                        <h3 className="text-sm font-bold text-zinc-400 uppercase tracking-wide mb-4">Applicant Details</h3>
                        <div className="space-y-4">
                            <div className="flex items-center gap-3 text-sm text-zinc-600 dark:text-zinc-400">
                                <Mail className="w-4 h-4" /> {app.applicantEmail}
                            </div>
                            <div className="flex items-center gap-3 text-sm text-zinc-600 dark:text-zinc-400">
                                <Phone className="w-4 h-4" /> +61 412 345 678
                            </div>
                            <div className="flex items-center gap-3 text-sm text-zinc-600 dark:text-zinc-400">
                                <MapPin className="w-4 h-4" /> Melbourne, VIC
                            </div>
                        </div>
                     </div>

                     <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6">
                        <h3 className="text-sm font-bold text-zinc-400 uppercase tracking-wide mb-4">Actions</h3>
                        <div className="space-y-3">
                            <button 
                                onClick={() => handleStatusUpdate('Approved')}
                                className="w-full py-3 bg-emerald-600 text-white rounded-xl font-semibold hover:bg-emerald-700 flex items-center justify-center transition-colors"
                            >
                                <CheckCircle className="w-4 h-4 mr-2" /> Mark as Approved
                            </button>
                            <button 
                                onClick={() => handleStatusUpdate('Rejected')}
                                className="w-full py-3 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-red-600 rounded-xl font-semibold hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center justify-center transition-colors"
                            >
                                <XCircle className="w-4 h-4 mr-2" /> Reject
                            </button>
                        </div>
                     </div>
                </div>
            </div>
        </div>
    );
};
