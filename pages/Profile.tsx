import React, { useState, useEffect } from 'react';
import { User, Skill, ApplicantProfile, UserRole } from '../types';
import { Camera, Upload, Trash2, Plus, Star, MapPin, Mail, Phone, Edit2, Check, X } from 'lucide-react';
import { db } from '../services/database';

interface ProfileProps {
    user: User;
}

const UserRoleIcon = ({ role, className }: { role: UserRole, className?: string }) => {
    return <span className={`inline-block w-2 h-2 rounded-full bg-green-500 ${className}`} />;
}

export const Profile: React.FC<ProfileProps> = ({ user }) => {
    // Fetch profile from database
    const [profile, setProfile] = useState<ApplicantProfile | null>(null);
    const [isEditing, setIsEditing] = useState(false);
    const [newSkill, setNewSkill] = useState('');

    useEffect(() => {
        const fetchProfile = async () => {
            const data = await db.getCurrentUser();
            setProfile(data);
        };
        fetchProfile();
    }, [user]);

    const handleSave = async () => {
        if (profile) {
            await db.updateUserProfile(profile);
            setIsEditing(false);
        }
    };

    const handleAddSkill = () => {
        if (!newSkill.trim() || !profile) return;
        const skill: Skill = {
            id: Date.now().toString(),
            name: newSkill,
            level: 'Beginner'
        };
        setProfile(prev => prev ? ({...prev, skills: [...prev.skills, skill]}) : null);
        setNewSkill('');
    };

    const removeSkill = (id: string) => {
        setProfile(prev => prev ? ({...prev, skills: prev.skills.filter(s => s.id !== id)}) : null);
    };

    if (!profile) return <div className="p-8 text-center text-zinc-500 dark:text-zinc-400">Loading profile...</div>;

    return (
        <div className="max-w-4xl mx-auto space-y-8 animate-fade-in">
            {/* Header Card */}
            <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-lg shadow-zinc-200 dark:shadow-none border border-zinc-100 dark:border-zinc-800 overflow-hidden relative group">
                {/* Cover Image */}
                <div className="h-40 bg-zinc-900 dark:bg-zinc-800 w-full relative">
                    <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent"></div>
                </div>
                
                <div className="px-8 pb-8">
                    <div className="relative flex justify-between items-end -mt-12 mb-6">
                        <div className="relative">
                            <img 
                                src={profile.avatar} 
                                alt="Profile" 
                                className="w-28 h-28 rounded-full border-[6px] border-white dark:border-zinc-900 shadow-xl object-cover bg-zinc-100 dark:bg-zinc-800" 
                            />
                            {isEditing && (
                                <button className="absolute bottom-1 right-1 p-2 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 rounded-full hover:bg-zinc-700 dark:hover:bg-zinc-200 shadow-md transition-colors">
                                    <Camera className="w-4 h-4" />
                                </button>
                            )}
                        </div>
                        <button 
                            onClick={() => isEditing ? handleSave() : setIsEditing(true)}
                            className={`px-5 py-2.5 rounded-xl text-sm font-semibold shadow-sm transition-all flex items-center gap-2 ${
                                isEditing 
                                ? 'bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 hover:bg-zinc-800 dark:hover:bg-zinc-200' 
                                : 'bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-700'
                            }`}
                        >
                            {isEditing ? <><Check className="w-4 h-4" /> Save Profile</> : <><Edit2 className="w-4 h-4" /> Edit Profile</>}
                        </button>
                    </div>
                    
                    <div>
                        <h1 className="text-3xl font-bold text-zinc-900 dark:text-white">{profile.name}</h1>
                        <div className="flex flex-wrap items-center gap-4 mt-2 text-zinc-500 dark:text-zinc-400 text-sm font-medium">
                            <span className="flex items-center"><Mail className="w-4 h-4 mr-1.5" /> {profile.email}</span>
                            <span className="flex items-center"><UserRoleIcon role={profile.role} className="w-4 h-4 mr-1.5" /> {profile.role}</span>
                        </div>
                        
                        <div className="mt-8 p-6 bg-zinc-50 dark:bg-zinc-800/50 rounded-2xl border border-zinc-100 dark:border-zinc-800">
                            <h3 className="text-xs font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest mb-3">About Me</h3>
                            {isEditing ? (
                                <textarea 
                                    className="w-full p-4 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl text-sm focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-500 outline-none leading-relaxed transition-all dark:text-white"
                                    rows={4}
                                    value={profile.about}
                                    placeholder="Tell us about yourself..."
                                    onChange={(e) => setProfile({...profile, about: e.target.value})}
                                />
                            ) : (
                                <p className="text-zinc-600 dark:text-zinc-300 text-sm leading-relaxed whitespace-pre-wrap">{profile.about || "No bio added yet."}</p>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {/* Skills */}
                <div className="md:col-span-2 bg-white dark:bg-zinc-900 rounded-2xl shadow-lg shadow-zinc-200 dark:shadow-none p-8 border border-zinc-50 dark:border-zinc-800 h-full">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="text-xl font-bold text-zinc-900 dark:text-white">Skills & Expertise</h3>
                    </div>
                    
                    <div className="flex flex-wrap gap-3 mb-6">
                        {profile.skills.map(skill => (
                            <div key={skill.id} className="flex items-center bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 pl-4 pr-3 py-2 rounded-xl text-sm font-semibold border border-zinc-200 dark:border-zinc-700 shadow-sm">
                                <span>{skill.name}</span>
                                <span className="mx-2 text-zinc-300 dark:text-zinc-600">|</span>
                                <span className="text-[10px] uppercase text-zinc-400 dark:text-zinc-500 tracking-wider">{skill.level}</span>
                                {isEditing && (
                                    <button onClick={() => removeSkill(skill.id)} className="ml-2 p-1 text-zinc-400 hover:text-red-500 rounded-full hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
                                        <X className="w-3 h-3" />
                                    </button>
                                )}
                            </div>
                        ))}
                        {profile.skills.length === 0 && !isEditing && (
                            <p className="text-zinc-400 dark:text-zinc-600 italic text-sm">No skills listed.</p>
                        )}
                    </div>

                    {isEditing && (
                        <div className="flex gap-2 mt-auto">
                            <input 
                                type="text" 
                                className="flex-1 p-3 border border-zinc-200 dark:border-zinc-700 rounded-xl text-sm bg-zinc-50 dark:bg-zinc-800 focus:bg-white dark:focus:bg-zinc-900 focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-500 outline-none transition-all dark:text-white"
                                placeholder="Add a new skill (e.g. Leadership)"
                                value={newSkill}
                                onChange={(e) => setNewSkill(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleAddSkill()}
                            />
                            <button 
                                onClick={handleAddSkill} 
                                className="px-4 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 rounded-xl hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-colors shadow-md"
                            >
                                <Plus className="w-5 h-5" />
                            </button>
                        </div>
                    )}
                </div>

                {/* Resume Upload */}
                <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-lg shadow-zinc-200 dark:shadow-none p-8 border border-zinc-50 dark:border-zinc-800 flex flex-col">
                    <h3 className="text-xl font-bold text-zinc-900 dark:text-white mb-4">Resume</h3>
                    <div className="flex-1 border-2 border-dashed border-zinc-200 dark:border-zinc-700 rounded-2xl p-6 text-center hover:bg-zinc-50 dark:hover:bg-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-600 transition-all cursor-pointer flex flex-col items-center justify-center group h-full min-h-[160px]">
                        <div className="p-3 bg-zinc-100 dark:bg-zinc-800 rounded-full text-zinc-400 dark:text-zinc-500 group-hover:bg-zinc-200 dark:group-hover:bg-zinc-700 group-hover:text-zinc-600 dark:group-hover:text-zinc-300 transition-colors mb-3">
                             <Upload className="w-6 h-6" />
                        </div>
                        <p className="text-sm text-zinc-700 dark:text-zinc-300 font-semibold">Upload PDF Resume</p>
                        <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-1">Max 5MB</p>
                    </div>
                </div>
            </div>

            {/* Experience History (Mock) */}
            <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-lg shadow-zinc-200 dark:shadow-none p-8 border border-zinc-50 dark:border-zinc-800">
                <h3 className="text-xl font-bold text-zinc-900 dark:text-white mb-6">Volunteer History</h3>
                <div className="space-y-6">
                    <div className="flex gap-4 p-4 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-100 dark:border-zinc-800">
                        <div className="mt-1">
                            <div className="p-2.5 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600 dark:text-yellow-400 rounded-xl shadow-sm">
                                <Star className="w-5 h-5 fill-current" />
                            </div>
                        </div>
                        <div>
                            <h4 className="text-base font-bold text-zinc-900 dark:text-white">School Library Helper</h4>
                            <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-0.5">Verified by Mrs. Librarian • Jan 2024</p>
                            <div className="mt-3 inline-flex items-center px-3 py-1 rounded-lg text-xs font-bold bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300">
                                4 Hours
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};