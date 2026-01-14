import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowRight, ArrowLeft, Upload, FileText, X, CheckCircle, Sparkles, Loader2, Calendar, Plus, ClipboardCopy 
} from 'lucide-react';
import { Job, JobCategory, JobStatus, RewardType, Visibility, FileVisibility, Attachment } from '../types';
import { generateJobDescription } from '../services/geminiService';
import { db } from '../services/database';

export const JobWizard: React.FC = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [skillInput, setSkillInput] = useState('');
  
  const [formData, setFormData] = useState<Partial<Job>>({
    title: '',
    category: JobCategory.EVENT,
    description: '',
    location: '',
    hoursRequired: 0,
    startDate: '',
    endDate: '',
    selectionCriteria: '',
    requiredSkills: [],
    rewardType: RewardType.VOLUNTEER,
    rewardValue: 0,
    eligibility: [],
    visibility: Visibility.INTERNAL,
    attachments: [],
    status: JobStatus.DRAFT
  });

  const [attachments, setAttachments] = useState<Attachment[]>([]);

  const updateField = (field: keyof Job, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleEligibilityChange = (value: string) => {
    const current = formData.eligibility || [];
    if (current.includes(value)) {
      updateField('eligibility', current.filter(i => i !== value));
    } else {
      updateField('eligibility', [...current, value]);
    }
  };

  const handleAddSkill = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && skillInput.trim()) {
        e.preventDefault();
        const currentSkills = formData.requiredSkills || [];
        if (!currentSkills.includes(skillInput.trim())) {
            updateField('requiredSkills', [...currentSkills, skillInput.trim()]);
        }
        setSkillInput('');
    }
  };

  const handleAIHelp = async () => {
    if (!formData.title || !formData.category) {
        alert("Enter Task Title and Category first.");
        return;
    }
    setIsGenerating(true);
    const desc = await generateJobDescription(
        formData.title, 
        formData.category, 
        "Detailed resolution steps and collaboration requirements."
    );
    updateField('description', desc);
    setIsGenerating(false);
  };

  const handleSubmit = async () => {
      setIsSubmitting(true);
      const user = await db.getCurrentUser();
      const newJob: Job = {
          ...formData,
          id: Math.random().toString(36).substr(2, 9),
          attachments: attachments,
          createdAt: new Date().toISOString().split('T')[0],
          createdBy: user.name,
          applicantsCount: 0,
          status: JobStatus.PENDING 
      } as Job;

      await db.addJob(newJob);
      setIsSubmitting(false);
      navigate('/jobs');
  };

  return (
    <div className="max-w-4xl mx-auto space-y-12 pb-20">
      <div className="text-center lg:text-left">
        <h1 className="text-4xl font-black text-zinc-900 dark:text-white tracking-tighter">Initialize New Task</h1>
        <p className="text-zinc-500 font-medium mt-3">Follow the orchestration steps to deploy a new resolution task to the network.</p>
      </div>

      <div className="flex items-center justify-between px-4 mb-4">
         {[1, 2, 3, 4].map(num => (
             <div key={num} className="flex flex-col items-center relative z-10 flex-1">
                 <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black text-sm transition-all duration-500 shadow-xl ${step >= num ? 'bg-red-600 text-white scale-110' : 'glass-card text-zinc-400'}`}>
                     {num}
                 </div>
                 <span className={`mt-4 text-[10px] font-black uppercase tracking-widest transition-colors duration-300 ${step >= num ? 'text-red-700 dark:text-red-400' : 'text-zinc-400'}`}>
                     {num === 1 ? 'Designation' : num === 2 ? 'Domain Specs' : num === 3 ? 'Assets' : 'Deploy'}
                 </span>
             </div>
         ))}
      </div>

      <div className="glass-card rounded-[3rem] p-12 min-h-[600px] shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-red-600/5 rounded-full -mr-32 -mt-32 blur-3xl pointer-events-none"></div>
          
          {step === 1 && (
             <div className="space-y-10 animate-fade-in">
                 <div className="grid md:grid-cols-2 gap-8">
                     <div className="space-y-2">
                         <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest ml-1">Task Title</label>
                         <input type="text" className="w-full p-4 glass rounded-2xl focus:ring-4 focus:ring-red-500/20 outline-none font-bold text-lg dark:text-white" value={formData.title} onChange={(e) => updateField('title', e.target.value)} placeholder="e.g. Infrastructure Audit" />
                     </div>
                     <div className="space-y-2">
                         <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest ml-1">Task Domain</label>
                         <select className="w-full p-4 glass rounded-2xl font-bold dark:text-white" value={formData.category} onChange={(e) => updateField('category', e.target.value)}>
                             {Object.values(JobCategory).map(c => <option key={c} value={c}>{c}</option>)}
                         </select>
                     </div>
                 </div>

                 <div className="space-y-2">
                     <div className="flex justify-between items-center px-1">
                         <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Resolution Brief</label>
                         <button onClick={handleAIHelp} disabled={isGenerating} className="text-[10px] font-black uppercase tracking-widest flex items-center px-4 py-2 bg-red-600 text-white rounded-xl hover:bg-red-700 transition-all shadow-lg shadow-red-600/20 disabled:opacity-50">
                            {isGenerating ? <Loader2 className="w-3 h-3 mr-2 animate-spin"/> : <Sparkles className="w-3 h-3 mr-2"/>} AI Draft
                         </button>
                     </div>
                     <textarea className="w-full p-6 glass rounded-2xl h-64 focus:ring-4 focus:ring-red-500/20 outline-none font-medium leading-relaxed dark:text-white resize-none" value={formData.description} onChange={(e) => updateField('description', e.target.value)} placeholder="Provide full technical requirements and expected outcomes..." />
                 </div>

                 <div className="grid md:grid-cols-2 gap-8">
                     <div className="space-y-2">
                         <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest ml-1">Assigned Venue / URL</label>
                         <input type="text" className="w-full p-4 glass rounded-2xl font-bold dark:text-white" value={formData.location} onChange={(e) => updateField('location', e.target.value)} placeholder="e.g. Server Room 4 or Remote" />
                     </div>
                     <div className="space-y-2">
                         <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest ml-1">Estimated Duration (Hrs)</label>
                         <input type="number" className="w-full p-4 glass rounded-2xl font-bold dark:text-white" value={formData.hoursRequired} onChange={(e) => updateField('hoursRequired', Number(e.target.value))} />
                     </div>
                 </div>
             </div>
          )}

          {step === 2 && (
             <div className="space-y-10 animate-fade-in">
                 <div className="space-y-2">
                     <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest ml-1">Success Criteria</label>
                     <textarea className="w-full p-5 glass rounded-2xl h-32 font-bold dark:text-white" value={formData.selectionCriteria} onChange={(e) => updateField('selectionCriteria', e.target.value)} placeholder="Specify exactly what defines a successful resolution..." />
                 </div>

                 <div className="space-y-2">
                    <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest ml-1">Required Prerequisites</label>
                    <div className="p-3 glass rounded-2xl flex flex-wrap gap-2">
                        {formData.requiredSkills?.map(skill => (
                            <span key={skill} className="px-3 py-1.5 bg-red-600 text-white rounded-xl text-xs font-black uppercase tracking-widest flex items-center">
                                {skill} <X className="w-3 h-3 ml-2 cursor-pointer" onClick={() => updateField('requiredSkills', formData.requiredSkills?.filter(s => s !== skill))} />
                            </span>
                        ))}
                        <input type="text" className="flex-1 bg-transparent border-none outline-none p-2 font-bold text-sm dark:text-white" placeholder="Type skill & press Enter" value={skillInput} onChange={(e) => setSkillInput(e.target.value)} onKeyDown={handleAddSkill} />
                    </div>
                 </div>

                 <div className="grid md:grid-cols-2 gap-8">
                    <div className="space-y-2">
                         <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest ml-1">Incentive Type</label>
                         <select className="w-full p-4 glass rounded-2xl font-bold dark:text-white" value={formData.rewardType} onChange={(e) => updateField('rewardType', e.target.value)}>
                             {Object.values(RewardType).map(t => <option key={t} value={t}>{t}</option>)}
                         </select>
                    </div>
                    <div className="space-y-2">
                         <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest ml-1">Incentive Magnitude</label>
                         <input type="number" className="w-full p-4 glass rounded-2xl font-bold dark:text-white disabled:opacity-30" value={formData.rewardValue} disabled={formData.rewardType === RewardType.VOLUNTEER} onChange={(e) => updateField('rewardValue', Number(e.target.value))} />
                    </div>
                 </div>
             </div>
          )}

          {step === 3 && (
              <div className="space-y-10 animate-fade-in">
                  <div className="border-4 border-dashed border-zinc-200 dark:border-zinc-800 rounded-[2.5rem] p-20 text-center hover:border-red-600 transition-all cursor-pointer bg-white/5 group">
                      <div className="w-20 h-20 bg-red-600 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-2xl shadow-red-600/30 group-hover:scale-110 transition-transform">
                          <Upload className="w-8 h-8 text-white" />
                      </div>
                      <h3 className="text-2xl font-black text-zinc-900 dark:text-white tracking-tighter">Attach Resolution Assets</h3>
                      <p className="text-zinc-500 font-medium mb-8">Technical diagrams, specs, or briefing docs (Max 10MB)</p>
                      <label className="px-10 py-4 bg-zinc-900 dark:bg-zinc-800 text-white rounded-2xl font-black uppercase tracking-widest text-xs cursor-pointer hover:bg-black transition-all">Select System Assets</label>
                  </div>
              </div>
          )}

          {step === 4 && (
              <div className="space-y-10 animate-fade-in">
                  <div className="p-8 bg-emerald-50 dark:bg-emerald-900/20 border-2 border-emerald-100 dark:border-emerald-800 rounded-[2rem] flex items-center gap-6">
                      <CheckCircle className="w-12 h-12 text-emerald-600" />
                      <div>
                          <h3 className="text-xl font-black text-emerald-900 dark:text-emerald-400 tracking-tighter">Ready for Deployment</h3>
                          <p className="text-emerald-800 dark:text-emerald-600/80 font-medium">Verify task designation and domain specs before initializing.</p>
                      </div>
                  </div>

                  <div className="glass-card p-10 rounded-[2.5rem] space-y-8">
                      <div>
                          <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-2">Designation</p>
                          <h4 className="text-4xl font-black text-zinc-900 dark:text-white tracking-tighter leading-none">{formData.title}</h4>
                      </div>
                      <div className="grid grid-cols-2 gap-10">
                          <div>
                              <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-2">Domain</p>
                              <p className="text-lg font-black text-red-600">{formData.category}</p>
                          </div>
                          <div>
                              <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-2">Venue</p>
                              <p className="text-lg font-black text-zinc-900 dark:text-white">{formData.location}</p>
                          </div>
                      </div>
                  </div>
              </div>
          )}
      </div>

      <div className="flex justify-between items-center px-4">
          <button onClick={() => setStep(s => Math.max(1, s - 1))} disabled={step === 1} className="px-8 py-4 rounded-2xl text-zinc-500 font-black uppercase tracking-widest text-xs hover:bg-white/50 disabled:opacity-0 transition-all flex items-center">
             <ArrowLeft className="w-4 h-4 mr-3" /> Step Back
          </button>
          
          {step < 4 ? (
             <button onClick={() => setStep(s => s + 1)} className="px-10 py-4 bg-red-600 text-white rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-red-700 shadow-2xl shadow-red-600/30 flex items-center transition-all hover:-translate-y-1">
                Advance <ArrowRight className="w-4 h-4 ml-3" />
             </button>
          ) : (
            <button onClick={handleSubmit} disabled={isSubmitting} className="px-12 py-4 bg-emerald-600 text-white rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-emerald-700 shadow-2xl shadow-emerald-600/20 flex items-center transition-all hover:-translate-y-1 disabled:opacity-50">
                {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin mr-3" /> : <ClipboardCopy className="w-4 h-4 mr-3" />}
                Deploy Task
            </button>
          )}
      </div>
    </div>
  );
};