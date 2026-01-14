
import React, { useState } from 'react';
import { Edit2, Shield, Layers, Plus, Users, ToggleLeft, ToggleRight } from 'lucide-react';
import { JobCategory, UserRole } from '../types';

export const AdminSettings: React.FC = () => {
    const [activeTab, setActiveTab] = useState<'roles' | 'permissions' | 'categories'>('roles');

    const roles = Object.values(UserRole).map(r => ({ name: r, status: 'Active' }));
    const categories = Object.values(JobCategory).map(c => ({ name: c, status: 'Active' }));
    const permissions = [
        { name: 'User Management', desc: 'Create, edit, delete system users' },
        { name: 'Task Deployment', desc: 'Initialize and deploy new task designations' },
        { name: 'Review Orchestration', desc: 'Review and approve pending task deployments' },
        { name: 'System Insights', desc: 'Access platform resolution analytics' },
    ];

    const renderRoles = () => (
        <div className="space-y-6 animate-fade-in">
             <div className="flex justify-between items-center mb-6">
                 <h2 className="text-2xl font-black text-zinc-900 dark:text-white tracking-tighter">Role Architecture</h2>
                 <button className="flex items-center px-6 py-2.5 bg-red-900 dark:bg-red-700 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-red-800 transition-all shadow-lg shadow-red-900/10">
                     <Plus className="w-4 h-4 mr-2" /> New Role
                 </button>
             </div>
             <div className="glass-card rounded-[2rem] overflow-hidden border-white/10">
                 <table className="w-full">
                     <thead className="bg-white/50 dark:bg-zinc-800/50 border-b border-white/20 dark:border-white/5">
                         <tr>
                             <th className="px-8 py-4 text-left text-[10px] font-black text-zinc-400 uppercase tracking-[0.2em]">Designation</th>
                             <th className="px-8 py-4 text-left text-[10px] font-black text-zinc-400 uppercase tracking-[0.2em]">Status</th>
                             <th className="px-8 py-4 text-right text-[10px] font-black text-zinc-400 uppercase tracking-[0.2em]">Config</th>
                         </tr>
                     </thead>
                     <tbody className="divide-y divide-white/20 dark:divide-white/5">
                         {roles.map((role, i) => (
                             <tr key={i} className="hover:bg-white/30 dark:hover:bg-white/5 transition-all">
                                 <td className="px-8 py-6 font-black text-zinc-900 dark:text-white">{role.name}</td>
                                 <td className="px-8 py-6">
                                     <span className="px-3 py-1 bg-emerald-100 text-emerald-800 text-[9px] font-black rounded-full uppercase tracking-widest">{role.status}</span>
                                 </td>
                                 <td className="px-8 py-6 text-right">
                                     <button className="text-zinc-400 hover:text-red-900 dark:hover:text-red-400 transition-colors"><Edit2 className="w-4 h-4" /></button>
                                 </td>
                             </tr>
                         ))}
                     </tbody>
                 </table>
             </div>
        </div>
    );

    const renderPermissions = () => (
        <div className="space-y-6 animate-fade-in">
             <div className="flex justify-between items-center mb-6">
                 <h2 className="text-2xl font-black text-zinc-900 dark:text-white tracking-tighter">System Permissions</h2>
                 <button className="flex items-center px-6 py-2.5 bg-red-900 dark:bg-red-700 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-red-800 transition-all shadow-lg shadow-red-900/10">
                     <Plus className="w-4 h-4 mr-2" /> New Permission
                 </button>
             </div>
             <div className="grid gap-6">
                 {permissions.map((perm, i) => (
                     <div key={i} className="glass-card p-6 rounded-2xl border-white/10 flex justify-between items-center group hover:-translate-y-1 transition-all">
                         <div>
                             <h4 className="font-black text-zinc-900 dark:text-white tracking-tight">{perm.name}</h4>
                             <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">{perm.desc}</p>
                         </div>
                         <button className="p-3 bg-white/50 dark:bg-zinc-800/50 rounded-xl text-zinc-400 hover:text-red-900 dark:hover:text-red-400 transition-colors group-hover:scale-110"><Edit2 className="w-4 h-4" /></button>
                     </div>
                 ))}
             </div>
        </div>
    );

    const renderCategories = () => (
        <div className="space-y-6 animate-fade-in">
             <div className="flex justify-between items-center mb-6">
                 <h2 className="text-2xl font-black text-zinc-900 dark:text-white tracking-tighter">Domain Orchestration</h2>
                 <button className="flex items-center px-6 py-2.5 bg-red-900 dark:bg-red-700 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-red-800 transition-all shadow-lg shadow-red-900/10">
                     <Plus className="w-4 h-4 mr-2" /> New Domain
                 </button>
             </div>
             <div className="glass-card rounded-[2rem] overflow-hidden border-white/10">
                 <table className="w-full">
                     <thead className="bg-white/50 dark:bg-zinc-800/50 border-b border-white/20 dark:border-white/5">
                         <tr>
                             <th className="px-8 py-4 text-left text-[10px] font-black text-zinc-400 uppercase tracking-[0.2em]">Domain Name</th>
                             <th className="px-8 py-4 text-left text-[10px] font-black text-zinc-400 uppercase tracking-[0.2em]">Scope</th>
                             <th className="px-8 py-4 text-right text-[10px] font-black text-zinc-400 uppercase tracking-[0.2em]">Config</th>
                         </tr>
                     </thead>
                     <tbody className="divide-y divide-white/20 dark:divide-white/5">
                         {categories.map((cat, i) => (
                             <tr key={i} className="hover:bg-white/30 dark:hover:bg-white/5 transition-all">
                                 <td className="px-8 py-6 font-black text-zinc-900 dark:text-white">{cat.name}</td>
                                 <td className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-zinc-500">Internal</td>
                                 <td className="px-8 py-6 text-right">
                                     <button className="text-zinc-400 hover:text-red-900 dark:hover:text-red-400 transition-colors"><Edit2 className="w-4 h-4" /></button>
                                 </td>
                             </tr>
                         ))}
                     </tbody>
                 </table>
             </div>
        </div>
    );

    return (
        <div className="max-w-6xl mx-auto space-y-10 animate-fade-in pb-20">
            <h1 className="text-4xl font-black text-zinc-900 dark:text-white tracking-tighter">System Administration</h1>
            
            <div className="grid grid-cols-1 md:grid-cols-4 gap-10">
                <div className="space-y-3">
                    <button 
                        onClick={() => setActiveTab('roles')}
                        className={`w-full flex items-center px-6 py-4 rounded-2xl text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'roles' ? 'bg-red-900 dark:bg-red-700 text-white shadow-xl shadow-red-900/20' : 'text-zinc-500 hover:bg-white/50 dark:hover:bg-zinc-800'}`}
                    >
                        <Users className="w-4 h-4 mr-3" /> Role Architecture
                    </button>
                    <button 
                        onClick={() => setActiveTab('permissions')}
                        className={`w-full flex items-center px-6 py-4 rounded-2xl text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'permissions' ? 'bg-red-900 dark:bg-red-700 text-white shadow-xl shadow-red-900/20' : 'text-zinc-500 hover:bg-white/50 dark:hover:bg-zinc-800'}`}
                    >
                        <Shield className="w-4 h-4 mr-3" /> System Sec
                    </button>
                    <button 
                        onClick={() => setActiveTab('categories')}
                        className={`w-full flex items-center px-6 py-4 rounded-2xl text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'categories' ? 'bg-red-900 dark:bg-red-700 text-white shadow-xl shadow-red-900/20' : 'text-zinc-500 hover:bg-white/50 dark:hover:bg-zinc-800'}`}
                    >
                        <Layers className="w-4 h-4 mr-3" /> Domain Map
                    </button>
                </div>

                <div className="md:col-span-3">
                    {activeTab === 'roles' && renderRoles()}
                    {activeTab === 'permissions' && renderPermissions()}
                    {activeTab === 'categories' && renderCategories()}
                </div>
            </div>
        </div>
    );
};
