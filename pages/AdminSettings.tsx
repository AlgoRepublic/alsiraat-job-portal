
import React, { useState } from 'react';
import { Edit2, Shield, Layers, Plus, Users, ToggleLeft, ToggleRight } from 'lucide-react';
import { JobCategory, UserRole } from '../types';

export const AdminSettings: React.FC = () => {
    const [activeTab, setActiveTab] = useState<'roles' | 'permissions' | 'categories'>('roles');

    // Mock Data for UI
    const roles = Object.values(UserRole).map(r => ({ name: r, status: 'Active' }));
    const categories = Object.values(JobCategory).map(c => ({ name: c, status: 'Active' }));
    const permissions = [
        { name: 'User Management', desc: 'Create, edit, delete users' },
        { name: 'Job Posting', desc: 'Create and edit job posts' },
        { name: 'Approve Jobs', desc: 'Review and approve pending jobs' },
        { name: 'View Reports', desc: 'Access system analytics' },
    ];

    const renderRoles = () => (
        <div className="space-y-4 animate-fade-in">
             <div className="flex justify-between items-center mb-6">
                 <h2 className="text-xl font-bold text-zinc-900 dark:text-white">Role Management</h2>
                 <button className="flex items-center px-4 py-2 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 rounded-lg text-sm font-semibold">
                     <Plus className="w-4 h-4 mr-2" /> New Role
                 </button>
             </div>
             <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden">
                 <table className="w-full">
                     <thead className="bg-zinc-50 dark:bg-zinc-800 border-b border-zinc-200 dark:border-zinc-700">
                         <tr>
                             <th className="px-6 py-3 text-left text-xs font-bold text-zinc-500 uppercase">Role Name</th>
                             <th className="px-6 py-3 text-left text-xs font-bold text-zinc-500 uppercase">Status</th>
                             <th className="px-6 py-3 text-right text-xs font-bold text-zinc-500 uppercase">Action</th>
                         </tr>
                     </thead>
                     <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                         {roles.map((role, i) => (
                             <tr key={i} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50">
                                 <td className="px-6 py-4 font-medium text-zinc-900 dark:text-white">{role.name}</td>
                                 <td className="px-6 py-4">
                                     <span className="px-2 py-1 bg-green-100 text-green-800 text-xs font-bold rounded-full">{role.status}</span>
                                 </td>
                                 <td className="px-6 py-4 text-right">
                                     <button className="text-zinc-400 hover:text-zinc-900 dark:hover:text-white"><Edit2 className="w-4 h-4" /></button>
                                 </td>
                             </tr>
                         ))}
                     </tbody>
                 </table>
             </div>
        </div>
    );

    const renderPermissions = () => (
        <div className="space-y-4 animate-fade-in">
             <div className="flex justify-between items-center mb-6">
                 <h2 className="text-xl font-bold text-zinc-900 dark:text-white">Permission Management</h2>
                 <button className="flex items-center px-4 py-2 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 rounded-lg text-sm font-semibold">
                     <Plus className="w-4 h-4 mr-2" /> New Permission
                 </button>
             </div>
             <div className="grid gap-4">
                 {permissions.map((perm, i) => (
                     <div key={i} className="bg-white dark:bg-zinc-900 p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 flex justify-between items-center">
                         <div>
                             <h4 className="font-bold text-zinc-900 dark:text-white">{perm.name}</h4>
                             <p className="text-sm text-zinc-500 dark:text-zinc-400">{perm.desc}</p>
                         </div>
                         <button className="text-zinc-400 hover:text-zinc-900 dark:hover:text-white"><Edit2 className="w-4 h-4" /></button>
                     </div>
                 ))}
             </div>
        </div>
    );

    const renderCategories = () => (
        <div className="space-y-4 animate-fade-in">
             <div className="flex justify-between items-center mb-6">
                 <h2 className="text-xl font-bold text-zinc-900 dark:text-white">Category Management</h2>
                 <button className="flex items-center px-4 py-2 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 rounded-lg text-sm font-semibold">
                     <Plus className="w-4 h-4 mr-2" /> New Category
                 </button>
             </div>
             <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden">
                 <table className="w-full">
                     <thead className="bg-zinc-50 dark:bg-zinc-800 border-b border-zinc-200 dark:border-zinc-700">
                         <tr>
                             <th className="px-6 py-3 text-left text-xs font-bold text-zinc-500 uppercase">Category Name</th>
                             <th className="px-6 py-3 text-left text-xs font-bold text-zinc-500 uppercase">Visibility</th>
                             <th className="px-6 py-3 text-right text-xs font-bold text-zinc-500 uppercase">Action</th>
                         </tr>
                     </thead>
                     <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                         {categories.map((cat, i) => (
                             <tr key={i} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50">
                                 <td className="px-6 py-4 font-medium text-zinc-900 dark:text-white">{cat.name}</td>
                                 <td className="px-6 py-4 text-xs text-zinc-500">Internal</td>
                                 <td className="px-6 py-4 text-right">
                                     <button className="text-zinc-400 hover:text-zinc-900 dark:hover:text-white"><Edit2 className="w-4 h-4" /></button>
                                 </td>
                             </tr>
                         ))}
                     </tbody>
                 </table>
             </div>
        </div>
    );

    return (
        <div className="max-w-5xl mx-auto">
            <h1 className="text-3xl font-bold text-zinc-900 dark:text-white mb-8">Administration</h1>
            
            <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
                {/* Sidebar Nav */}
                <div className="space-y-2">
                    <button 
                        onClick={() => setActiveTab('roles')}
                        className={`w-full flex items-center px-4 py-3 rounded-xl text-sm font-medium transition-all ${activeTab === 'roles' ? 'bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 shadow-md' : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800'}`}
                    >
                        <Users className="w-4 h-4 mr-3" /> Roles
                    </button>
                    <button 
                        onClick={() => setActiveTab('permissions')}
                        className={`w-full flex items-center px-4 py-3 rounded-xl text-sm font-medium transition-all ${activeTab === 'permissions' ? 'bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 shadow-md' : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800'}`}
                    >
                        <Shield className="w-4 h-4 mr-3" /> Permissions
                    </button>
                    <button 
                        onClick={() => setActiveTab('categories')}
                        className={`w-full flex items-center px-4 py-3 rounded-xl text-sm font-medium transition-all ${activeTab === 'categories' ? 'bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 shadow-md' : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800'}`}
                    >
                        <Layers className="w-4 h-4 mr-3" /> Categories
                    </button>
                </div>

                {/* Content Area */}
                <div className="md:col-span-3">
                    {activeTab === 'roles' && renderRoles()}
                    {activeTab === 'permissions' && renderPermissions()}
                    {activeTab === 'categories' && renderCategories()}
                </div>
            </div>
        </div>
    );
};
