import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowRight, ArrowLeft, Upload, FileText, X, CheckCircle, Sparkles, Loader2, Calendar, Plus 
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
  
  // Form State
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

  // Handlers
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

  const removeSkill = (skill: string) => {
      const currentSkills = formData.requiredSkills || [];
      updateField('requiredSkills', currentSkills.filter(s => s !== skill));
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
        const file = e.target.files[0];
        if (file.size > 10 * 1024 * 1024) {
            alert("File too large (Max 10MB)");
            return;
        }
        const newAttachment: Attachment = {
            id: Math.random().toString(36).substr(2, 9),
            name: file.name,
            size: file.size,
            type: file.type,
            visibility: FileVisibility.INTERNAL
        };
        setAttachments(prev => [...prev, newAttachment]);
    }
  };

  const removeAttachment = (id: string) => {
      setAttachments(prev => prev.filter(a => a.id !== id));
  };

  const handleAIHelp = async () => {
    if (!formData.title || !formData.category) {
        alert("Please enter a Title and Category first.");
        return;
    }
    setIsGenerating(true);
    const desc = await generateJobDescription(
        formData.title, 
        formData.category, 
        "Include standard safety protocols and team collaboration."
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
          status: JobStatus.PENDING // Send for approval
      } as Job;

      await db.addJob(newJob);
      setIsSubmitting(false);
      navigate('/jobs');
  };

  // Step Components
  const renderStep1 = () => (
    <div className="space-y-6 animate-fade-in">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
            <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 uppercase mb-2">Job Title *</label>
            <input 
                type="text" 
                className="w-full p-3.5 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-500 focus:outline-none transition-all dark:text-white"
                value={formData.title}
                onChange={(e) => updateField('title', e.target.value)}
                placeholder="e.g. Annual Science Fair Coordinator"
            />
        </div>
        <div>
            <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 uppercase mb-2">Category</label>
            <select 
                className="w-full p-3.5 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-500 focus:outline-none transition-all dark:text-white"
                value={formData.category}
                onChange={(e) => updateField('category', e.target.value)}
            >
                {Object.values(JobCategory).map(c => <option key={c} value={c}>{c}</option>)}
            </select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="relative">
              <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 uppercase mb-2">Start Date</label>
              <div className="relative">
                  <input 
                      type="date"
                      className="w-full p-3.5 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-500 focus:outline-none dark:text-white"
                      value={formData.startDate}
                      onChange={(e) => updateField('startDate', e.target.value)}
                  />
                  {!formData.startDate && (
                      <Calendar className="absolute right-4 top-3.5 w-5 h-5 text-zinc-400 pointer-events-none" />
                  )}
              </div>
          </div>
          <div className="relative">
              <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 uppercase mb-2">End Date</label>
              <div className="relative">
                  <input 
                      type="date"
                      className="w-full p-3.5 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-500 focus:outline-none dark:text-white"
                      value={formData.endDate}
                      onChange={(e) => updateField('endDate', e.target.value)}
                  />
                  {!formData.endDate && (
                      <Calendar className="absolute right-4 top-3.5 w-5 h-5 text-zinc-400 pointer-events-none" />
                  )}
              </div>
          </div>
      </div>

      <div>
          <div className="flex justify-between items-center mb-2">
            <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 uppercase">Description *</label>
            <button 
                onClick={handleAIHelp}
                disabled={isGenerating}
                className="text-xs flex items-center px-3 py-1.5 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 rounded-lg hover:bg-zinc-700 dark:hover:bg-zinc-300 font-medium disabled:opacity-50 transition-colors shadow-sm"
            >
                {isGenerating ? <Loader2 className="w-3 h-3 mr-1.5 animate-spin"/> : <Sparkles className="w-3 h-3 mr-1.5"/>}
                {isGenerating ? 'Drafting...' : 'Auto-Draft with AI'}
            </button>
          </div>
          <textarea 
              className="w-full p-4 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl h-48 focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-500 focus:outline-none resize-none leading-relaxed dark:text-white"
              value={formData.description}
              onChange={(e) => updateField('description', e.target.value)}
              placeholder="Describe the role, responsibilities, and requirements..."
          />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
            <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 uppercase mb-2">Location</label>
            <input 
                type="text"
                className="w-full p-3.5 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-500 focus:outline-none dark:text-white"
                value={formData.location}
                onChange={(e) => updateField('location', e.target.value)}
                placeholder="e.g. Main Hall"
            />
        </div>
        <div>
            <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 uppercase mb-2">Hours Required</label>
            <input 
                type="number"
                className="w-full p-3.5 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-500 focus:outline-none dark:text-white"
                value={formData.hoursRequired}
                onChange={(e) => updateField('hoursRequired', Number(e.target.value))}
            />
        </div>
      </div>
    </div>
  );

  const renderStep2 = () => (
    <div className="space-y-8 animate-fade-in">
        
       {/* Selection Criteria */}
       <div>
            <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 uppercase mb-2">Key Selection Criteria</label>
            <textarea 
                className="w-full p-3.5 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl h-32 focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-500 focus:outline-none resize-none dark:text-white"
                value={formData.selectionCriteria}
                onChange={(e) => updateField('selectionCriteria', e.target.value)}
                placeholder="List specific qualifications or traits required (e.g. Leadership experience, CPR certified)..."
            />
       </div>

       {/* Required Skills - Tag Input */}
       <div>
            <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 uppercase mb-2">Required Skills</label>
            <div className="p-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl focus-within:ring-2 focus-within:ring-zinc-900 dark:focus-within:ring-zinc-500 flex flex-wrap gap-2">
                {formData.requiredSkills?.map(skill => (
                    <span key={skill} className="flex items-center px-2 py-1 bg-zinc-200 dark:bg-zinc-700 text-zinc-800 dark:text-zinc-200 rounded-lg text-sm font-medium">
                        {skill}
                        <button onClick={() => removeSkill(skill)} className="ml-1 hover:text-red-500">
                            <X className="w-3 h-3" />
                        </button>
                    </span>
                ))}
                <div className="flex-1 flex items-center min-w-[120px]">
                    <Plus className="w-4 h-4 text-zinc-400 ml-2 mr-1" />
                    <input 
                        type="text"
                        className="w-full bg-transparent border-none focus:outline-none text-sm dark:text-white"
                        placeholder="Type skill & press Enter"
                        value={skillInput}
                        onChange={(e) => setSkillInput(e.target.value)}
                        onKeyDown={handleAddSkill}
                    />
                </div>
            </div>
       </div>

       <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div>
                <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 uppercase mb-2">Reward Type</label>
                <select 
                    className="w-full p-3.5 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-500 focus:outline-none dark:text-white"
                    value={formData.rewardType}
                    onChange={(e) => updateField('rewardType', e.target.value)}
                >
                    {Object.values(RewardType).map(t => <option key={t} value={t}>{t}</option>)}
                </select>
            </div>
            <div>
                <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 uppercase mb-2">Reward Value</label>
                <input 
                    type="number"
                    className="w-full p-3.5 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-500 focus:outline-none disabled:opacity-50 dark:text-white"
                    value={formData.rewardValue}
                    disabled={formData.rewardType === RewardType.VOLUNTEER}
                    onChange={(e) => updateField('rewardValue', Number(e.target.value))}
                    placeholder={formData.rewardType === RewardType.PAID ? "Amount ($)" : "Points"}
                />
            </div>
       </div>

       <div>
           <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 uppercase mb-3">Eligibility</label>
           <div className="flex flex-wrap gap-4">
               {['Students', 'Parents', 'Community'].map(type => (
                   <label key={type} className={`flex items-center space-x-3 p-4 border rounded-xl cursor-pointer transition-all ${formData.eligibility?.includes(type) ? 'bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 border-zinc-900 dark:border-zinc-100 shadow-md' : 'bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800'}`}>
                       <input 
                            type="checkbox" 
                            checked={formData.eligibility?.includes(type)}
                            onChange={() => handleEligibilityChange(type)}
                            className="hidden" 
                       />
                       {formData.eligibility?.includes(type) ? <CheckCircle className="w-5 h-5"/> : <div className="w-5 h-5 border-2 border-zinc-300 dark:border-zinc-600 rounded-full"/>}
                       <span className="text-sm font-semibold">{type}</span>
                   </label>
               ))}
           </div>
       </div>

       <div>
            <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 uppercase mb-3">Visibility</label>
            <div className="grid grid-cols-3 gap-4">
                {Object.values(Visibility).map(v => (
                     <label key={v} className={`flex flex-col items-center justify-center p-4 border rounded-xl cursor-pointer text-center transition-all ${formData.visibility === v ? 'border-zinc-900 dark:border-zinc-100 bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 ring-1 ring-zinc-900 dark:ring-zinc-100' : 'border-zinc-200 dark:border-zinc-700 text-zinc-500 dark:text-zinc-400 hover:border-zinc-300 bg-white dark:bg-zinc-900'}`}>
                        <input 
                             type="radio" 
                             name="visibility"
                             value={v}
                             checked={formData.visibility === v}
                             onChange={(e) => updateField('visibility', e.target.value)}
                             className="hidden"
                        />
                        <span className="font-semibold text-sm">{v}</span>
                     </label>
                ))}
            </div>
       </div>
    </div>
  );

  const renderStep3 = () => (
      <div className="space-y-6 animate-fade-in">
          <div className="border-2 border-dashed border-zinc-300 dark:border-zinc-700 rounded-2xl p-10 text-center bg-zinc-50 dark:bg-zinc-800/50 hover:bg-white dark:hover:bg-zinc-800 hover:border-zinc-900 dark:hover:border-zinc-500 transition-all cursor-pointer group">
                <div className="w-12 h-12 bg-white dark:bg-zinc-700 rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm group-hover:scale-110 transition-transform">
                    <Upload className="w-6 h-6 text-zinc-500 dark:text-zinc-300" />
                </div>
                <h3 className="text-lg font-bold text-zinc-900 dark:text-white mb-1">Upload Documents</h3>
                <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-4">Support files (PDF, DOCX) up to 10MB</p>
                <input 
                    type="file" 
                    id="file-upload" 
                    className="hidden" 
                    onChange={handleFileUpload}
                    accept=".pdf,.docx,.doc,.jpg,.png"
                />
                <label htmlFor="file-upload" className="px-6 py-2.5 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 rounded-xl cursor-pointer hover:bg-zinc-800 dark:hover:bg-zinc-200 font-semibold shadow-md inline-block">
                    Select File
                </label>
          </div>

          {attachments.length > 0 && (
              <div className="space-y-3">
                  <h4 className="text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase">Attached Files</h4>
                  {attachments.map(file => (
                      <div key={file.id} className="flex items-center justify-between p-4 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-sm">
                          <div className="flex items-center space-x-4">
                              <div className="p-2.5 bg-zinc-100 dark:bg-zinc-800 rounded-lg text-zinc-600 dark:text-zinc-400">
                                  <FileText className="w-5 h-5" />
                              </div>
                              <div>
                                  <p className="text-sm font-semibold text-zinc-900 dark:text-white">{file.name}</p>
                                  <p className="text-xs text-zinc-500 dark:text-zinc-500">{(file.size / 1024 / 1024).toFixed(2)} MB • {file.visibility}</p>
                              </div>
                          </div>
                          <div className="flex items-center space-x-3">
                                <select 
                                    className="text-xs border border-zinc-200 dark:border-zinc-700 rounded-lg p-1.5 bg-zinc-50 dark:bg-zinc-800 outline-none focus:ring-1 focus:ring-zinc-900 dark:text-zinc-300"
                                    value={file.visibility}
                                    onChange={(e) => {
                                        const newAttachments = attachments.map(a => a.id === file.id ? {...a, visibility: e.target.value as FileVisibility} : a);
                                        setAttachments(newAttachments);
                                    }}
                                >
                                    <option value={FileVisibility.INTERNAL}>Internal</option>
                                    <option value={FileVisibility.PUBLIC}>Public</option>
                                </select>
                                <button onClick={() => removeAttachment(file.id)} className="p-1.5 text-zinc-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors">
                                    <X className="w-5 h-5" />
                                </button>
                          </div>
                      </div>
                  ))}
              </div>
          )}
      </div>
  );

  const renderStep4 = () => (
      <div className="space-y-6 animate-fade-in">
          <div className="bg-green-50 dark:bg-green-900/20 p-6 rounded-2xl border border-green-100 dark:border-green-900/30 flex items-start space-x-4">
              <div className="p-2 bg-white dark:bg-green-900 rounded-full text-green-600 dark:text-green-300 shadow-sm">
                 <CheckCircle className="w-6 h-6" />
              </div>
              <div>
                  <h3 className="text-base font-bold text-green-900 dark:text-green-300">Ready to Submit?</h3>
                  <p className="text-sm text-green-800 dark:text-green-400 mt-1 leading-relaxed">Please review the details below. Once submitted, your job post will be sent to a Job Manager for approval before going live.</p>
              </div>
          </div>

          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl divide-y divide-zinc-100 dark:divide-zinc-800 shadow-sm">
              <div className="p-6">
                  <p className="text-xs font-bold text-zinc-400 uppercase tracking-wide mb-1">Job Title</p>
                  <p className="text-xl font-bold text-zinc-900 dark:text-white">{formData.title}</p>
              </div>
              <div className="p-6 grid grid-cols-2 gap-6">
                  <div>
                      <p className="text-xs font-bold text-zinc-400 uppercase tracking-wide mb-1">Category</p>
                      <p className="text-sm font-semibold text-zinc-900 dark:text-white">{formData.category}</p>
                  </div>
                  <div>
                      <p className="text-xs font-bold text-zinc-400 uppercase tracking-wide mb-1">Location</p>
                      <p className="text-sm font-semibold text-zinc-900 dark:text-white">{formData.location}</p>
                  </div>
              </div>
              <div className="p-6">
                   <p className="text-xs font-bold text-zinc-400 uppercase tracking-wide mb-1">Reward</p>
                   <span className="inline-flex items-center px-3 py-1 rounded-lg text-sm font-semibold bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900">
                       {formData.rewardType} 
                       {formData.rewardValue ? ` - ${formData.rewardValue}` : ''}
                   </span>
              </div>
              <div className="p-6 bg-zinc-50 dark:bg-zinc-800/50 rounded-b-2xl">
                  <p className="text-xs font-bold text-zinc-400 uppercase tracking-wide mb-3">Description</p>
                  <div className="text-sm text-zinc-700 dark:text-zinc-300 whitespace-pre-wrap leading-relaxed">{formData.description}</div>
              </div>
          </div>
      </div>
  );

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-zinc-900 dark:text-white tracking-tight">Create New Opportunity</h1>
        <p className="text-zinc-500 dark:text-zinc-400 mt-2">Follow the steps to advertise a new role to the community.</p>
      </div>

      {/* Progress Bar */}
      <div className="mb-10">
          <div className="flex items-center justify-between mb-2 px-2">
             {[1, 2, 3, 4].map(num => (
                 <div key={num} className="flex flex-col items-center relative z-10">
                     <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm transition-all duration-500 shadow-sm ${step >= num ? 'bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 scale-110' : 'bg-white dark:bg-zinc-900 text-zinc-400 border border-zinc-200 dark:border-zinc-700'}`}>
                         {num}
                     </div>
                     <span className={`absolute -bottom-7 text-xs font-semibold w-20 text-center transition-colors duration-300 ${step >= num ? 'text-zinc-900 dark:text-zinc-100' : 'text-zinc-400'}`}>
                         {num === 1 ? 'Info' : num === 2 ? 'Details' : num === 3 ? 'Files' : 'Review'}
                     </span>
                 </div>
             ))}
          </div>
          <div className="relative top-[-38px] left-0 h-1 bg-zinc-200 dark:bg-zinc-800 -z-0 mx-6 rounded-full overflow-hidden">
              <div 
                className="h-full bg-zinc-900 dark:bg-zinc-100 transition-all duration-500 ease-out" 
                style={{ width: `${((step - 1) / 3) * 100}%` }}
              />
          </div>
      </div>

      <div className="bg-white dark:bg-zinc-900 rounded-3xl shadow-xl shadow-zinc-200/50 dark:shadow-black/50 border border-zinc-100 dark:border-zinc-800 p-8 min-h-[500px] mb-8 transition-colors">
          {step === 1 && renderStep1()}
          {step === 2 && renderStep2()}
          {step === 3 && renderStep3()}
          {step === 4 && renderStep4()}
      </div>

      <div className="flex justify-between items-center">
          <button 
            onClick={() => setStep(s => Math.max(1, s - 1))}
            disabled={step === 1}
            className="px-6 py-3 rounded-xl text-zinc-600 dark:text-zinc-400 font-semibold hover:bg-white dark:hover:bg-zinc-800 hover:shadow-sm disabled:opacity-0 disabled:cursor-not-allowed flex items-center transition-all"
          >
             <ArrowLeft className="w-4 h-4 mr-2" /> Back
          </button>

          {step < 4 ? (
             <button 
                onClick={() => setStep(s => Math.min(4, s + 1))}
                className="px-8 py-3 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 rounded-xl hover:bg-zinc-800 dark:hover:bg-zinc-200 flex items-center font-semibold shadow-lg shadow-zinc-300 dark:shadow-zinc-900 transition-all hover:-translate-y-0.5"
             >
                Next Step <ArrowRight className="w-4 h-4 ml-2" />
             </button>
          ) : (
            <button 
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="px-8 py-3 bg-green-600 text-white rounded-xl hover:bg-green-700 flex items-center font-semibold shadow-lg shadow-green-200 dark:shadow-green-900/30 transition-all hover:-translate-y-0.5 disabled:opacity-70 disabled:cursor-not-allowed"
            >
                {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                {isSubmitting ? 'Submitting...' : 'Submit for Approval'}
            </button>
          )}
      </div>
    </div>
  );
};