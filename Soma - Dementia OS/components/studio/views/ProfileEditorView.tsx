import * as React from 'react';
import { useState, useRef } from 'react';
import { UserProfile, WidgetData } from '../../../types';
import { ArrowLeft, Upload, Sparkles, Loader2, Save, Layout, Camera, Type, Move, Palette, Check, Maximize } from 'lucide-react';
import { motion } from 'framer-motion';
import { generateAvatar, generateCoverImage } from '../../../services/geminiService';
import { RENDER_BUTTON } from '../ui/StyledButtons';

interface Props {
    profile: UserProfile;
    widgetData: WidgetData;
    onUpdateProfile: (updates: Partial<UserProfile>) => void;
    onUpdateWidget: (id: string, updates: Partial<WidgetData>) => void;
    onBack: () => void;
}

const BUTTON_STYLES = [
    { id: 'COSMOS', label: 'Cosmos' },
    { id: 'MULTICOLOR', label: 'Multicolor' },
    { id: 'ORBIT', label: 'Orbit' },
    { id: 'NEON', label: 'Neon' },
    { id: 'BRUTALIST', label: 'Brutalist' },
    { id: 'MINIMAL', label: 'Minimal' },
    { id: 'GLITCH', label: 'Glitch' },
    { id: 'SOFT', label: 'Soft' },
    { id: 'GLASS', label: 'Glass' },
    { id: 'CYBER', label: 'Cyber' },
    { id: 'RETRO', label: 'Retro' },
    { id: 'LIQUID', label: 'Liquid' },
];

const BUTTON_POSITIONS = [
    { id: 'bottom-left', label: 'Bottom Left' },
    { id: 'bottom-center', label: 'Bottom Center' },
    { id: 'bottom-right', label: 'Bottom Right' },
];

const IMG_FILTERS = [
    { id: 'NONE', label: 'None' },
    { id: 'NOIR', label: 'Noir (B&W)' },
    { id: 'SEPIA', label: 'Sepia' },
    { id: 'VINTAGE', label: 'Vintage' },
    { id: 'CYBER', label: 'Cyber (Blue)' },
    { id: 'MATRIX', label: 'Matrix' },
    { id: 'DREAM', label: 'Dream Blur' },
    { id: 'GRAIN', label: 'High Grain' },
];

const GET_FILTER_CLASS = (filter: string) => {
    switch(filter) {
        case 'NOIR': return 'grayscale contrast-125 brightness-90';
        case 'SEPIA': return 'sepia contrast-110 brightness-90';
        case 'VINTAGE': return 'sepia-[.3] contrast-125 hue-rotate-[-10deg] saturate-150';
        case 'CYBER': return 'hue-rotate-180 contrast-125 saturate-200';
        case 'MATRIX': return 'grayscale sepia-[.8] hue-rotate-[50deg] contrast-125';
        case 'DREAM': return 'blur-[1px] brightness-110 contrast-90 saturate-150';
        case 'GRAIN': return 'contrast-150 brightness-90 sepia-[.2]';
        case 'NONE':
        default: return '';
    }
};

const ProfileEditorView: React.FC<Props> = ({ profile, widgetData, onUpdateProfile, onUpdateWidget, onBack }) => {
    const [localProfile, setLocalProfile] = useState<UserProfile>(profile);
    const [localSettings, setLocalSettings] = useState(widgetData.settings || {});
    
    const [isGeneratingAvatar, setIsGeneratingAvatar] = useState(false);
    const [isGeneratingCover, setIsGeneratingCover] = useState(false);
    const [activeTab, setActiveTab] = useState<'identity' | 'interface'>('identity');

    const avatarInputRef = useRef<HTMLInputElement>(null);
    const coverInputRef = useRef<HTMLInputElement>(null);

    const handleSave = () => {
        onUpdateProfile(localProfile);
        onUpdateWidget(widgetData.id, { settings: localSettings });
        onBack();
    };

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, field: 'avatar' | 'coverImage') => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setLocalProfile(prev => ({ ...prev, [field]: reader.result as string }));
            };
            reader.readAsDataURL(file);
        }
    };

    const handleAiGen = async (type: 'avatar' | 'cover') => {
        const context = {
            role: localProfile.role,
            bio: localProfile.bio
        };

        if (type === 'avatar') {
            setIsGeneratingAvatar(true);
            const result = await generateAvatar(context);
            if (result) setLocalProfile(prev => ({ ...prev, avatar: result }));
            setIsGeneratingAvatar(false);
        } else {
            setIsGeneratingCover(true);
            const result = await generateCoverImage(context);
            if (result) setLocalProfile(prev => ({ ...prev, coverImage: result }));
            setIsGeneratingCover(false);
        }
    };

    const updateSetting = (key: string, value: any) => {
        setLocalSettings(prev => ({ ...prev, [key]: value }));
    };

    return (
        <div className="min-h-screen bg-[#050505] text-white flex flex-col font-sans">
            {/* Header */}
            <header className="sticky top-0 z-50 bg-[#050505]/80 backdrop-blur-xl border-b border-white/5 px-6 py-4 flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <button onClick={onBack} className="p-2 -ml-2 text-white/50 hover:text-white rounded-full hover:bg-white/10 transition-colors">
                        <ArrowLeft size={24} />
                    </button>
                    <div>
                        <h1 className="text-xl font-bold font-display tracking-tight">Edit Profile System</h1>
                        <p className="text-[10px] text-white/40 font-mono uppercase tracking-widest">User Configuration</p>
                    </div>
                </div>
                <button 
                    onClick={handleSave}
                    className="flex items-center gap-2 px-6 py-2 bg-white text-black rounded-full font-bold text-sm hover:scale-105 transition-transform shadow-lg shadow-white/10"
                >
                    <Save size={16} /> Save Changes
                </button>
            </header>

            <main className="flex-1 max-w-6xl mx-auto w-full p-6 lg:p-10 grid grid-cols-1 lg:grid-cols-12 gap-10">
                
                {/* Left Sidebar / Tabs */}
                <div className="lg:col-span-3 space-y-2">
                    <button 
                        onClick={() => setActiveTab('identity')}
                        className={`w-full text-left px-4 py-3 rounded-xl font-medium transition-all flex items-center gap-3 ${activeTab === 'identity' ? 'bg-white/10 text-white' : 'text-white/40 hover:text-white hover:bg-white/5'}`}
                    >
                        <Layout size={18} /> Identity & Assets
                    </button>
                    <button 
                        onClick={() => setActiveTab('interface')}
                        className={`w-full text-left px-4 py-3 rounded-xl font-medium transition-all flex items-center gap-3 ${activeTab === 'interface' ? 'bg-white/10 text-white' : 'text-white/40 hover:text-white hover:bg-white/5'}`}
                    >
                        <Palette size={18} /> Interface & Style
                    </button>
                </div>

                {/* Main Content Area */}
                <div className="lg:col-span-9 bg-[#0A0A0A] border border-white/5 rounded-3xl p-8 min-h-[600px]">
                    
                    {activeTab === 'identity' && (
                        <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
                            {/* Cover Image Section */}
                            <section className="space-y-4">
                                <div className="flex justify-between items-end">
                                    <label className="text-xs font-mono text-white/40 uppercase tracking-widest">Cover Image</label>
                                    <div className="flex gap-2">
                                        <button 
                                            onClick={() => handleAiGen('cover')}
                                            disabled={isGeneratingCover}
                                            className="px-3 py-1.5 bg-purple-500/10 text-purple-300 border border-purple-500/20 rounded-full text-xs font-bold flex items-center gap-2 hover:bg-purple-500/20 transition-colors"
                                        >
                                            {isGeneratingCover ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
                                            AI Generate
                                        </button>
                                        <button 
                                            onClick={() => coverInputRef.current?.click()}
                                            className="px-3 py-1.5 bg-white/5 text-white border border-white/10 rounded-full text-xs font-bold flex items-center gap-2 hover:bg-white/10 transition-colors"
                                        >
                                            <Upload size={12} /> Upload
                                        </button>
                                        <input type="file" ref={coverInputRef} className="hidden" accept="image/*" onChange={(e) => handleFileUpload(e, 'coverImage')} />
                                    </div>
                                </div>
                                <div className="w-full h-48 rounded-2xl overflow-hidden border border-white/10 relative group">
                                    <img 
                                        src={localProfile.coverImage} 
                                        className={`w-full h-full object-cover ${GET_FILTER_CLASS(localSettings.profileFilter || 'NONE')}`} 
                                    />
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                                </div>
                            </section>

                            {/* Avatar Section */}
                            <section className="flex flex-col md:flex-row items-start gap-8">
                                <div className="relative group shrink-0 mx-auto md:mx-0">
                                    <div className="w-32 h-32 rounded-full border-2 border-white/10 overflow-hidden relative bg-black">
                                        {isGeneratingAvatar ? (
                                            <div className="w-full h-full flex items-center justify-center bg-white/5"><Loader2 size={32} className="animate-spin text-white/20"/></div>
                                        ) : (
                                            <img src={localProfile.avatar} className={`w-full h-full object-cover ${GET_FILTER_CLASS(localSettings.profileFilter || 'NONE')}`} />
                                        )}
                                    </div>
                                    <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 flex gap-1">
                                         <button 
                                            onClick={() => handleAiGen('avatar')}
                                            className="p-2 bg-purple-500 text-white rounded-full shadow-lg hover:scale-110 transition-transform"
                                            title="AI Generate Avatar"
                                        >
                                            <Sparkles size={14} />
                                        </button>
                                        <button 
                                            onClick={() => avatarInputRef.current?.click()}
                                            className="p-2 bg-white text-black rounded-full shadow-lg hover:scale-110 transition-transform"
                                            title="Upload Avatar"
                                        >
                                            <Upload size={14} />
                                        </button>
                                    </div>
                                    <input type="file" ref={avatarInputRef} className="hidden" accept="image/*" onChange={(e) => handleFileUpload(e, 'avatar')} />
                                </div>

                                <div className="flex-1 space-y-6 w-full">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="space-y-2">
                                            <label className="text-xs font-mono text-white/40 uppercase tracking-widest">Display Name</label>
                                            <input 
                                                value={localProfile.name}
                                                onChange={(e) => setLocalProfile({...localProfile, name: e.target.value})}
                                                className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-white/30 outline-none transition-colors"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-xs font-mono text-white/40 uppercase tracking-widest">Role / Title</label>
                                            <input 
                                                value={localProfile.role}
                                                onChange={(e) => setLocalProfile({...localProfile, role: e.target.value})}
                                                className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-white/30 outline-none transition-colors"
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs font-mono text-white/40 uppercase tracking-widest">Bio</label>
                                        <textarea 
                                            value={localProfile.bio}
                                            onChange={(e) => setLocalProfile({...localProfile, bio: e.target.value})}
                                            className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-white/30 outline-none transition-colors h-24 resize-none"
                                        />
                                    </div>
                                </div>
                            </section>

                            <section className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-6 border-t border-white/5">
                                <div className="space-y-2">
                                    <label className="text-xs font-mono text-white/40 uppercase tracking-widest">Manifesto / Quote</label>
                                    <textarea 
                                        value={localProfile.manifesto}
                                        onChange={(e) => setLocalProfile({...localProfile, manifesto: e.target.value})}
                                        className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-white/30 outline-none transition-colors h-24 resize-none font-medium italic text-white/80"
                                    />
                                </div>
                                <div className="space-y-4">
                                     <div className="space-y-2">
                                        <label className="text-xs font-mono text-white/40 uppercase tracking-widest">Location</label>
                                        <input 
                                            value={localProfile.location}
                                            onChange={(e) => setLocalProfile({...localProfile, location: e.target.value})}
                                            className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-white/30 outline-none transition-colors"
                                        />
                                     </div>
                                     <div className="space-y-2">
                                        <label className="text-xs font-mono text-white/40 uppercase tracking-widest">Timezone</label>
                                        <input 
                                            value={localProfile.timezone}
                                            onChange={(e) => setLocalProfile({...localProfile, timezone: e.target.value})}
                                            className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-white/30 outline-none transition-colors"
                                        />
                                     </div>
                                </div>
                            </section>
                        </div>
                    )}

                    {activeTab === 'interface' && (
                        <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
                             
                             {/* Button Style */}
                             <div className="space-y-4">
                                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                                    <Check size={16} className="text-emerald-400" /> Follow Button Style
                                </h3>
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                                    {BUTTON_STYLES.map(style => (
                                        <div key={style.id} className={`relative group ${localSettings.followButtonStyle === style.id ? 'ring-2 ring-emerald-500 rounded-2xl p-1 bg-white/5' : 'p-1'}`}>
                                             <div onClick={() => updateSetting('followButtonStyle', style.id)} className="cursor-pointer">
                                                {RENDER_BUTTON(style.id, {
                                                    text: style.label,
                                                    color: localSettings.followButtonColor || '#a855f7',
                                                    onClick: () => updateSetting('followButtonStyle', style.id)
                                                })}
                                             </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-10 border-t border-white/5 pt-8">
                                {/* Button Text & Color */}
                                <div className="space-y-6">
                                    <div className="space-y-2">
                                        <h3 className="text-sm font-bold text-white flex items-center gap-2 mb-4">
                                            <Type size={16} className="text-indigo-400" /> Button Configuration
                                        </h3>
                                        <label className="text-xs font-mono text-white/40 uppercase tracking-widest">Label Text</label>
                                        <input 
                                            type="text" 
                                            value={localSettings.followButtonText || 'Follow'}
                                            onChange={(e) => updateSetting('followButtonText', e.target.value)}
                                            placeholder="e.g. Connect"
                                            className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-white/30 text-sm"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs font-mono text-white/40 uppercase tracking-widest">Accent Color</label>
                                        <div className="flex items-center gap-4 bg-black/30 border border-white/10 rounded-xl p-2">
                                            <input 
                                                type="color" 
                                                value={localSettings.followButtonColor || '#a855f7'}
                                                onChange={(e) => updateSetting('followButtonColor', e.target.value)}
                                                className="w-10 h-10 rounded-lg cursor-pointer bg-transparent border-none" 
                                            />
                                            <span className="text-xs font-mono text-white/50">{localSettings.followButtonColor || '#a855f7'}</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Position & Size */}
                                <div className="space-y-6">
                                     <h3 className="text-sm font-bold text-white flex items-center gap-2 mb-4">
                                        <Move size={16} className="text-orange-400" /> Layout & Scale
                                    </h3>
                                    
                                    <div className="space-y-2">
                                        <label className="text-xs font-mono text-white/40 uppercase tracking-widest">Screen Position</label>
                                        <select
                                            value={localSettings.followButtonPosition || 'bottom-right'}
                                            onChange={(e) => updateSetting('followButtonPosition', e.target.value)}
                                            className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-white/30 text-sm appearance-none"
                                        >
                                            {BUTTON_POSITIONS.map(pos => (
                                                <option key={pos.id} value={pos.id}>{pos.label}</option>
                                            ))}
                                        </select>
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-xs font-mono text-white/40 uppercase tracking-widest">Scale Multiplier</label>
                                        <div className="flex items-center gap-4 bg-black/30 border border-white/10 rounded-xl p-3">
                                            <span className="text-xs text-white/40 font-mono">0.5x</span>
                                            <input 
                                                type="range" 
                                                min="0.5" 
                                                max="1.5" 
                                                step="0.1"
                                                value={localSettings.followButtonScale || 1}
                                                onChange={(e) => updateSetting('followButtonScale', parseFloat(e.target.value))}
                                                className="flex-1 accent-white" 
                                            />
                                            <span className="text-xs text-white/40 font-mono">1.5x</span>
                                            <span className="text-xs font-mono text-white w-12 text-right">{localSettings.followButtonScale || 1}x</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Filters */}
                            <div className="space-y-4 border-t border-white/5 pt-8">
                                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                                    <Camera size={16} className="text-blue-400" /> Visual Filter
                                </h3>
                                <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
                                    {IMG_FILTERS.map(filter => (
                                        <button
                                            key={filter.id}
                                            onClick={() => updateSetting('profileFilter', filter.id)}
                                            className={`flex flex-col items-center gap-2 p-3 rounded-xl border transition-all ${
                                                localSettings.profileFilter === filter.id 
                                                ? 'bg-white/10 border-white text-white' 
                                                : 'bg-white/5 border-white/5 text-white/40 hover:bg-white/10'
                                            }`}
                                        >
                                            <div className={`w-full h-10 rounded-md overflow-hidden border border-white/10`}>
                                                <img 
                                                    src={localProfile.coverImage || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=1000&auto=format&fit=crop"} 
                                                    className={`w-full h-full object-cover ${GET_FILTER_CLASS(filter.id)}`}
                                                />
                                            </div>
                                            <span className="text-[10px] font-bold uppercase tracking-wider">{filter.label}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>

                        </div>
                    )}

                </div>
            </main>
        </div>
    );
};

export default ProfileEditorView;




