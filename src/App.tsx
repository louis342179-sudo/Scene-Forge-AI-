import React, { useState, useEffect } from "react";
import { 
  Copy, Loader2, Sparkles, Wand2, Info, 
  UserCircle2, Box, Type, VolumeX, Video, LayoutList,
  LayoutDashboard, FolderOpen, LayoutTemplate, Users, History, Settings as SettingsIcon,
  Crown, Plus, CheckCircle2, FileText, Files, X, Moon, Sun, User, LogOut, Image, Check, Maximize2,
  BrainCircuit, AlertTriangle, CheckCircle, Activity, PenTool, Download, Clapperboard, Menu
} from "lucide-react";
import { useAuth } from "./lib/AuthContext";
import { db, handleFirestoreError, OperationType } from "./lib/firebase";
import { collection, addDoc, getDocs, serverTimestamp, query, where, orderBy } from "firebase/firestore";

const LOADING_STEPS = [
  { title: "Analyzing Screenplay Structure", desc: "Parsing narrative blocks, identifying dialogue hooks, and organizing scenes chronologically." },
  { title: "Extracting Character Persona & DNA Traits", desc: "Documenting age, clothing style, hair, accessories, and tracking trait consistency." },
  { title: "Charting Emotional Arc Intensity Curve", desc: "Locating psychological shifts and calculating emotional tension curves per scene." },
  { title: "Formulating Cinematic Director Lighting", desc: "Setting backlights, ambient shadow contrasts, and matching colors to the mood." },
  { title: "Architecting Camera Movements & Shot Angles", desc: "Prescribing depth-of-field, closeups, tracking pans, and dramatic angles." },
  { title: "Generating Prompt Variations & Director-Style Battles", desc: "Simulating multiple artistic presets (Pixar, Documentary, Anime) in the background." },
  { title: "Validating Prompt Safety & Output Compliance", desc: "Optimizing structure to bypass system blocks and guarantee high-speed processing." },
  { title: "Polishing Creative Director Reports & Viral Triggers", desc: "Consolidating final storyboard cards, continuity logs, and audience retention indexes." }
];

const LOADING_TIPS = [
  "The more descriptions you give your characters inside your script, the more descriptive and robust their extracted DNA profile will be.",
  "You can change the target platform settings to optimize prompts specifically for Luma Dream Machine, Runway Gen-2, Kling, or Sora.",
  "SceneForge runs prompt battles behind the scenes, mathematically matching your style settings against the absolute best prompt contender.",
  "Character DNA drifts auto-detect wardrobe, skin tone, or hair variations between scenes, helping you fix inconsistencies instantly.",
  "The 'Copy Visual' option secures optimized scene descriptions to draft beautiful concept prompts for image generators.",
  "Pressing the TXT or JSON exports allows you to download clean production files for direct import into professional video generators.",
  "You can click the 'Director Report' tab to review automated metrics on viewer attention retention, conflict scores, and pacing."
];

// Scene Bundle formatter for easy unified clipboard copying
const getSceneBundleText = (scene: any, sIdx: number) => {
  return `=== DIRECTORE'S PRODUCTION SCENE REPORT (SCENE ${sIdx + 1}) ===

[NARRATIVE SCREENPLAY LINE]
"${scene.sceneBreakdown || ''}"

[CINEMATIC ATTRIBUTES]
* Emotion / Mood Key: ${scene.emotion || 'Neutral'}
* Camera Shot & Angle: ${scene.camera || 'Static eye-level standard'}
* Lighting Tone: ${scene.lighting || 'Cinematic Ambient'}

[STORYBOARD SCHETCH CONCEPT]
${scene.storyboard || 'N/A'}

[PRIMARY CINEMATIC PROMPT (RECOMMENDED FOR VEO, SORA, RUNWAY, LUMA)]
${scene.veoExportPrompt || scene.prompt || ''}

[TECHNICAL ASPECT RATIO PROMPT]
${scene.prompt || ''}
`;
};

export default function App() {
  const { user, login, logout, loading: authLoading } = useAuth();
  
  const [script, setScript] = useState("");
  const [audience, setAudience] = useState("YouTube");
  const [targetPlatform, setTargetPlatform] = useState("Google Veo");
  const [promptLanguage, setPromptLanguage] = useState("English");
  const [directorStyle, setDirectorStyle] = useState("Educational");
  const [scenes, setScenes] = useState<{ sceneBreakdown: string; emotion: string; camera: string; lighting: string; prompt: string; storyboard?: string; generatedImage?: string }[]>([]);
  const [extractedCharacter, setExtractedCharacter] = useState<{ id: string; age: string; hair: string; outfit: string; skinTone: string; accessories: string; consistencyScore?: number; matchedTraits?: string[]; driftsDetected?: {sceneNumber: number, issue: string, suggestedFix: string}[] } | null>(null);
  const [qualityScore, setQualityScore] = useState<{ score: number; issues: string[] } | null>(null);
  const [viralOptimizer, setViralOptimizer] = useState<{ hookStrength: string; retentionPotential: string; visualVariety: string; suggestions: string[] } | null>(null);
  const [narrativeArc, setNarrativeArc] = useState<{ arcType: string; narrativeStrength: number; emotionCurve: string[]; missingElements: string[]; retentionPotential?: number; pacingAnalysis?: string } | null>(null);
  const [stressTest, setStressTest] = useState<{ sceneNumber: number; potentialIssue: string; autoFix: string; }[] | null>(null);
  
  const [loading, setLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);
  const [loadingTipIndex, setLoadingTipIndex] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [copiedIndex, setCopiedIndex] = useState<number | string | null>(null);
  
  const [currentScenePage, setCurrentScenePage] = useState(1);
  const scenesPerPage = 5;
  const indexOfLastScene = currentScenePage * scenesPerPage;
  const indexOfFirstScene = indexOfLastScene - scenesPerPage;
  const currentScenes = scenes.slice(indexOfFirstScene, indexOfLastScene);
  const totalPages = Math.ceil(scenes.length / scenesPerPage);
  const [allCopied, setAllCopied] = useState(false);
  const [selectedSceneIndex, setSelectedSceneIndex] = useState<number | null>(null);

  const [activeTab, setActiveTab] = useState('Dashboard');
  const [showHowItWorks, setShowHowItWorks] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  
  const [theme, setTheme] = useState('light');

  const [settings, setSettings] = useState({
    characterConsistency: true,
    flatVectorStyle: true,
    hinglishText: true,
    lipSync: false,
    veoOptimized: true,
    autoSceneDetection: true,
    dynamicCharacter: true,
  });

  const [projects, setProjects] = useState<any[]>([]);

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  useEffect(() => {
    if (user && (activeTab === 'Projects' || activeTab === 'History')) {
      fetchProjects();
    }
  }, [user, activeTab]);

  useEffect(() => {
    let stepInterval: any;
    let tipInterval: any;
    if (loading) {
      setLoadingStep(0);
      setLoadingTipIndex(Math.floor(Math.random() * LOADING_TIPS.length));
      
      stepInterval = setInterval(() => {
        setLoadingStep(prev => (prev < LOADING_STEPS.length - 1 ? prev + 1 : prev));
      }, 2500); // Progress to next system stage every 2.5 seconds
      
      tipInterval = setInterval(() => {
        setLoadingTipIndex(prev => (prev + 1) % LOADING_TIPS.length);
      }, 5500); // Change pro tips/trivia every 5.5 seconds
    } else {
      setLoadingStep(0);
    }
    return () => {
      clearInterval(stepInterval);
      clearInterval(tipInterval);
    };
  }, [loading]);

  const fetchProjects = async () => {
    if (!user) return;
    try {
      // NOTE: Queries with orderBy may initially require a composite index if hitting multiple fields.
      const q = query(
        collection(db, "projects"),
        where("ownerId", "==", user.uid)
        // orderBy("createdAt", "desc") // omitted to avoid index requirement for preview
      );
      const snapshot = await getDocs(q);
      const fetched = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      // Manually sort since we didn't use orderBy in query
      fetched.sort((a: any, b: any) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
      setProjects(fetched);
    } catch (err) {
      handleFirestoreError(err, OperationType.LIST, "projects");
    }
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleLoadProject = (proj: any) => {
    setScript(proj.script || "");
    setAudience(proj.audience || "YouTube");
    setTargetPlatform(proj.targetPlatform || "Google Veo");
    setPromptLanguage(proj.promptLanguage || "English");
    setDirectorStyle(proj.directorStyle || "Educational");
    setScenes(proj.scenes || []);
    setExtractedCharacter(proj.character || null);
    setQualityScore(proj.qualityScore || null);
    setViralOptimizer(proj.viralOptimizer || null);
    setNarrativeArc(proj.narrativeArc || null);
    setStressTest(proj.stressTest || null);
    setCurrentScenePage(1);
    setActiveTab('Dashboard');
  };

  const handleResetSettings = () => {
    setSettings({
      characterConsistency: true,
      flatVectorStyle: true,
      hinglishText: true,
      lipSync: false,
      veoOptimized: true,
      autoSceneDetection: true,
      dynamicCharacter: true,
    });
    showToast("Settings reset to default.");
  };

  const handleNewProject = () => {
    setScript("");
    setScenes([]);
    setExtractedCharacter(null);
    setQualityScore(null);
    setViralOptimizer(null);
    setNarrativeArc(null);
    setStressTest(null);
    setError(null);
    setCurrentScenePage(1);
    setActiveTab("Dashboard");
    showToast("Started new project.");
  };

  const toggleSetting = (key: keyof typeof settings) => {
    setSettings(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleGenerate = async () => {
    if (!script.trim()) return;

    setLoading(true);
    setError(null);
    setScenes([]);
    setExtractedCharacter(null);
    setQualityScore(null);
    setViralOptimizer(null);
    setNarrativeArc(null);
    setStressTest(null);
    setCurrentScenePage(1);

    try {
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ script, settings, audience, targetPlatform, promptLanguage, directorStyle }),
      });

      const rawText = await response.text();
      let data: any;
      try {
        data = JSON.parse(rawText);
      } catch {
        throw new Error(
          response.ok
            ? "Invalid response format from server."
            : `Server error (${response.status}). Please ensure the API endpoint is deployed and reachable.`
        );
      }

      if (!response.ok) {
        throw new Error(data?.error || "Failed to generate prompts.");
      }

      setScenes(data.scenes || []);
      setExtractedCharacter(data.character || null);
      setQualityScore(data.qualityScore || null);
      setViralOptimizer(data.viralOptimizer || null);
      setNarrativeArc(data.narrativeArc || null);
      setStressTest(data.stressTest || null);
      
      // Save generating project to Firestore if logged in
      if (user) {
        try {
          const projectData: any = {
            ownerId: user.uid,
            script,
            audience,
            targetPlatform,
            promptLanguage,
            directorStyle,
            scenes: data.scenes || [],
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
          };
          if (data.character) projectData.character = data.character;
          if (data.qualityScore) projectData.qualityScore = data.qualityScore;
          if (data.viralOptimizer) projectData.viralOptimizer = data.viralOptimizer;
          if (data.narrativeArc) projectData.narrativeArc = data.narrativeArc;
          if (data.stressTest) projectData.stressTest = data.stressTest;
          
          await addDoc(collection(db, "projects"), projectData);
          fetchProjects();
          showToast("Project saved to your account!");
        } catch (dbErr) {
          console.error("Failed to save project to db:", dbErr);
        }
      }

    } catch (err: any) {
      setError(err.message || "An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateImage = async (index: number, prompt: string) => {
    try {
      setScenes(prev => {
        const newScenes = [...prev];
        newScenes[index] = { ...newScenes[index], generatedImage: "loading" };
        return newScenes;
      });
      
      const response = await fetch("/api/generate-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt }),
      });
      const rawText = await response.text();
      let data: any;
      try {
        data = JSON.parse(rawText);
      } catch {
        throw new Error(`Image server error (${response.status}).`);
      }

      if (!response.ok) throw new Error(data?.error || "Image generation failed");

      const mime = data.mimeType || "image/png";
      setScenes(prev => {
        const finalScenes = [...prev];
        finalScenes[index] = { ...finalScenes[index], generatedImage: `data:${mime};base64,${data.imageBase64}` };
        return finalScenes;
      });
    } catch (err: any) {
       console.error("Image gen failed", err);
       setScenes(prev => {
         const errorScenes = [...prev];
         errorScenes[index] = { ...errorScenes[index], generatedImage: undefined };
         return errorScenes;
       });
       showToast(err.message || "Failed to generate thumbnail.");
    }
  };

  const handleCopy = (text: string, index: number | string) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const handleCopyAll = () => {
    const all = scenes.map((s, i) => `Scene ${i + 1}\nContext: ${s.sceneBreakdown}\nPrompt: ${s.prompt}`).join('\n\n');
    navigator.clipboard.writeText(all);
    setAllCopied(true);
    setTimeout(() => setAllCopied(false), 2000);
  };

  return (
    <div className={`h-[100dvh] w-full bg-slate-50 dark:bg-[#111113] text-slate-900 dark:text-slate-50 flex font-sans overflow-hidden transition-colors`}>
      
      {/* Immersive Loading Overlay */}
      {loading && (
        <div className="fixed inset-0 z-[1000] bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 md:p-6 text-white transition-all duration-300 animate-in fade-in">
          <div className="max-w-lg w-full bg-slate-900/90 dark:bg-[#18181B]/95 border border-slate-800/80 rounded-2xl p-6 md:p-10 space-y-6 md:space-y-8 text-center shadow-2xl relative overflow-hidden backdrop-saturate-150 animate-in zoom-in-95 duration-300">
            {/* Ambient glowing fields */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[240px] h-[240px] bg-sky-500/10 blur-3xl rounded-full"></div>
            <div className="absolute -bottom-12 -right-12 w-[160px] h-[160px] bg-blue-500/10 blur-3xl rounded-full"></div>

            <div className="space-y-3 relative z-10">
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-sky-500/10 text-sky-400 border border-sky-500/20 rounded-full text-xs font-mono font-medium tracking-wide uppercase">
                <Sparkles className="w-3.5 h-3.5 animate-pulse" />
                Active Cinematic Processing
              </div>
              <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-white">SceneForge AI Engine</h2>
              <p className="text-xs md:text-sm text-slate-400 max-w-sm mx-auto">
                Please wait while Gemini analyzes your screenplay and generates production scene files.
              </p>
            </div>

            {/* Steps & Animations */}
            <div className="relative z-10 py-2">
              <div className="relative flex items-center justify-center mb-6">
                {/* Advanced Circular Loader */}
                <div className="w-24 h-24 rounded-full border-2 border-slate-800 flex items-center justify-center relative">
                  <div className="absolute inset-0.5 rounded-full border border-sky-500/30"></div>
                  <div className="absolute -inset-1 rounded-full border-4 border-t-sky-500 border-r-sky-500/20 border-b-sky-500/10 border-l-sky-500/20 animate-spin"></div>
                  <div className="absolute -inset-3 rounded-full border-2 border-t-blue-500/30 border-r-blue-500/10 border-b-blue-500/10 border-l-blue-500/20 animate-spin duration-1000"></div>
                  <Clapperboard className="w-8 h-8 text-sky-400 animate-pulse" />
                </div>
              </div>

              {/* Progress bar container */}
              <div className="space-y-2.5 max-w-md mx-auto">
                <div className="flex justify-between items-center text-xs text-slate-400 font-mono">
                  <span>SYSTEM PIPELINE LEVEL</span>
                  <span className="text-sky-400 font-semibold">{Math.round(((loadingStep + 1) / LOADING_STEPS.length) * 100)}%</span>
                </div>
                {/* Visual Progress Bar */}
                <div className="w-full h-2.5 bg-slate-800 rounded-full overflow-hidden border border-slate-700/50">
                  <div 
                    className="h-full bg-gradient-to-r from-sky-500 to-blue-500 transition-all duration-500 rounded-full shadow-[0_0_12px_rgba(14,165,233,0.5)]"
                    style={{ width: `${((loadingStep + 1) / LOADING_STEPS.length) * 100}%` }}
                  ></div>
                </div>
              </div>

              {/* Display Current Active Step */}
              <div className="mt-6 space-y-2 min-h-[100px] flex flex-col justify-center">
                <h3 className="text-xs font-mono font-bold uppercase text-sky-400 tracking-wider">
                  Module {loadingStep + 1} of {LOADING_STEPS.length}
                </h3>
                <h4 className="text-lg md:text-xl font-bold text-white leading-snug">
                  {LOADING_STEPS[loadingStep].title}
                </h4>
                <p className="text-xs md:text-sm text-slate-400 max-w-sm mx-auto leading-relaxed">
                  {LOADING_STEPS[loadingStep].desc}
                </p>
              </div>
            </div>

            {/* Pro Tip Carousel Box */}
            <div className="bg-slate-950/45 border border-slate-800/80 rounded-xl p-4 md:p-5 relative z-10 max-w-md mx-auto text-left min-h-[96px] flex items-center">
              <div className="flex gap-4 items-start">
                <Info className="w-5 h-5 text-sky-400 shrink-0 mt-0.5 animate-bounce" />
                <div className="space-y-1">
                  <h5 className="text-[10px] font-bold text-sky-400 uppercase tracking-widest font-mono">Pro Tip / Optimization Insights</h5>
                  <p className="text-xs md:text-[13px] leading-relaxed text-slate-300 font-medium font-sans">
                    {LOADING_TIPS[loadingTipIndex]}
                  </p>
                </div>
              </div>
            </div>

            {/* Trust disclaimer */}
            <p className="text-[11px] text-slate-500 relative z-10 italic max-w-xs mx-auto">
              This high-precision processing preserves visual consistency. Please do not close or reload this page.
            </p>
          </div>
        </div>
      )}

      {/* Overlay */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 bg-black/50 z-40 md:hidden backdrop-blur-sm transition-opacity" onClick={() => setIsMobileMenuOpen(false)}></div>
      )}

      {/* Sidebar */}
      <aside className={`w-[260px] bg-white dark:bg-[#111113] border-r border-slate-200/80 dark:border-[#3F3F46] flex flex-col shrink-0 overflow-y-auto hide-scrollbar z-50 transition-all duration-300 fixed md:relative h-full ${isMobileMenuOpen ? 'left-0 shadow-2xl' : '-left-full md:left-0'}`}>
        <div onClick={() => { setActiveTab('Dashboard'); setIsMobileMenuOpen(false); }} className="h-20 shrink-0 flex items-center px-6 gap-4 md:gap-5 cursor-pointer hover:opacity-80 transition-opacity">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-sky-500 to-cyan-400 flex items-center justify-center shrink-0 shadow-lg shadow-sky-900/30">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <span className="font-bold text-slate-800 dark:text-slate-200 text-[15px] xl:block hidden tracking-tight leading-tight">SceneForge AI<br/><span className="text-sm md:text-[15px] leading-relaxed md:text-sm text-sky-600 dark:text-sky-400 font-medium">From Script to Production</span></span>
        </div>
        
        <div className="px-3 xl:px-6 md:px-8 py-2">
          <button onClick={handleNewProject} className="w-full bg-sky-600 hover:bg-sky-500 text-white rounded-lg py-2.5 flex items-center justify-center gap-4 md:gap-5 md:gap-4 text-sm font-semibold transition-colors shadow-lg shadow-sky-900/20 cursor-pointer">
            <Plus className="w-4 h-4" />
            <span>New Project</span>
          </button>
        </div>
        
        <nav className="flex-1 px-6 md:px-8 py-5 md:py-6 space-y-1">
          <SidebarItem icon={LayoutDashboard} label="Dashboard" active={activeTab === 'Dashboard'} onClick={() => { setActiveTab('Dashboard'); setIsMobileMenuOpen(false); }} />
          <SidebarItem icon={FolderOpen} label="Projects" active={activeTab === 'Projects'} onClick={() => { setActiveTab('Projects'); setIsMobileMenuOpen(false); }} />
          <SidebarItem icon={FileText} label="Dev Report" active={activeTab === 'Templates'} onClick={() => { setActiveTab('Templates'); setIsMobileMenuOpen(false); }} />
          <SidebarItem icon={Users} label="Characters" active={activeTab === 'Characters'} onClick={() => { setActiveTab('Characters'); setIsMobileMenuOpen(false); }} />
          <SidebarItem icon={Clapperboard} label="Prompt Battle" active={activeTab === 'PromptBattle'} onClick={() => { setActiveTab('PromptBattle'); setIsMobileMenuOpen(false); }} />
          <SidebarItem icon={History} label="History" active={activeTab === 'History'} onClick={() => { setActiveTab('History'); setIsMobileMenuOpen(false); }} />
          <SidebarItem icon={User} label="Profile" active={activeTab === 'Profile'} onClick={() => { setActiveTab('Profile'); setIsMobileMenuOpen(false); }} />
          <SidebarItem icon={SettingsIcon} label="Settings" active={activeTab === 'Settings'} onClick={() => { setActiveTab('Settings'); setIsMobileMenuOpen(false); }} />
        </nav>
        
        <div className="p-6">
          <div className="bg-gradient-to-br from-emerald-50 dark:from-emerald-950/20 to-emerald-100/50 dark:to-emerald-900/10 border border-emerald-200 dark:border-emerald-900/30 rounded-xl p-6 md:p-8 text-center space-y-3 relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/10 blur-2xl rounded-full translate-x-1/2 -translate-y-1/2 group-hover:bg-emerald-500/20 transition-colors"></div>
            <Crown className="w-7 h-7 text-emerald-500 dark:text-emerald-400 mx-auto" />
            <h4 className="text-[15px] font-bold text-emerald-900 dark:text-emerald-50">Pro Plan Active</h4>
            <ul className="text-sm md:text-[15px] leading-relaxed text-emerald-800/80 dark:text-emerald-200/80 text-left space-y-2.5 py-1">
              <li className="flex gap-4 md:gap-5 md:gap-4"><CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0"/> Unlimited Generations</li>
              <li className="flex gap-4 md:gap-5 md:gap-4"><CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0"/> Custom Templates</li>
              <li className="flex gap-4 md:gap-5 md:gap-4"><CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0"/> Auto Priority Processing</li>
            </ul>
            <div className="w-full bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 text-sm md:text-[15px] leading-relaxed font-bold py-2.5 rounded-lg mt-2 transition-all flex items-center justify-center gap-4 md:gap-5 md:gap-4">
              <CheckCircle2 className="w-4 h-4" /> Account Upgraded
            </div>
          </div>
        </div>
      </aside>



      {/* Main Content */}
      <main className="flex-1 flex flex-col h-full overflow-hidden relative">
        <div className="flex-1 overflow-y-auto px-6 md:px-8 lg:px-8 pt-8 pb-10 w-full">
          <div className="max-w-[1400px] mx-auto space-y-8">
            {/* Header */}
            <header className="flex flex-col md:flex-row md:items-start justify-between gap-6">
              <div className="space-y-2">
                <div className="flex items-center gap-4 md:gap-5">
                  <button onClick={() => setIsMobileMenuOpen(true)} className="md:hidden p-2 -ml-2 text-slate-800 dark:text-slate-200">
                    <Menu className="w-6 h-6" />
                  </button>
                  <h1 className="text-3xl md:text-4xl font-bold text-slate-900 dark:text-white flex items-center gap-4 md:gap-5 tracking-tight cursor-pointer" onClick={() => setActiveTab('Dashboard')}>
                    SceneForge AI <Sparkles className="w-7 h-7 text-sky-600 dark:text-sky-400" />
                  </h1>
                </div>
                <p className="text-slate-600 dark:text-slate-200 max-w-3xl text-[15px] leading-relaxed md:pl-0 pl-1">
                  From Script to Production-Ready AI Video in Seconds.
                </p>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                  className="p-2.5 rounded-full border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#111113] hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition-colors shadow-sm"
                  title="Toggle Theme"
                >
                  {theme === 'dark' ? <div className="flex items-center gap-2"><div className="w-5 h-5 flex items-center justify-center">☀️</div></div> : <div className="flex items-center gap-2"><div className="w-5 h-5 flex items-center justify-center">🌙</div></div>}
                </button>
                {user ? (
                  <button onClick={() => setActiveTab('Profile')} className="w-10 h-10 rounded-full bg-sky-600 text-white flex items-center justify-center shadow-lg hover:bg-sky-500 transition-colors shrink-0 overflow-hidden border border-sky-400 dark:border-sky-700">
                    {user.photoURL ? <img src={user.photoURL} alt="Profile" className="w-full h-full object-cover"/> : <Users className="w-5 h-5" />}
                  </button>
                ) : (
                  <button onClick={login} className="px-5 py-2.5 bg-sky-600 hover:bg-sky-500 text-white rounded-lg text-sm font-bold shadow-lg shadow-sky-900/20 transition-colors border border-sky-400 dark:border-sky-700 whitespace-nowrap">
                    Sign Up / Login
                  </button>
                )}
              </div>
            </header>

            {activeTab === 'Projects' && <ProjectsView projects={projects} user={user} login={login} onLoad={handleLoadProject} />}
            {activeTab === 'Templates' && <AIDirectorReportView project={{ narrativeArc, qualityScore, character: extractedCharacter, stressTest, directorStyle, targetPlatform, createdAt: { seconds: Date.now() / 1000 } }} />}
            {activeTab === 'Characters' && <CharactersView character={extractedCharacter} />}
            {activeTab === 'PromptBattle' && <PromptBattleView project={{ scenes }} />}
            {activeTab === 'History' && <HistoryView projects={projects} user={user} login={login} onLoad={handleLoadProject} />}
            {activeTab === 'Settings' && <SettingsView settings={settings} toggleSetting={toggleSetting} handleResetSettings={handleResetSettings} theme={theme} setTheme={setTheme} />}
            {activeTab === 'Profile' && <ProfileView user={user} login={login} logout={logout} projectsCount={projects.length} />}
            
            {activeTab === 'Dashboard' && (
              <>
                {!user && (
                  <div className="bg-sky-50 dark:bg-sky-900/20 border border-sky-200 dark:border-sky-800 rounded-xl px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-4 mb-4">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full flex items-center justify-center bg-sky-100 dark:bg-sky-800 shrink-0">
                        <Sparkles className="w-5 h-5 text-sky-600 dark:text-sky-400" />
                      </div>
                      <div>
                        <h3 className="font-bold text-sky-900 dark:text-sky-100 text-base">Welcome to SceneForge AI</h3>
                        <p className="text-sky-700 dark:text-sky-300 text-sm">Sign in to sync your scenes, use premium templates, and keep your history safe.</p>
                      </div>
                    </div>
                    <button onClick={login} className="px-6 py-2.5 bg-sky-600 hover:bg-sky-500 text-white rounded-lg text-sm font-bold shadow-lg transition-colors whitespace-nowrap w-full sm:w-auto">
                      Sign In Now
                    </button>
                  </div>
                )}
            <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] xl:grid-cols-[1fr_360px] gap-6">
              
              {/* Left Column Area */}
              <div className="flex flex-col gap-6">
                <div className="grid grid-cols-1 gap-6">
                  {/* Script Input Panel */}
                  <div className="bg-white dark:bg-[#18181B] border border-slate-200/80 dark:border-[#3F3F46] rounded-2xl flex flex-col overflow-hidden shadow-sm shadow-slate-200/50 dark:shadow-xl dark:shadow-black/40 xl:min-h-[460px] transition-colors">
                    <div className="px-6 md:px-8 py-5 md:py-6 border-b border-slate-200/80 dark:border-[#3F3F46] flex flex-col gap-6 bg-slate-50 dark:bg-[#18181B] w-full">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4 md:gap-5">
                            <div className="w-6 h-6 rounded-full bg-sky-600 flex items-center justify-center text-sm md:text-[15px] leading-relaxed md:text-sm font-bold text-white shadow-[0_0_10px_rgba(124,58,237,0.4)] shrink-0">1</div>
                            <h2 className="font-semibold text-slate-900 dark:text-white">Paste Your Script <span className="text-sky-600 dark:text-sky-400 font-normal text-sm md:text-[15px] leading-relaxed ml-1 hidden sm:inline">(Hindi/Hinglish)</span></h2>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-5">
                          <div className="flex flex-col gap-1">
                            <label className="text-sm md:text-[15px] leading-relaxed md:text-sm uppercase font-bold text-slate-600 dark:text-slate-300">Director Style</label>
                            <select
                              value={directorStyle}
                              onChange={(e) => setDirectorStyle(e.target.value)}
                              className="bg-white dark:bg-[#1C1C22] border border-slate-200/80 dark:border-[#3F3F46] text-slate-700 dark:text-slate-300 text-sm md:text-[15px] leading-relaxed font-semibold rounded-lg px-3 py-2 w-full focus:outline-none focus:ring-2 focus:ring-sky-500"
                            >
                              <option value="Christopher Nolan">Christopher Nolan</option>
                              <option value="Pixar">Pixar</option>
                              <option value="Studio Ghibli">Studio Ghibli</option>
                              <option value="Documentary">Documentary</option>
                              <option value="MrBeast">MrBeast</option>
                              <option value="Educational">Educational</option>
                              <option value="Startup Ad">Startup Ad</option>
                            </select>
                          </div>
                          <div className="flex flex-col gap-1">
                            <label className="text-sm md:text-[15px] leading-relaxed md:text-sm uppercase font-bold text-slate-600 dark:text-slate-300">Audience</label>
                            <select
                              value={audience}
                              onChange={(e) => setAudience(e.target.value)}
                              className="bg-white dark:bg-[#1C1C22] border border-slate-200/80 dark:border-[#3F3F46] text-slate-700 dark:text-slate-300 text-sm md:text-[15px] leading-relaxed font-semibold rounded-lg px-3 py-2 w-full focus:outline-none focus:ring-2 focus:ring-sky-500"
                            >
                              <option value="YouTube">YouTube</option>
                              <option value="Instagram Reel">Instagram Reel</option>
                              <option value="Educational Video">Educational Video</option>
                              <option value="Marketing Ad">Marketing Ad</option>
                              <option value="Kids Content">Kids Content</option>
                            </select>
                          </div>
                          <div className="flex flex-col gap-1">
                            <label className="text-sm md:text-[15px] leading-relaxed md:text-sm uppercase font-bold text-slate-600 dark:text-slate-300">Platform</label>
                            <select
                              value={targetPlatform}
                              onChange={(e) => setTargetPlatform(e.target.value)}
                              className="bg-white dark:bg-[#1C1C22] border border-slate-200/80 dark:border-[#3F3F46] text-slate-700 dark:text-slate-300 text-sm md:text-[15px] leading-relaxed font-semibold rounded-lg px-3 py-2 w-full focus:outline-none focus:ring-2 focus:ring-sky-500"
                            >
                              <option value="Google Veo">Google Veo</option>
                              <option value="Google Flow">Google Flow</option>
                              <option value="Runway Gen-3">Runway Gen-3</option>
                              <option value="Pika Labs">Pika Labs</option>
                              <option value="Sora">Sora</option>
                            </select>
                          </div>
                          <div className="flex flex-col gap-1">
                            <label className="text-sm md:text-[15px] leading-relaxed md:text-sm uppercase font-bold text-slate-600 dark:text-slate-300">Prompt Language</label>
                            <select
                              value={promptLanguage}
                              onChange={(e) => setPromptLanguage(e.target.value)}
                              className="bg-white dark:bg-[#1C1C22] border border-slate-200/80 dark:border-[#3F3F46] text-slate-700 dark:text-slate-300 text-sm md:text-[15px] leading-relaxed font-semibold rounded-lg px-3 py-2 w-full focus:outline-none focus:ring-2 focus:ring-sky-500"
                            >
                              <option value="English">English</option>
                              <option value="Hindi">Hindi</option>
                              <option value="Hinglish">Hinglish</option>
                            </select>
                          </div>
                        </div>
                    </div>
                    <div className="p-6 md:p-8 flex-1 flex flex-col">
                      <textarea
                        value={script}
                        onChange={(e) => setScript(e.target.value)}
                        placeholder="Paste your script here...&#10;&#10;Example:&#10;Rohan ek chhote se sheher ka ladka hai.&#10;Uska sapna hai ek successful YouTuber banna..."
                        className="w-full flex-1 bg-transparent text-slate-900 dark:text-slate-200 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none resize-none hide-scrollbar text-[15px] leading-relaxed min-h-[300px]"
                        spellCheck={false}
                      />
                      <div className="mt-4 pt-4 border-t border-slate-200/80 dark:border-[#3F3F46]/50 space-y-6">
                        <div className="flex justify-between items-center">
                          <span className="text-sm md:text-[15px] leading-relaxed md:text-sm font-mono text-slate-600 dark:text-slate-300 font-medium">
                            {script.length} / 10000
                          </span>
                          {error && <span className="text-sm md:text-[15px] leading-relaxed text-red-500 dark:text-red-400 font-medium truncate max-w-[200px]">⚠️ {error}</span>}
                        </div>
                        <button
                          onClick={handleGenerate}
                          disabled={loading || !script.trim()}
                          className="w-full bg-gradient-to-r from-sky-600 to-blue-600 hover:from-sky-500 hover:to-blue-500 disabled:opacity-75 text-white font-bold py-3.5 rounded-xl transition-all flex items-center justify-center gap-4 md:gap-5 md:gap-4 cursor-pointer disabled:cursor-not-allowed shadow-[0_8px_30px_rgba(99,102,241,0.2)]"
                        >
                          {loading ? (
                            <>
                              <Loader2 className="w-5 h-5 animate-spin text-white/80" />
                              <span>Architecting Scenes...</span>
                            </>
                          ) : (
                            <>
                              <Wand2 className="w-5 h-5 text-sky-200" />
                              <span>Generate Scene Prompts</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Generated Output */}
                {scenes.length > 0 && (
                  <div className="bg-white dark:bg-[#18181B] border border-slate-200/80 dark:border-[#3F3F46] rounded-2xl flex flex-col overflow-hidden shadow-sm dark:shadow-xl dark:shadow-black/40 animate-in fade-in slide-in-from-bottom-4 duration-700 transition-colors">
                    <div className="px-6 md:px-8 py-5 md:py-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-50 dark:bg-[#18181B] border-b border-slate-200/80 dark:border-[#3F3F46]">
                      <div className="flex items-center gap-4 md:gap-5">
                        <div className="w-6 h-6 rounded-full bg-sky-600 flex items-center justify-center text-sm md:text-[15px] leading-relaxed md:text-sm font-bold text-white shadow-[0_0_10px_rgba(124,58,237,0.4)] shrink-0">2</div>
                        <h2 className="font-semibold text-slate-900 dark:text-white">Generated Scene Prompts <span className="text-slate-600 dark:text-slate-300 text-sm font-normal ml-1">({scenes.length} Scenes)</span></h2>
                      </div>
                      <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                        <button onClick={() => {
                          const all = scenes.map((s, i) => `Scene ${i + 1}\nContext: ${s.sceneBreakdown}\nPrompt:\n${s.prompt}`).join('\n\n');
                          const blob = new Blob([all], { type: 'text/plain' });
                          const url = URL.createObjectURL(blob);
                          const a = document.createElement('a');
                          a.href = url;
                          a.download = `scene-prompts-export.txt`;
                          a.click();
                          URL.revokeObjectURL(url);
                        }} className="flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-[#27272A] dark:hover:bg-[#27272A] text-slate-700 dark:text-slate-300 border border-slate-200/80 dark:border-transparent text-xs sm:text-sm font-bold px-2.5 sm:px-3.5 py-1.5 rounded-lg transition-colors cursor-pointer">
                          <Download className="w-3.5 h-3.5 text-sky-500" /> <span>EXPRT .TXT</span>
                        </button>
                        <button onClick={() => {
                          const dataStr = JSON.stringify({ script, audience, targetPlatform, promptLanguage, directorStyle, narrativeArc, extractedCharacter, scenes }, null, 2);
                          const blob = new Blob([dataStr], { type: 'application/json' });
                          const url = URL.createObjectURL(blob);
                          const a = document.createElement('a');
                          a.href = url;
                          a.download = `scene-prompts-export.json`;
                          a.click();
                          URL.revokeObjectURL(url);
                        }} className="flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-[#27272A] dark:hover:bg-[#27272A] text-slate-700 dark:text-slate-300 border border-slate-200/80 dark:border-transparent text-xs sm:text-sm font-bold px-2.5 sm:px-3.5 py-1.5 rounded-lg transition-colors cursor-pointer">
                          <Download className="w-3.5 h-3.5 text-sky-500" /> <span>EXPRT .JSON</span>
                        </button>
                        <button onClick={handleCopyAll} className="flex items-center gap-1.5 bg-sky-600 hover:bg-sky-500 text-white text-xs sm:text-sm font-bold px-3 py-1.5 rounded-lg transition-colors cursor-pointer">
                          {allCopied ? <><CheckCircle2 className="w-3.5 h-3.5 text-white"/> <span>COPIED ALL!</span></> : <><Files className="w-3.5 h-3.5 text-white"/> <span>COPY ALL</span></>}
                        </button>
                      </div>
                    </div>
                    
                    <div className="p-6 md:p-8 lg:p-6 space-y-8 md:space-y-10">
                      
                      {/* Multi-Agent Pipeline Visualization */}
                      <div className="flex flex-wrap items-center justify-center gap-4 md:gap-5 md:gap-4 md:gap-6 py-2 opacity-80 mb-2 border-b border-slate-100 dark:border-[#3F3F46]/50 pb-6">
                        <div className="flex flex-col items-center gap-1 font-mono">
                          <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-[#27272A] flex items-center justify-center"><FileText className="w-4 h-4 text-slate-600 dark:text-slate-300" /></div>
                          <span className="text-sm md:text-[15px] leading-relaxed md:text-sm md:text-[15px] leading-relaxed uppercase tracking-wider text-slate-600 dark:text-slate-300">Analyst</span>
                        </div>
                        <div className="w-4 md:w-8 h-[1px] bg-slate-300 dark:bg-[#27272A]" />
                        <div className="flex flex-col items-center gap-1 font-mono">
                          <div className="w-8 h-8 rounded-full bg-sky-50 dark:bg-sky-900/20 flex items-center justify-center"><UserCircle2 className="w-4 h-4 text-sky-500" /></div>
                          <span className="text-sm md:text-[15px] leading-relaxed md:text-sm md:text-[15px] leading-relaxed uppercase tracking-wider text-sky-600 dark:text-sky-400">Character</span>
                        </div>
                        <div className="w-4 md:w-8 h-[1px] bg-sky-200 dark:bg-sky-900/40" />
                        <div className="flex flex-col items-center gap-1 font-mono">
                          <div className="w-8 h-8 rounded-full bg-indigo-50 dark:bg-indigo-900/20 flex items-center justify-center"><Activity className="w-4 h-4 text-indigo-500" /></div>
                          <span className="text-sm md:text-[15px] leading-relaxed md:text-sm md:text-[15px] leading-relaxed uppercase tracking-wider text-indigo-600 dark:text-indigo-400">Emotion</span>
                        </div>
                        <div className="w-4 md:w-8 h-[1px] bg-indigo-200 dark:bg-indigo-900/40" />
                        <div className="flex flex-col items-center gap-1 font-mono">
                          <div className="w-8 h-8 rounded-full bg-amber-50 dark:bg-amber-900/20 flex items-center justify-center"><Video className="w-4 h-4 text-amber-500" /></div>
                          <span className="text-sm md:text-[15px] leading-relaxed md:text-sm md:text-[15px] leading-relaxed uppercase tracking-wider text-amber-600 dark:text-amber-400">Director</span>
                        </div>
                        <div className="w-4 md:w-8 h-[1px] bg-amber-200 dark:bg-amber-900/40" />
                        <div className="flex flex-col items-center gap-1 font-mono">
                          <div className="w-8 h-8 rounded-full bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-center"><PenTool className="w-4 h-4 text-emerald-500" /></div>
                          <span className="text-sm md:text-[15px] leading-relaxed md:text-sm md:text-[15px] leading-relaxed uppercase tracking-wider text-emerald-600 dark:text-emerald-400">Prompter</span>
                        </div>
                        <div className="w-4 md:w-8 h-[1px] bg-emerald-200 dark:bg-emerald-900/40" />
                        <div className="flex flex-col items-center gap-1 font-mono">
                          <div className="w-8 h-8 rounded-full bg-violet-50 dark:bg-violet-900/20 flex items-center justify-center"><CheckCircle2 className="w-4 h-4 text-violet-500" /></div>
                          <span className="text-sm md:text-[15px] leading-relaxed md:text-sm md:text-[15px] leading-relaxed uppercase tracking-wider text-violet-600 dark:text-violet-400">Quality</span>
                        </div>
                      </div>

                      {currentScenes.map((scene, i) => {
                        const idx = indexOfFirstScene + i;
                        return (
                        <div key={idx} className="bg-white dark:bg-[#18181B] border border-slate-200/80 dark:border-[#3F3F46] rounded-xl overflow-hidden flex flex-col transition-all hover:border-sky-500/30 dark:hover:border-sky-500/30 group">
                          <div className="px-6 md:px-8 py-5 md:py-6 flex flex-col sm:flex-row sm:items-center justify-between gap-6 border-b border-slate-200/80 dark:border-[#3F3F46]/50 bg-slate-50/50 dark:bg-[#1C1C22]">
                            <div className="flex xl:items-center xl:flex-row flex-col gap-4 md:gap-5 md:gap-4 xl:gap-6 overflow-hidden">
                              <span className="shrink-0 text-sm md:text-[15px] leading-relaxed md:text-sm uppercase tracking-wider font-bold text-slate-600 dark:text-slate-200 group-hover:text-sky-600 dark:group-hover:text-sky-400 transition-colors">
                                Scene {idx + 1}
                              </span>
                              <div className="w-[4px] h-[4px] rounded-full bg-slate-300 dark:bg-slate-600 xl:block hidden"></div>
                              <p className="text-sm font-medium text-slate-700 dark:text-slate-200">
                                {scene.sceneBreakdown}
                              </p>
                            </div>
                                                     <button
                              onClick={() => handleCopy(getSceneBundleText(scene, idx), `${idx}-bundle`)}
                              className="shrink-0 inline-flex items-center justify-center gap-2 px-3 py-1.5 bg-sky-50 hover:bg-sky-100 dark:bg-[#1D1E2C] dark:hover:bg-sky-950/40 rounded-lg text-xs font-bold uppercase tracking-wider text-sky-700 dark:text-sky-400 border border-sky-100 dark:border-sky-900/30 transition-all cursor-pointer shadow-sm"
                            >
                              {copiedIndex === `${idx}-bundle` ? (
                                <><CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 dark:text-emerald-400"/> Bundle Copied!</>
                              ) : (
                                <><Copy className="w-3.5 h-3.5" /> Copy Scene Report</>
                              )}
                            </button>
                          </div>
                          
                          <div className="bg-slate-50 dark:bg-[#1A1A1E] px-6 md:px-8 py-3 border-b border-slate-100 dark:border-[#3F3F46]/50 grid grid-cols-1 md:grid-cols-3 gap-6">
                             <div className="flex flex-col gap-1">
                               <span className="text-sm md:text-[15px] leading-relaxed md:text-sm uppercase font-bold text-slate-600 dark:text-slate-300">Emotion</span>
                               <span className="text-sm md:text-[15px] leading-relaxed font-semibold text-slate-700 dark:text-slate-300">{scene.emotion || "Neutral"}</span>
                             </div>
                             <div className="flex flex-col gap-1">
                               <span className="text-sm md:text-[15px] leading-relaxed md:text-sm uppercase font-bold text-slate-600 dark:text-slate-300">Camera</span>
                               <span className="text-sm md:text-[15px] leading-relaxed font-semibold text-slate-700 dark:text-slate-300">{scene.camera || "Static View"}</span>
                             </div>
                             <div className="flex flex-col gap-1">
                               <span className="text-sm md:text-[15px] leading-relaxed md:text-sm uppercase font-bold text-slate-600 dark:text-slate-300">Lighting</span>
                               <span className="text-sm md:text-[15px] leading-relaxed font-semibold text-slate-700 dark:text-slate-300">{scene.lighting || "Soft lighting"}</span>
                             </div>
                          </div>

                          <div className="p-6 md:p-8 bg-white dark:bg-[#18181B] flex flex-col gap-6">
                             {scene.directorNotes && (
                               <div className="bg-indigo-50/50 dark:bg-indigo-900/10 p-6 rounded-xl border border-indigo-100 dark:border-indigo-500/20 mb-2">
                                  <h4 className="text-sm md:text-[15px] leading-relaxed md:text-sm uppercase tracking-wider font-bold text-indigo-600 dark:text-indigo-400 mb-3 flex items-center gap-4 md:gap-5 md:gap-4"><PenTool className="w-4 h-4"/> Director's Notes</h4>
                                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                     <div>
                                        <span className="block text-sm md:text-[15px] leading-relaxed md:text-sm uppercase font-bold text-indigo-400 dark:text-indigo-500 mb-1">Emotion: {scene.emotion}</span>
                                        <span className="text-sm md:text-[15px] leading-relaxed text-indigo-900 dark:text-indigo-300 font-medium leading-relaxed">{scene.directorNotes.emotionReason}</span>
                                     </div>
                                     <div>
                                        <span className="block text-sm md:text-[15px] leading-relaxed md:text-sm uppercase font-bold text-indigo-400 dark:text-indigo-500 mb-1">Camera: {scene.camera}</span>
                                        <span className="text-sm md:text-[15px] leading-relaxed text-indigo-900 dark:text-indigo-300 font-medium leading-relaxed">{scene.directorNotes.cameraReason}</span>
                                     </div>
                                     <div>
                                        <span className="block text-sm md:text-[15px] leading-relaxed md:text-sm uppercase font-bold text-indigo-400 dark:text-indigo-500 mb-1">Lighting: {scene.lighting}</span>
                                        <span className="text-sm md:text-[15px] leading-relaxed text-indigo-900 dark:text-indigo-300 font-medium leading-relaxed">{scene.directorNotes.lightingReason}</span>
                                     </div>
                                  </div>
                               </div>
                             )}
                            {scene.storyboard && (
                              <div className="grid grid-cols-1 xl:grid-cols-[160px_1fr] gap-4 md:gap-5 pb-5 border-b border-dashed border-slate-200 dark:border-[#3F3F46]/40">
                                <div className="flex flex-col gap-2">
                                  <span className="text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 flex items-center gap-1.5 pt-1">
                                    <Image className="w-3.5 h-3.5 text-indigo-500" /> Storyboard Concept
                                  </span>
                                  <button
                                    onClick={() => handleCopy(scene.storyboard, `${idx}-storyboard`)}
                                    className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/40 dark:hover:bg-indigo-900/40 text-indigo-700 dark:text-indigo-400 text-xs font-bold uppercase rounded border border-indigo-100 dark:border-indigo-900/30 transition-all cursor-pointer shadow-sm"
                                  >
                                    {copiedIndex === `${idx}-storyboard` ? (
                                      <>
                                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                                        <span>Copied!</span>
                                      </>
                                    ) : (
                                      <>
                                        <Copy className="w-3.5 h-3.5" />
                                        <span>Copy Visual IP</span>
                                      </>
                                    )}
                                  </button>
                                  <p className="text-[10px] leading-relaxed text-slate-500 dark:text-slate-400">
                                    Use with Imagen, DALL-E, or Midjourney to generate sketch concepts.
                                  </p>
                                </div>
                                <div className="text-sm md:text-[15px] leading-relaxed text-slate-600 dark:text-slate-300 italic bg-indigo-50/10 dark:bg-[#12131A] p-5 rounded-lg border border-indigo-100/50 dark:border-indigo-900/20 whitespace-pre-wrap">
                                  {scene.storyboard}
                                </div>
                              </div>
                            )}
                            {/* Extended Prompt Deck with Dedicated Copy Selectors */}
                            <div className="grid grid-cols-1 xl:grid-cols-[160px_1fr] gap-4 md:gap-5 pb-5 border-b border-dashed border-slate-200 dark:border-[#3F3F46]/40">
                              <div className="flex flex-col gap-2">
                                <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5 pt-1">
                                  <Wand2 className="w-3.5 h-3.5 text-sky-500" /> Technical Prompt
                                </span>
                                <button
                                  onClick={() => handleCopy(scene.prompt, `${idx}-struct`)}
                                  className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-1.5 bg-slate-50 hover:bg-slate-100 dark:bg-[#202025] dark:hover:bg-[#282830] text-slate-700 dark:text-slate-300 text-xs font-bold uppercase rounded border border-slate-200 dark:border-[#3F3F46] transition-all cursor-pointer shadow-sm"
                                >
                                  {copiedIndex === `${idx}-struct` ? (
                                    <>
                                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                                      <span>Copied!</span>
                                    </>
                                  ) : (
                                    <>
                                      <Copy className="w-3.5 h-3.5" />
                                      <span>Copy Tech</span>
                                    </>
                                  )}
                                </button>
                                <p className="text-[10px] leading-relaxed text-slate-500 dark:text-slate-400">
                                  Best for: legacy systems, manual seeds, Midjourney, and exact camera parameters.
                                </p>
                              </div>
                              <div className="text-sm md:text-[15px] leading-relaxed text-slate-600 dark:text-slate-300 dark:text-indigo-100/60 leading-relaxed font-mono bg-slate-50 dark:bg-[#10111A] p-5 rounded-lg border border-slate-200/80/60 dark:border-[#3F3F46]/40 whitespace-pre-wrap selection:bg-sky-500/20 dark:selection:bg-sky-500/30">
                                {scene.prompt}
                              </div>
                            </div>
                            
                            {scene.veoExportPrompt && (
                              <div className="grid grid-cols-1 xl:grid-cols-[160px_1fr] gap-4 md:gap-5 pt-3">
                                <div className="flex flex-col gap-2">
                                  <span className="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-500 flex items-center gap-1.5 pt-1">
                                    <Sparkles className="w-3.5 h-3.5 text-emerald-500" /> Cinematic Prompt
                                  </span>
                                  <button
                                    onClick={() => handleCopy(scene.veoExportPrompt, `${idx}-veo`)}
                                    className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold uppercase rounded transition-all cursor-pointer shadow-sm shadow-emerald-950/20"
                                  >
                                    {copiedIndex === `${idx}-veo` ? (
                                      <>
                                        <CheckCircle2 className="w-3.5 h-3.5" />
                                        <span>Copied!</span>
                                      </>
                                    ) : (
                                      <>
                                        <Copy className="w-3.5 h-3.5" />
                                        <span>Copy Video</span>
                                      </>
                                    )}
                                  </button>
                                  <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-md p-2">
                                    <p className="text-[9.5px] leading-snug text-emerald-700 dark:text-emerald-400 font-medium">
                                      ★ REQUIRED FOR PREMIUM VIDEO GENERATORS: Use this version for Google Veo, Sora, Luma Dream Machine, Kling, and Runway Gen-3.
                                    </p>
                                  </div>
                                </div>
                                <div className="text-sm md:text-[15px] leading-relaxed font-medium text-slate-800 dark:text-emerald-100 leading-relaxed bg-emerald-50/50 dark:bg-[#101A15] p-5 rounded-lg border border-emerald-100/60 dark:border-emerald-900/40 whitespace-pre-wrap selection:bg-emerald-500/20 dark:selection:bg-emerald-500/30 shadow-inner">
                                  {scene.veoExportPrompt}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      )})}

                      {totalPages > 1 && (
                        <div className="flex items-center justify-between bg-white dark:bg-[#18181B] border border-slate-200/80 dark:border-[#3F3F46] rounded-xl px-6 md:px-8 py-5 md:py-6 mt-2">
                           <span className="text-sm text-slate-600 dark:text-slate-200">
                             Showing {indexOfFirstScene + 1} to {Math.min(indexOfLastScene, scenes.length)} of {scenes.length}
                           </span>
                           <div className="flex gap-4 md:gap-5 md:gap-4">
                             <button 
                               onClick={() => setCurrentScenePage(p => Math.max(1, p - 1))}
                               disabled={currentScenePage === 1}
                               className="px-6 md:px-8 py-2 rounded-lg bg-slate-50 dark:bg-[#27272A] text-slate-700 dark:text-slate-300 text-sm font-semibold hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                             >
                               Previous
                             </button>
                             <button 
                               onClick={() => setCurrentScenePage(p => Math.min(totalPages, p + 1))}
                               disabled={currentScenePage === totalPages}
                               className="px-6 md:px-8 py-2 rounded-lg bg-slate-50 dark:bg-[#27272A] text-slate-700 dark:text-slate-300 text-sm font-semibold hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                             >
                               Next
                             </button>
                           </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Right Sidebar Area (Stats) */}
              <div className="flex flex-col gap-6">
                {/* Flow Overview */}
                <div className="bg-white dark:bg-[#18181B] border border-slate-200/80 dark:border-[#3F3F46] rounded-2xl p-6 shadow-sm dark:shadow-xl dark:shadow-black/60 transition-colors">
                  <h3 className="text-sm md:text-[15px] leading-relaxed uppercase tracking-widest font-bold text-slate-600 dark:text-slate-200 mb-5 flex items-center gap-4 md:gap-5 md:gap-4"><LayoutDashboard className="w-4 h-4"/> Flow Overview</h3>
                  <div className="space-y-6">
                    {qualityScore && (
                      <div className="flex justify-between items-center text-sm border-b border-slate-100 dark:border-[#3F3F46]/50 pb-3">
                        <span className="text-slate-600 dark:text-slate-200 flex items-center gap-4 md:gap-5 md:gap-4"><Check className="w-4 h-4"/> Quality Score</span>
                        <span className="font-bold text-emerald-600 dark:text-emerald-400 text-[15px]">{qualityScore.score}/100</span>
                      </div>
                    )}
                    {extractedCharacter && extractedCharacter.consistencyScore && (
                      <div className="flex justify-between items-center text-sm border-b border-slate-100 dark:border-[#3F3F46]/50 pb-3">
                        <span className="text-slate-600 dark:text-slate-200 flex items-center gap-4 md:gap-5 md:gap-4"><UserCircle2 className="w-4 h-4"/> Consistency Score</span>
                        <span className="font-bold text-sky-600 dark:text-sky-400 text-[15px]">{extractedCharacter.consistencyScore}/100</span>
                      </div>
                    )}
                    {viralOptimizer && (
                      <div className="flex justify-between items-center text-sm border-b border-slate-100 dark:border-[#3F3F46]/50 pb-3">
                        <span className="text-slate-600 dark:text-slate-200 flex items-center gap-4 md:gap-5 md:gap-4"><Sparkles className="w-4 h-4"/> Viral Hook</span>
                        <span className="font-bold text-violet-600 dark:text-violet-400 text-sm">{viralOptimizer.hookStrength}</span>
                      </div>
                    )}
                    <div className="flex justify-between items-center text-sm border-b border-slate-100 dark:border-[#3F3F46]/50 pb-3">
                      <span className="text-slate-600 dark:text-slate-200 flex items-center gap-4 md:gap-5 md:gap-4"><LayoutList className="w-4 h-4"/> Scenes Generated</span>
                      <span className="font-bold text-slate-900 dark:text-white text-sm">{scenes.length || "0"}</span>
                    </div>
                    <div className="flex justify-between items-center text-sm border-b border-slate-100 dark:border-[#3F3F46]/50 pb-3">
                      <span className="text-slate-600 dark:text-slate-200 flex items-center gap-4 md:gap-5 md:gap-4"><Users className="w-4 h-4"/> Characters Found</span>
                      <span className="font-bold text-slate-900 dark:text-white text-sm">{scenes.length ? (settings.dynamicCharacter ? "Auto" : "1") : "0"}</span>
                    </div>
                    <div className="flex justify-between items-center text-sm pb-1">
                      <span className="text-slate-600 dark:text-slate-200 flex items-center gap-4 md:gap-5 md:gap-4"><Video className="w-4 h-4"/> Est. Video Length</span>
                      <span className="font-bold text-slate-900 dark:text-white text-sm">{scenes.length ? `~${scenes.length * 5}s` : "0s"}</span>
                    </div>
                  </div>
                </div>

                {narrativeArc && (
                  <div className="bg-indigo-50/50 dark:bg-[#18181B] border border-indigo-100 dark:border-[#3F3F46] rounded-2xl p-6 shadow-sm transition-colors">
                    <h3 className="text-sm md:text-[15px] leading-relaxed uppercase tracking-widest font-bold text-indigo-600 dark:text-indigo-400 mb-4 flex items-center gap-4 md:gap-5 md:gap-4"><BrainCircuit className="w-4 h-4"/> AI Director Insights</h3>
                    <div className="space-y-6">
                       <div>
                         <span className="block text-sm md:text-[15px] leading-relaxed md:text-sm uppercase font-bold text-slate-600 dark:text-slate-300 mb-1">Narrative Arc</span>
                         <span className="block text-sm font-bold text-slate-800 dark:text-slate-200">{narrativeArc.arcType}</span>
                       </div>
                       
                       <div>
                         <span className="block text-sm md:text-[15px] leading-relaxed md:text-sm uppercase font-bold text-slate-600 dark:text-slate-300 mb-2">Story Emotion Curve</span>
                         <div className="flex flex-wrap gap-1.5">
                           {narrativeArc.emotionCurve.map((em, i) => (
                             <React.Fragment key={i}>
                               <span className="text-sm md:text-[15px] leading-relaxed font-semibold bg-white dark:bg-[#18181B] px-2 py-1 rounded text-slate-700 dark:text-slate-300 border border-slate-200/80 dark:border-[#3F3F46] shadow-sm">{em}</span>
                               {i < narrativeArc.emotionCurve.length - 1 && <span className="text-slate-600 dark:text-slate-300 dark:text-slate-600 dark:text-slate-300 text-sm md:text-[15px] leading-relaxed md:text-sm self-center">➔</span>}
                             </React.Fragment>
                           ))}
                         </div>
                       </div>

                       <div className="flex justify-between items-center pt-2 border-t border-indigo-100 dark:border-[#3F3F46]/50">
                         <span className="text-sm md:text-[15px] leading-relaxed font-bold text-slate-600 dark:text-slate-200">Narrative Strength</span>
                         <span className="text-sm font-black text-indigo-600 dark:text-indigo-400">{narrativeArc.narrativeStrength}%</span>
                       </div>
                    </div>
                  </div>
                )}

                {stressTest && stressTest.length > 0 && (
                  <div className="bg-orange-50/50 dark:bg-orange-900/10 border border-orange-200 dark:border-orange-500/20 rounded-2xl p-6 shadow-sm transition-colors">
                    <h3 className="text-sm md:text-[15px] leading-relaxed uppercase tracking-widest font-bold text-orange-600 dark:text-orange-500 mb-4 flex items-center gap-4 md:gap-5 md:gap-4"><AlertTriangle className="w-4 h-4"/> Prompt Stress Test</h3>
                    <div className="space-y-6">
                      {stressTest.map((test, i) => (
                        <div key={i} className="bg-white dark:bg-[#18181B] p-3 rounded-xl border border-orange-100 dark:border-orange-500/20">
                          <span className="text-sm md:text-[15px] leading-relaxed md:text-sm font-black uppercase text-orange-600 dark:text-orange-500 mb-1 block">Scene {test.sceneNumber} Risk</span>
                          <p className="text-sm md:text-[15px] leading-relaxed font-medium text-slate-800 dark:text-slate-200 mb-2">{test.potentialIssue}</p>
                          <div className="flex items-start gap-4 md:gap-5 md:gap-4 bg-emerald-50 dark:bg-emerald-900/20 p-2 rounded relative">
                            <CheckCircle className="w-4 h-4 text-emerald-600 dark:text-emerald-500 mt-0.5 shrink-0" />
                            <p className="text-sm md:text-[15px] leading-relaxed md:text-sm text-emerald-700 dark:text-emerald-400 leading-snug">
                              <strong className="block text-sm md:text-[15px] leading-relaxed md:text-sm md:text-[15px] leading-relaxed uppercase tracking-wider mb-0.5 opacity-80">Auto-Fixed</strong>
                              {test.autoFix}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {qualityScore && qualityScore.issues.length > 0 && (
                  <div className="bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 rounded-2xl p-6 shadow-sm transition-colors">
                    <h3 className="text-sm md:text-[15px] leading-relaxed uppercase tracking-widest font-bold text-red-600 dark:text-red-400 mb-3">Prompt Issues Detected</h3>
                    <ul className="list-disc pl-5 space-y-2 text-sm text-red-800 dark:text-red-300">
                      {qualityScore.issues.map((issue, idx) => (
                        <li key={idx} className="font-medium">{issue}</li>
                      ))}
                    </ul>
                  </div>
                )}
                
                {viralOptimizer && (
                  <div className="bg-sky-50 dark:bg-sky-900/10 border border-sky-200 dark:border-sky-500/20 rounded-2xl p-6 shadow-sm transition-colors">
                     <h3 className="text-sm md:text-[15px] leading-relaxed uppercase tracking-widest font-bold text-sky-600 dark:text-sky-400 mb-4">Viral Optimizer</h3>
                     <div className="space-y-6">
                        <div className="grid grid-cols-2 gap-6">
                           <div className="bg-white dark:bg-[#1A1A1E] p-3 rounded-xl border border-sky-100 dark:border-sky-500/10">
                              <span className="block text-sm md:text-[15px] leading-relaxed md:text-sm uppercase font-bold text-slate-600 dark:text-slate-300">Retention Risk</span>
                              <span className="block text-sm font-bold text-slate-800 dark:text-slate-200 mt-1">{viralOptimizer.retentionPotential}</span>
                           </div>
                           <div className="bg-white dark:bg-[#1A1A1E] p-3 rounded-xl border border-sky-100 dark:border-sky-500/10">
                              <span className="block text-sm md:text-[15px] leading-relaxed md:text-sm uppercase font-bold text-slate-600 dark:text-slate-300">Visual Variety</span>
                              <span className="block text-sm font-bold text-slate-800 dark:text-slate-200 mt-1">{viralOptimizer.visualVariety}</span>
                           </div>
                        </div>
                        {viralOptimizer.suggestions && viralOptimizer.suggestions.length > 0 && (
                          <div className="pt-2">
                             <h4 className="text-sm md:text-[15px] leading-relaxed md:text-sm font-bold uppercase text-slate-600 dark:text-slate-300 mb-2">Suggestions</h4>
                             <ul className="list-disc pl-4 space-y-1 text-sm md:text-[15px] leading-relaxed text-slate-600 dark:text-slate-300">
                               {viralOptimizer.suggestions.map((sug, i) => (
                                 <li key={i}>{sug}</li>
                               ))}
                             </ul>
                          </div>
                        )}
                     </div>
                  </div>
                )}

                {/* Main Character Profile */}
                <div className="bg-white dark:bg-[#18181B] border border-slate-200/80 dark:border-[#3F3F46] rounded-2xl p-6 shadow-sm dark:shadow-xl dark:shadow-black/40 transition-colors">
                  <div className="flex justify-between items-center mb-5">
                    <h3 className="text-sm md:text-[15px] leading-relaxed uppercase tracking-widest font-bold text-slate-600 dark:text-slate-200">Main Character</h3>
                    {extractedCharacter ? <span className="text-sm md:text-[15px] leading-relaxed md:text-sm md:text-[15px] leading-relaxed uppercase tracking-wider font-bold bg-emerald-100 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400 px-2 py-1 rounded">Extract</span> : scenes.length > 0 && <span className="text-sm md:text-[15px] leading-relaxed md:text-sm md:text-[15px] leading-relaxed uppercase tracking-wider font-bold bg-emerald-100 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400 px-2 py-1 rounded">Locked</span>}
                  </div>
                  <div className="flex gap-6 items-start">
                    <div className="w-20 h-24 bg-slate-50 dark:bg-gradient-to-b dark:from-[#1E2030] dark:to-[#121214] border border-slate-200/80 dark:border-[#3F3F46] rounded-xl flex items-center justify-center shrink-0 shadow-inner">
                      {extractedCharacter ? <Sparkles className="w-8 h-8 text-sky-400" /> : settings.dynamicCharacter ? <Sparkles className="w-8 h-8 text-sky-400" /> : <UserCircle2 className="w-10 h-10 text-slate-600 dark:text-slate-300 dark:text-slate-600 dark:text-slate-300" />}
                    </div>
                    <div className="space-y-2.5 text-sm md:text-[15px] leading-relaxed flex-1">
                      {extractedCharacter ? (
                        <>
                          <div className="flex flex-col gap-0.5">
                            <span className="text-sm md:text-[15px] leading-relaxed md:text-sm uppercase font-bold text-slate-600 dark:text-slate-300">Character ID</span>
                            <span className="text-slate-800 dark:text-slate-200 font-medium text-sm">{extractedCharacter.id}</span>
                          </div>
                          <div className="grid grid-cols-2 gap-4 md:gap-5 md:gap-4">
                            <div className="flex flex-col gap-0.5">
                              <span className="text-sm md:text-[15px] leading-relaxed md:text-sm uppercase font-bold text-slate-600 dark:text-slate-300">Age</span>
                              <span className="text-slate-600 dark:text-slate-300">{extractedCharacter.age}</span>
                            </div>
                            <div className="flex flex-col gap-0.5">
                              <span className="text-sm md:text-[15px] leading-relaxed md:text-sm uppercase font-bold text-slate-600 dark:text-slate-300">Skin Tone</span>
                              <span className="text-slate-600 dark:text-slate-300">{extractedCharacter.skinTone}</span>
                            </div>
                          </div>
                          <div className="flex flex-col gap-0.5">
                            <span className="text-sm md:text-[15px] leading-relaxed md:text-sm uppercase font-bold text-slate-600 dark:text-slate-300">Hair & Style</span>
                            <span className="text-slate-600 dark:text-slate-300 truncate" title={extractedCharacter.hair}>{extractedCharacter.hair}</span>
                          </div>
                          <div className="flex flex-col gap-0.5">
                            <span className="text-sm md:text-[15px] leading-relaxed md:text-sm uppercase font-bold text-slate-600 dark:text-slate-300">Outfit & Acc.</span>
                            <span className="text-slate-600 dark:text-slate-300">{extractedCharacter.outfit} • {extractedCharacter.accessories}</span>
                          </div>
                          {extractedCharacter.matchedTraits && extractedCharacter.matchedTraits.length > 0 && (
                             <div className="mt-2 pt-3 border-t border-slate-100 dark:border-[#3F3F46]/50">
                               <span className="text-sm md:text-[15px] leading-relaxed md:text-sm uppercase font-bold text-emerald-600 dark:text-emerald-500 block mb-2">DNA Matching Confirmed</span>
                               <div className="flex flex-wrap gap-1">
                                 {extractedCharacter.matchedTraits.map((t, i) => (
                                   <span key={i} className="text-sm md:text-[15px] leading-relaxed md:text-sm md:text-[15px] leading-relaxed font-bold px-1.5 py-0.5 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 rounded-sm inline-block">{t}</span>
                                 ))}
                               </div>
                             </div>
                          )}
                        </>
                      ) : settings.dynamicCharacter ? (
                         <div className="flex flex-col gap-4 md:gap-5 md:gap-4 h-full justify-center mt-2">
                           <span className="text-slate-600 dark:text-slate-200 font-medium italic leading-relaxed">Dynamic character enabled. AI will analyze script and define the best fit appearance.</span>
                         </div>
                      ) : (
                        <>
                          <div className="flex flex-col gap-0.5">
                            <span className="text-sm md:text-[15px] leading-relaxed md:text-sm uppercase font-bold text-slate-600 dark:text-slate-300">Subject</span>
                            <span className="text-slate-800 dark:text-slate-200 font-medium text-sm">Indian Male</span>
                          </div>
                          <div className="grid grid-cols-2 gap-4 md:gap-5 md:gap-4">
                            <div className="flex flex-col gap-0.5">
                              <span className="text-sm md:text-[15px] leading-relaxed md:text-sm uppercase font-bold text-slate-600 dark:text-slate-300">Age</span>
                              <span className="text-slate-600 dark:text-slate-300">30–35 yrs</span>
                            </div>
                            <div className="flex flex-col gap-0.5">
                              <span className="text-sm md:text-[15px] leading-relaxed md:text-sm uppercase font-bold text-slate-600 dark:text-slate-300">Hair</span>
                              <span className="text-slate-600 dark:text-slate-300">Short, Black</span>
                            </div>
                          </div>
                          <div className="flex flex-col gap-0.5">
                            <span className="text-sm md:text-[15px] leading-relaxed md:text-sm uppercase font-bold text-slate-600 dark:text-slate-300">Clothing</span>
                            <span className="text-slate-600 dark:text-slate-300">Blue T-shirt, Dark jeans</span>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </div>

              </div>
            </div>
            </>
            )}
          </div>
        </div>
      </main>

      {/* Modals & Toasts */}
      {showHowItWorks && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/40 dark:bg-black/60 backdrop-blur-sm" onClick={() => setShowHowItWorks(false)}>
          <div className="bg-white dark:bg-[#18181B] border border-slate-200/80 dark:border-[#3F3F46] rounded-2xl max-w-xl w-full p-6 shadow-2xl relative animate-in fade-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5 pb-4 border-b border-slate-200/80 dark:border-[#3F3F46]">
              <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-4 md:gap-5 md:gap-4">
                 <Info className="w-5 h-5 text-sky-600 dark:text-sky-400" /> How It Works
              </h2>
              <button onClick={() => setShowHowItWorks(false)} className="text-slate-600 dark:text-slate-300 hover:text-slate-300 dark:hover:text-white transition-colors cursor-pointer p-1">
                 <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-6 text-[14px] text-slate-600 dark:text-slate-300 leading-relaxed">
              <p>This tool acts as an AI director for your Hindi/Hinglish scripts.</p>
              <ol className="list-decimal pl-5 space-y-3 text-slate-600 dark:text-slate-200">
                 <li><strong className="text-slate-800 dark:text-slate-200 font-semibold">Paste your script</strong> in the input area.</li>
                 <li><strong className="text-slate-800 dark:text-slate-200 font-semibold">Adjust settings</strong> to define your visual limits.</li>
                 <li><strong className="text-slate-800 dark:text-slate-200 font-semibold">Generate Prompts</strong>: Our LLM breaks down the text logically and applies strict visual guidelines.</li>
                 <li><strong className="text-slate-800 dark:text-slate-200 font-semibold">Copy & Paste</strong> the generated prompt blocks directly into Google Flow or Veo.</li>
              </ol>
              <p className="mt-5 pt-4 border-t border-slate-200/80 dark:border-[#3F3F46] text-sm md:text-[15px] leading-relaxed text-slate-600 dark:text-slate-300">
                 The agent locks character attributes to ensure your final videos look cohesive. Lip-sync is disabled by default to maintain flat-vector style aesthetics.
              </p>
            </div>
            <button onClick={() => setShowHowItWorks(false)} className="w-full mt-6 bg-slate-100 hover:bg-slate-200 dark:bg-[#18181B] dark:hover:bg-sky-600 text-slate-900 dark:text-white font-medium py-3 rounded-xl transition-colors border border-slate-200/80 hover:border-slate-300 dark:border-[#3F3F46] dark:hover:border-sky-500 cursor-pointer">
               Got it, thanks!
            </button>
          </div>
        </div>
      )}

      {toastMessage && (
        <div className="fixed bottom-20 md:bottom-6 right-1/2 translate-x-1/2 md:translate-x-0 md:right-6 z-50 animate-in fade-in slide-in-from-bottom-4 bg-white dark:bg-[#18181B] border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 px-6 md:px-8 py-3.5 rounded-xl flex items-center gap-4 md:gap-5 shadow-xl shadow-black/10 dark:shadow-black/50">
           <CheckCircle2 className="w-4 h-4" />
           <span className="text-sm font-medium tracking-wide whitespace-nowrap">{toastMessage}</span>
        </div>
      )}

      {selectedSceneIndex !== null && scenes[selectedSceneIndex] && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/60 dark:bg-black/80 backdrop-blur-sm" onClick={() => setSelectedSceneIndex(null)}>
          <div className="bg-white dark:bg-[#18181B] border border-slate-200/80 dark:border-[#3F3F46] rounded-2xl w-[96%] max-w-5xl max-h-[95dvh] sm:max-h-[90vh] flex flex-col shadow-2xl relative animate-in fade-in zoom-in-95 duration-200 overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-5 md:py-6 border-b border-slate-200/80 dark:border-[#3F3F46] bg-slate-50 dark:bg-[#18181B]">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-4 md:gap-5 md:gap-4">
                 <Image className="w-5 h-5 text-sky-600 dark:text-sky-400" /> Scene {selectedSceneIndex + 1} Storyboard Sketch & Prompts
              </h2>
              <div className="flex items-center gap-4 md:gap-5">
                <button onClick={() => setSelectedSceneIndex(null)} className="text-slate-600 dark:text-slate-300 hover:text-slate-300 dark:hover:text-white transition-colors cursor-pointer p-1">
                   <X className="w-5 h-5" />
                </button>
              </div>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6 flex flex-col lg:flex-row gap-6">
               <div className="flex-1">
                  <div className="w-full aspect-video bg-gradient-to-br from-indigo-50/40 via-indigo-50/20 to-transparent dark:from-indigo-950/20 dark:via-indigo-950/5 dark:to-transparent rounded-xl border border-dashed border-indigo-200 dark:border-indigo-900/40 flex flex-col items-center justify-center text-center p-6 sm:p-10 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 blur-3xl rounded-full"></div>
                    <Image className="w-12 h-12 text-indigo-500 mb-4 animate-pulse shrink-0" />
                    <h3 className="text-base sm:text-lg font-bold text-slate-800 dark:text-slate-100 mb-2">Storyboard Visual Sketch Prompt</h3>
                    <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-sm mb-6 leading-relaxed">
                      Copy this auto-optimized visual layout description to feed into modern image generators (DALL-E, Midjourney, Imagen, etc.) for beautiful custom storyboard concept sketches.
                    </p>
                    <button
                      onClick={() => handleCopy(scenes[selectedSceneIndex].storyboard || '', `detail-modal-storyboard`)}
                      className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs sm:text-sm font-bold uppercase rounded-lg transition-colors cursor-pointer shadow-md shadow-indigo-950/20 select-none shrink-0"
                    >
                      {copiedIndex === "detail-modal-storyboard" ? (
                        <>
                          <CheckCircle2 className="w-4 h-4 text-emerald-300" />
                          <span>Visual Prompt Copied!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-4 h-4" />
                          <span>Copy Visual Concept Prompt</span>
                        </>
                      )}
                    </button>
                  </div>

                 {scenes[selectedSceneIndex].storyboard && (
                    <div className="mt-4 p-6 bg-sky-50 dark:bg-sky-900/10 border border-sky-100 dark:border-sky-500/20 rounded-xl flex flex-col gap-1">
                      <h4 className="text-sm md:text-[15px] leading-relaxed md:text-sm uppercase font-bold text-sky-600 dark:text-sky-400 mb-1">Visual Concept</h4>
                      <p className="text-sm text-sky-900 dark:text-sky-100 italic">{scenes[selectedSceneIndex].storyboard}</p>
                    </div>
                 )}
               </div>

               <div className="w-full lg:w-[380px] flex flex-col gap-6">
                  <div className="bg-slate-50 dark:bg-[#1A1A1E] rounded-xl border border-slate-200/80 dark:border-[#3F3F46] p-6 flex flex-col gap-4 md:gap-5">
                     <h3 className="text-sm md:text-[15px] leading-relaxed uppercase font-bold text-slate-600 dark:text-slate-200 border-b border-slate-200/80 dark:border-[#3F3F46] pb-2 mb-1">Production Settings</h3>
                     
                     <div>
                       <span className="block text-sm md:text-[15px] leading-relaxed md:text-sm uppercase font-bold text-slate-600 dark:text-slate-300">Emotion</span>
                       <span className="block text-sm font-semibold text-slate-800 dark:text-slate-200 mt-0.5">{scenes[selectedSceneIndex].emotion || 'Neutral'}</span>
                     </div>
                     <div>
                       <span className="block text-sm md:text-[15px] leading-relaxed md:text-sm uppercase font-bold text-slate-600 dark:text-slate-300">Camera</span>
                       <span className="block text-sm font-semibold text-slate-800 dark:text-slate-200 mt-0.5">{scenes[selectedSceneIndex].camera || 'Static'}</span>
                     </div>
                     <div>
                       <span className="block text-sm md:text-[15px] leading-relaxed md:text-sm uppercase font-bold text-slate-600 dark:text-slate-300">Lighting</span>
                       <span className="block text-sm font-semibold text-slate-800 dark:text-slate-200 mt-0.5">{scenes[selectedSceneIndex].lighting || 'Studio lighting'}</span>
                     </div>
                  </div>

                  <div className="bg-slate-50 dark:bg-[#1A1A1E] rounded-xl border border-slate-200/80 dark:border-[#3F3F46] p-6 flex-1 flex flex-col gap-4 min-h-[220px]">
                    {/* Cinematic Prompt Block */}
                    {scenes[selectedSceneIndex].veoExportPrompt && (
                      <div className="flex flex-col gap-1.5 flex-1">
                        <div className="flex justify-between items-center text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-500">
                          <span className="flex items-center gap-1"><Sparkles className="w-3.5 h-3.5"/> Recommended Cinematic Prompt</span>
                          <button onClick={() => handleCopy(scenes[selectedSceneIndex].veoExportPrompt!, "detail-veo")} className="text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 transition-colors cursor-pointer flex items-center gap-1 text-[11px]">
                            {copiedIndex === "detail-veo" ? <><Check className="w-3.5 h-3.5 text-emerald-500" /> Copied</> : <><Copy className="w-3.5 h-3.5" /> Copy</>}
                          </button>
                        </div>
                        <div className="text-xs bg-emerald-50/50 dark:bg-[#101A15] p-3 rounded border border-emerald-100/60 dark:border-emerald-900/40 text-slate-800 dark:text-emerald-100 font-mono leading-relaxed whitespace-pre-wrap max-h-[140px] overflow-y-auto">
                          {scenes[selectedSceneIndex].veoExportPrompt}
                        </div>
                        <p className="text-[9.5px] text-emerald-600 dark:text-emerald-400 font-semibold leading-relaxed">★ RECOMMENDED FOR VIDEO GENERATORS (Google Veo, Sora, Runway, Kling, Luma)</p>
                      </div>
                    )}

                    {/* Technical Prompt Block */}
                    <div className="flex flex-col gap-1.5 pt-2 border-t border-slate-200/60 dark:border-slate-800 flex-1">
                      <div className="flex justify-between items-center text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                        <span className="flex items-center gap-1"><Wand2 className="w-3.5 h-3.5" /> Technical Prompt</span>
                        <button onClick={() => handleCopy(scenes[selectedSceneIndex].prompt, "detail-tech")} className="text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 transition-colors cursor-pointer flex items-center gap-1 text-[11px]">
                          {copiedIndex === "detail-tech" ? <><Check className="w-3.5 h-3.5 text-emerald-500" /> Copied</> : <><Copy className="w-3.5 h-3.5" /> Copy</>}
                        </button>
                      </div>
                      <div className="text-xs bg-white dark:bg-[#18181B] p-3 rounded border border-slate-200/80 dark:border-[#3F3F46]/50 text-slate-700 dark:text-slate-300 font-mono leading-relaxed whitespace-pre-wrap max-h-[140px] overflow-y-auto">
                        {scenes[selectedSceneIndex].prompt}
                      </div>
                    </div>
                  </div>
               </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

function SidebarItem({ icon: Icon, label, active, onClick }: any) {
  return (
    <button onClick={onClick} className={`w-full flex items-center px-3 py-2.5 rounded-lg text-sm transition-colors cursor-pointer ${active ? 'bg-sky-100 text-sky-700 dark:bg-sky-600/10 dark:text-sky-400 font-semibold' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50 dark:text-slate-200 dark:hover:text-slate-200 dark:hover:bg-[#1A1A1E]'}`}>
      <div className="flex items-center gap-4 md:gap-5">
        <Icon className="w-5 h-5 flex-shrink-0" />
        <span className="block">{label}</span>
      </div>
    </button>
  );
}

function SettingItem({ icon: Icon, title, desc, active, onClick }: any) {
  return (
    <div onClick={onClick} className="flex items-center justify-between p-3.5 rounded-xl bg-slate-50 dark:bg-[#18181B] border border-slate-200/80 dark:border-[#3F3F46] hover:border-sky-300 dark:hover:border-sky-500/40 hover:bg-slate-100 dark:hover:bg-[#1A1B29] transition-all cursor-pointer shadow-sm dark:shadow-none group">
      <div className="flex items-center gap-4 md:gap-5.5">
        <div className={`p-2 rounded-lg shrink-0 transition-colors ${!active ? 'bg-slate-200 text-slate-600 dark:text-slate-300 dark:bg-slate-700/50 dark:text-white' : 'bg-sky-100 text-sky-600 dark:bg-sky-600/20 dark:text-sky-400 group-hover:bg-sky-200 dark:group-hover:bg-sky-600/30'}`}>
          <Icon className="w-4 h-4" />
        </div>
        <div className="text-left">
          <p className={`text-sm font-semibold transition-colors ${!active ? 'text-slate-600 dark:text-slate-200 dark:group-hover:text-slate-300' : 'text-slate-800 dark:text-slate-200'}`}>{title}</p>
          <p className="text-sm md:text-[15px] leading-relaxed md:text-sm text-slate-600 dark:text-slate-300 mt-0.5 leading-tight">{desc}</p>
        </div>
      </div>
      {active ? (
        <div className="w-4 h-4 rounded bg-sky-600 flex items-center justify-center text-white shrink-0 shadow-[0_0_8px_rgba(124,58,237,0.4)]">
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
        </div>
      ) : (
        <div className="w-8 h-4 rounded-full bg-slate-300 dark:bg-[#27272A] flex items-center px-0.5 shrink-0 group-hover:bg-slate-400 dark:group-hover:bg-slate-700 transition-colors">
          <div className="w-4 h-4 rounded-full bg-slate-50 dark:bg-slate-500"></div>
        </div>
      )}
    </div>
  );
}

function FlowStep({ icon: Icon, title, desc, active, last }: any) {
  return (
    <div className="flex items-start gap-6">
      <div className="flex flex-col items-center">
        <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 border ${active ? 'bg-sky-100 dark:bg-sky-600/20 text-sky-600 dark:text-sky-400 border-sky-200 dark:border-sky-500/30' : 'bg-slate-50 dark:bg-[#1A1A1E] text-slate-600 dark:text-slate-300 dark:text-slate-600 dark:text-slate-300 border-slate-200/80 dark:border-[#3F3F46]'}`}>
          <Icon className="w-4 h-4" />
        </div>
        {!last && <div className={`w-[2px] h-9 my-1 ${active ? 'bg-sky-200 dark:bg-sky-600/30' : 'bg-slate-200 dark:bg-[#27272A]'}`} />}
      </div>
      <div className="pt-1.5 pb-2">
        <h4 className={`text-sm md:text-[15px] leading-relaxed md:text-sm font-bold uppercase tracking-wider ${active ? 'text-slate-800 dark:text-slate-200' : 'text-slate-600 dark:text-slate-300'}`}>{title}</h4>
        <p className="text-sm md:text-[15px] leading-relaxed md:text-sm text-slate-600 dark:text-slate-200/80 mt-0.5">{desc}</p>
      </div>
    </div>
  );
}

function ProjectsView({ projects, user, login, onLoad }: { projects: any[], user: any, login: () => void, onLoad: (proj: any) => void }) {
  if (!user) {
    return (
      <div className="space-y-8 md:space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500 text-center py-20">
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Your Projects</h2>
        <p className="text-slate-600 dark:text-slate-300 max-w-md mx-auto">Sign in to save and access your generated prompt projects across devices.</p>
        <button onClick={login} className="mt-4 bg-sky-600 text-white font-bold px-6 py-3 rounded-xl hover:bg-sky-500 transition-colors">Sign in with Google</button>
      </div>
    );
  }

  return (
    <div className="space-y-8 md:space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Your Projects</h2>
      {projects.length === 0 ? (
        <div className="text-center py-20 border border-dashed border-slate-300 dark:border-slate-700 rounded-2xl bg-slate-50/50 dark:bg-[#18181B]">
          <p className="text-slate-600 dark:text-slate-300">You haven't generated any projects yet.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {projects.map((proj, idx) => (
            <div key={proj.id || idx} onClick={() => onLoad(proj)} className="bg-white dark:bg-[#18181B] border border-slate-200/80 dark:border-[#3F3F46] rounded-2xl p-6 md:p-8 dark:hover:border-sky-500/50 hover:border-sky-400 cursor-pointer transition-colors shadow-sm dark:shadow-black/40 dark:shadow-xl group">
               <div className="flex items-start justify-between">
                 <div className="w-10 h-10 rounded-lg bg-slate-50 dark:bg-[#18181B] flex items-center justify-center group-hover:bg-sky-50 dark:group-hover:bg-sky-600/20 transition-colors border border-slate-100 dark:border-transparent">
                    <FolderOpen className="w-5 h-5 text-sky-600 dark:text-sky-400" />
                 </div>
                 <span className="text-sm md:text-[15px] leading-relaxed md:text-sm text-slate-600 dark:text-slate-300 font-medium">{proj.createdAt ? new Date(proj.createdAt.seconds * 1000).toLocaleDateString() : 'Just now'}</span>
               </div>
               <h3 className="text-[15px] font-bold text-slate-800 dark:text-slate-200 mt-4 leading-snug truncate">
                 {proj.script.substring(0, 30)}...
               </h3>
               <p className="text-sm md:text-[15px] leading-relaxed text-slate-600 dark:text-slate-300 mt-2">{proj.scenes?.length || 0} Scenes Generated</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function AIDirectorReportView({ project }: { project: any | null }) {
  if (!project || !project.narrativeArc) {
    return (
      <div className="space-y-8 md:space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500 text-center py-20">
         <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">AI Director Report</h2>
         <p className="text-slate-600 dark:text-slate-200">Generate a project first to see your comprehensive director report.</p>
      </div>
    );
  }

  const { narrativeArc, qualityScore, character, stressTest, directorStyle, targetPlatform, createdAt } = project;

  return (
    <div className="space-y-8 md:space-y-10 max-w-4xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500 print:max-w-none">
      <div className="flex items-center justify-between print:hidden">
        <div className="flex items-center gap-4 md:gap-5">
           <FileText className="w-6 h-6 text-sky-600 dark:text-sky-400" />
           <h2 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">AI Director Report</h2>
        </div>
        <button onClick={() => window.print()} className="px-6 md:px-8 py-2 bg-gradient-to-r from-sky-500 to-cyan-500 hover:from-sky-400 hover:to-cyan-400 text-white text-sm md:text-[15px] leading-relaxed font-bold rounded-lg transition-all cursor-pointer shadow-lg shadow-sky-900/20 flex items-center gap-4 md:gap-5 md:gap-4">
          <Download className="w-4 h-4"/> Print Studio Report
        </button>
      </div>

      <div className="bg-white dark:bg-[#111113] border border-slate-200/80 dark:border-[#3F3F46] rounded-2xl overflow-hidden shadow-sm dark:shadow-xl dark:shadow-black/40 print:shadow-none print:border-none print:bg-transparent">
         <div className="p-8 border-b border-slate-200/80 dark:border-[#3F3F46] bg-slate-50 dark:bg-[#18181B] print:bg-transparent print:border-b-2 print:border-slate-800">
             <div className="flex items-center gap-4 md:gap-5 mb-6">
                <div className="w-10 h-10 rounded-lg bg-sky-600 flex items-center justify-center shrink-0 shadow-lg shadow-sky-900/30 print:border print:border-slate-800">
                  <Sparkles className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight print:text-black">SceneForge Studio <span className="font-light opacity-50">| Production Report</span></h1>
                  <p className="text-sm text-slate-600 dark:text-slate-200 mt-1 print:text-slate-600">Generated {new Date(createdAt?.seconds * 1000 || Date.now()).toLocaleDateString()}</p>
                </div>
             </div>
             
             <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                <div>
                  <span className="block text-sm md:text-[15px] leading-relaxed md:text-sm uppercase font-bold text-slate-600 dark:text-slate-300 mb-1">Director Vision</span>
                  <span className="block text-sm font-bold text-slate-800 dark:text-slate-200 print:text-black">{directorStyle || "Default"}</span>
                </div>
                <div>
                  <span className="block text-sm md:text-[15px] leading-relaxed md:text-sm uppercase font-bold text-slate-600 dark:text-slate-300 mb-1">Target Engine</span>
                  <span className="block text-sm font-bold text-slate-800 dark:text-slate-200 print:text-black">{targetPlatform || "Google Veo"}</span>
                </div>
                <div>
                  <span className="block text-sm md:text-[15px] leading-relaxed md:text-sm uppercase font-bold text-slate-600 dark:text-slate-300 mb-1">Production Score</span>
                  <span className="block text-sm font-black text-emerald-600 dark:text-emerald-500 print:text-emerald-700">{qualityScore?.score || "N/A"}/100</span>
                </div>
                <div className="col-span-2 lg:col-span-2">
                  <span className="block text-sm md:text-[15px] leading-relaxed md:text-sm uppercase font-bold text-slate-600 dark:text-slate-300 mb-1">Narrative Strength Breakdown</span>
                  <div className="flex flex-wrap gap-x-6 gap-y-2 mt-1">
                     <span className="text-sm font-black text-indigo-600 dark:text-indigo-400 print:text-indigo-700"><span className="text-sm md:text-[15px] leading-relaxed md:text-sm uppercase font-bold text-slate-600 dark:text-slate-300 mr-2">Overall</span>{narrativeArc?.narrativeStrength || "N/A"}%</span>
                     {narrativeArc?.scoreBreakdown && (
                        <>
                          <span className="text-sm font-medium text-slate-700 dark:text-slate-300"><span className="text-sm md:text-[15px] leading-relaxed md:text-sm uppercase font-bold text-slate-600 dark:text-slate-300 mr-1">Conflict</span>{narrativeArc.scoreBreakdown.conflict}</span>
                          <span className="text-sm font-medium text-slate-700 dark:text-slate-300"><span className="text-sm md:text-[15px] leading-relaxed md:text-sm uppercase font-bold text-slate-600 dark:text-slate-300 mr-1">Transform</span>{narrativeArc.scoreBreakdown.transformation}</span>
                          <span className="text-sm font-medium text-slate-700 dark:text-slate-300"><span className="text-sm md:text-[15px] leading-relaxed md:text-sm uppercase font-bold text-slate-600 dark:text-slate-300 mr-1">Emotion</span>{narrativeArc.scoreBreakdown.emotion}</span>
                        </>
                     )}
                  </div>
                </div>
             </div>
         </div>
         
         <div className="p-8 space-y-8 print:p-0 print:pt-6 print:space-y-8 md:space-y-10">
            {/* Story Psychology */}
            {narrativeArc && (
            <section className="space-y-6">
               <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-4 md:gap-5 md:gap-4 border-b border-slate-100 dark:border-[#3F3F46] pb-2 print:border-slate-300 print:text-black"><BrainCircuit className="w-5 h-5 text-indigo-500"/> Story Psychology</h3>
               <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                 <div>
                   <p className="text-sm md:text-[15px] leading-relaxed font-bold text-slate-600 dark:text-slate-300 uppercase tracking-widest mb-2">Narrative Arc Type</p>
                   <p className="text-base font-semibold text-slate-800 dark:text-slate-200 print:text-black">{narrativeArc.arcType}</p>
                 </div>
                 <div>
                   <p className="text-sm md:text-[15px] leading-relaxed font-bold text-slate-600 dark:text-slate-300 uppercase tracking-widest mb-2">Est. Viewer Retention</p>
                   <div className="flex items-center gap-4 md:gap-5">
                     <p className="text-xl font-black text-slate-800 dark:text-slate-200 print:text-black">{narrativeArc.retentionPotential || 85}%</p>
                     <div className="flex-1 h-2 bg-slate-100 dark:bg-[#18181B] rounded-full overflow-hidden print:bg-slate-200">
                        <div className="h-full bg-indigo-500 rounded-full print:bg-indigo-600" style={{ width: `${narrativeArc.retentionPotential || 85}%` }}></div>
                     </div>
                   </div>
                 </div>
               </div>
               {narrativeArc.pacingAnalysis && (
                  <div>
                    <p className="text-sm md:text-[15px] leading-relaxed font-bold text-slate-600 dark:text-slate-300 uppercase tracking-widest mb-2">Pacing Analysis</p>
                    <p className="text-sm font-medium text-slate-700 dark:text-slate-300 print:text-slate-800 leading-relaxed">{narrativeArc.pacingAnalysis}</p>
                  </div>
               )}
               <div>
                  <p className="text-sm md:text-[15px] leading-relaxed font-bold text-slate-600 dark:text-slate-300 uppercase tracking-widest mb-3">Emotional Progression Curve</p>
                  <div className="flex flex-wrap gap-4 md:gap-5 md:gap-4 items-center">
                    {narrativeArc.emotionCurve?.map((em: string, i: number) => (
                      <React.Fragment key={i}>
                        <span className="text-sm font-semibold bg-indigo-50 dark:bg-[#1A1A1E] px-3 py-1.5 rounded-lg text-indigo-700 dark:text-indigo-300 border border-indigo-100 dark:border-[#3F3F46] print:border-slate-300 print:text-indigo-800 print:bg-white">{em}</span>
                        {i < narrativeArc.emotionCurve.length - 1 && <span className="text-slate-500 dark:text-slate-600 print:text-slate-600">➔</span>}
                      </React.Fragment>
                    ))}
                  </div>
               </div>
               {narrativeArc.heatmap && (
                 <div>
                    <p className="text-sm md:text-[15px] leading-relaxed font-bold text-slate-600 dark:text-slate-300 uppercase tracking-widest mb-4">Narrative Heatmap</p>
                    <div className="space-y-3">
                       {narrativeArc.heatmap.map((point: any, i: number) => (
                         <div key={i} className="flex items-center gap-6 text-sm">
                           <span className="w-16 font-bold text-slate-600 dark:text-slate-300">Scene {point.sceneNumber}</span>
                           <div className="flex-1 max-w-sm flex items-center gap-4 md:gap-5">
                              <span className="w-24 text-slate-700 dark:text-slate-300 font-semibold text-sm md:text-[15px] leading-relaxed tracking-wider uppercase truncate" title={point.emotion}>{point.emotion}</span>
                              <div className="flex-1 h-3 bg-slate-100 dark:bg-[#18181B] rounded-full overflow-hidden print:bg-slate-200 shadow-inner">
                                 <div className="h-full bg-gradient-to-r from-orange-400 to-red-500 rounded-full print:from-red-500 print:to-red-600 shadow" style={{ width: `${point.intensity}%` }}></div>
                              </div>
                              <span className="w-8 text-right font-black text-slate-800 dark:text-slate-200">{point.intensity}%</span>
                           </div>
                         </div>
                       ))}
                    </div>
                 </div>
               )}
            </section>
            )}

            {/* Character Continuity */}
            {character && (
            <section className="space-y-6">
               <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-4 md:gap-5 md:gap-4 border-b border-slate-100 dark:border-[#3F3F46] pb-2 print:border-slate-300 print:text-black"><UserCircle2 className="w-5 h-5 text-sky-500"/> Character Continuity</h3>
               <div className="flex flex-col md:flex-row gap-6 items-start">
                  <div className="bg-slate-50 dark:bg-[#18181B] border border-slate-200/80 dark:border-[#3F3F46] rounded-xl p-6 md:p-8 flex-1 w-full print:border-slate-300 print:bg-white">
                     <p className="text-sm md:text-[15px] leading-relaxed font-bold text-slate-600 dark:text-slate-300 uppercase tracking-widest mb-3">Core DNA</p>
                     <p className="text-sm text-slate-800 dark:text-slate-200 font-medium print:text-black"><strong>{character.id || "Main Lead"}</strong></p>
                     <p className="text-sm text-slate-600 dark:text-slate-200 mt-1 print:text-slate-700">Age {character.age}, {character.hair} hair, {character.outfit}. {character.accessories && `Wearing ${character.accessories}.`}</p>
                     
                     {character.evolution && (
                        <div className="mt-5 grid grid-cols-1 sm:grid-cols-3 gap-6 border-t border-slate-200/80 dark:border-[#3F3F46] pt-4 print:border-slate-300">
                           <div>
                              <p className="text-sm md:text-[15px] leading-relaxed md:text-sm font-bold text-amber-600 dark:text-amber-500 uppercase tracking-widest mb-1">Beginning</p>
                              <p className="text-sm md:text-[15px] leading-relaxed font-medium text-slate-800 dark:text-slate-200 leading-relaxed">{character.evolution.beginning}</p>
                           </div>
                           <div>
                              <p className="text-sm md:text-[15px] leading-relaxed md:text-sm font-bold text-blue-600 dark:text-blue-500 uppercase tracking-widest mb-1">Middle</p>
                              <p className="text-sm md:text-[15px] leading-relaxed font-medium text-slate-800 dark:text-slate-200 leading-relaxed">{character.evolution.middle}</p>
                           </div>
                           <div>
                              <p className="text-sm md:text-[15px] leading-relaxed md:text-sm font-bold text-emerald-600 dark:text-emerald-500 uppercase tracking-widest mb-1">End</p>
                              <p className="text-sm md:text-[15px] leading-relaxed font-medium text-slate-800 dark:text-slate-200 leading-relaxed">{character.evolution.end}</p>
                           </div>
                        </div>
                     )}
                     
                     <div className="mt-4 pt-4 border-t border-slate-200/80 dark:border-[#3F3F46] print:border-slate-200/80">
                        <div className="flex justify-between items-center mb-2">
                           <span className="text-sm md:text-[15px] leading-relaxed font-semibold text-slate-600 dark:text-slate-300">DNA Checksum Pass Rate</span>
                           <span className="text-sm font-bold text-sky-600 dark:text-sky-400 print:text-sky-700">{character.consistencyScore || 90}%</span>
                        </div>
                     </div>
                  </div>
                  
                  {character.driftsDetected && character.driftsDetected.length > 0 && (
                  <div className="bg-rose-50 dark:bg-[#1A1A1E] border border-rose-200 dark:border-rose-900/30 rounded-xl p-6 md:p-8 flex-1 w-full print:border-rose-300 print:bg-rose-50">
                     <p className="text-sm md:text-[15px] leading-relaxed font-bold text-rose-600 dark:text-rose-500 uppercase tracking-widest mb-3 flex items-center gap-1.5 print:text-rose-700"><AlertTriangle className="w-4 h-4"/> Drift Corrections</p>
                     <div className="space-y-3 flex flex-col">
                       {character.driftsDetected.map((drift: any, i: number) => (
                         <div key={i} className="text-sm">
                           <p className="font-semibold text-rose-800 dark:text-rose-300 print:text-rose-900">Scene {drift.sceneNumber}</p>
                           <p className="text-rose-600 dark:text-rose-400/80 text-sm md:text-[15px] leading-relaxed mt-0.5 print:text-rose-700">{drift.issue} → Auto-fixed</p>
                         </div>
                       ))}
                     </div>
                  </div>
                  )}
               </div>
            </section>
            )}

            {/* Veo Readiness */}
            {stressTest && stressTest.length > 0 && (
            <section className="space-y-6">
               <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-4 md:gap-5 md:gap-4 border-b border-slate-100 dark:border-[#3F3F46] pb-2 print:border-slate-300 print:text-black"><Video className="w-5 h-5 text-emerald-500"/> Pipeline Compatibility Risk Analysis</h3>
               <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {stressTest.map((test: any, i: number) => (
                    <div key={i} className="border border-slate-200/80 dark:border-[#3F3F46] p-6 rounded-xl print:border-slate-300">
                      <p className="text-sm md:text-[15px] leading-relaxed font-bold text-slate-600 dark:text-slate-300 uppercase tracking-widest mb-1">Scene {test.sceneNumber} Risk</p>
                      <p className="text-sm font-medium text-slate-800 dark:text-slate-200 mb-2 print:text-black">{test.potentialIssue}</p>
                      <p className="text-sm md:text-[15px] leading-relaxed text-emerald-600 dark:text-emerald-500 flex items-start gap-1.5 print:text-emerald-700">
                        <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                        {test.autoFix}
                      </p>
                    </div>
                  ))}
               </div>
            </section>
            )}
         </div>
      </div>
    </div>
  );
}

function CharactersView({ character }: { character: any }) {
  return (
    <div className="space-y-8 md:space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Character Library</h2>
        <button className="px-6 md:px-8 py-2 bg-sky-600 text-white rounded-lg text-sm font-bold flex items-center gap-4 md:gap-5 md:gap-4 cursor-pointer hover:bg-sky-500 transition-colors"><Plus className="w-4 h-4"/> <span className="hidden sm:inline">Add Character</span></button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
         {character && (
           <div className="bg-white dark:bg-[#18181B] border border-sky-300 dark:border-sky-500/30 hover:border-sky-400 dark:hover:border-sky-500/60 transition-colors rounded-2xl p-6 md:p-8 shadow-sm dark:shadow-black/40 dark:shadow-xl cursor-pointer">
               <div className="flex gap-6 items-start">
                  <div className="w-16 h-16 bg-slate-50 dark:bg-[#1A1A1E] rounded-xl flex items-center justify-center shrink-0 border border-slate-200/80 dark:border-[#3F3F46]">
                    <Sparkles className="w-8 h-8 text-sky-500 dark:text-sky-400" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">{character.id || "Extracted Character"}</h3>
                    <p className="text-sm md:text-[15px] leading-relaxed md:text-sm text-slate-600 dark:text-slate-300 mt-1 leading-snug">Age {character.age}, {character.outfit}.</p>
                    <span className="mt-3 inline-flex items-center gap-1.5 px-2 py-1 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-sm md:text-[15px] leading-relaxed md:text-sm md:text-[15px] leading-relaxed uppercase font-bold rounded tracking-wider border border-emerald-100 dark:border-emerald-500/20">
                      <CheckCircle2 className="w-4 h-4" /> Latest
                    </span>
                  </div>
               </div>
               
               {character.evolution && (
                 <div className="mt-4 pt-4 border-t border-slate-100 dark:border-[#3F3F46] grid grid-cols-1 gap-4 md:gap-5 md:gap-4">
                    <p className="text-sm md:text-[15px] leading-relaxed md:text-sm font-bold text-slate-600 dark:text-slate-300 uppercase tracking-widest mb-1">Evolution Arc</p>
                    <div className="flex flex-col gap-1.5">
                       <div className="flex justify-between items-center text-sm md:text-[15px] leading-relaxed">
                         <span className="text-amber-600 dark:text-amber-500 font-semibold w-16">Start</span>
                         <span className="text-slate-600 dark:text-slate-300 flex-1 truncate">{character.evolution.beginning}</span>
                       </div>
                       <div className="flex justify-between items-center text-sm md:text-[15px] leading-relaxed">
                         <span className="text-blue-600 dark:text-blue-500 font-semibold w-16">Middle</span>
                         <span className="text-slate-600 dark:text-slate-300 flex-1 truncate">{character.evolution.middle}</span>
                       </div>
                       <div className="flex justify-between items-center text-sm md:text-[15px] leading-relaxed">
                         <span className="text-emerald-600 dark:text-emerald-500 font-semibold w-16">End</span>
                         <span className="text-slate-600 dark:text-slate-300 flex-1 truncate">{character.evolution.end}</span>
                       </div>
                    </div>
                 </div>
               )}
           </div>
         )}
         <div className="bg-white dark:bg-[#18181B] border border-sky-300 dark:border-sky-500/30 hover:border-sky-400 dark:hover:border-sky-500/60 transition-colors rounded-2xl p-6 md:p-8 shadow-sm dark:shadow-black/40 dark:shadow-xl cursor-pointer">
             <div className="flex gap-6 items-start">
                <div className="w-16 h-16 bg-slate-50 dark:bg-[#1A1A1E] rounded-xl flex items-center justify-center shrink-0 border border-slate-200/80 dark:border-[#3F3F46]">
                  <UserCircle2 className="w-8 h-8 text-sky-500 dark:text-sky-400" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">Indian Male (Default)</h3>
                  <p className="text-sm md:text-[15px] leading-relaxed md:text-sm text-slate-600 dark:text-slate-300 mt-1 leading-snug">Age 30-35, Blue Shirt, Dark Jeans.</p>
                  <span className="mt-3 inline-flex items-center gap-1.5 px-2 py-1 bg-slate-100 dark:bg-slate-300 text-slate-600 dark:text-slate-200 text-sm md:text-[15px] leading-relaxed md:text-sm md:text-[15px] leading-relaxed uppercase font-bold rounded tracking-wider border border-slate-200/80 dark:border-slate-700">
                    System
                  </span>
                </div>
             </div>
         </div>
      </div>
    </div>
  );
}

function PromptBattleView({ project }: { project: any | null }) {
  if (!project || !project.scenes) {
    return (
      <div className="flex flex-col items-center justify-center py-20 px-6 md:px-8 text-center">
        <Clapperboard className="w-16 h-16 text-slate-400 dark:text-slate-600 mb-4" />
        <h2 className="text-xl font-bold text-slate-800 dark:text-slate-200 mb-2">No Battles Available</h2>
        <p className="text-slate-600 dark:text-slate-300 max-w-md">Generate a project first to see prompt battle results.</p>
      </div>
    );
  }
  
  const scenesWithBattles = project.scenes.filter((s: any) => s.promptVariations && s.promptVariations.length > 0);
  
  if (scenesWithBattles.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 px-6 md:px-8 text-center">
        <Clapperboard className="w-16 h-16 text-slate-400 dark:text-slate-600 mb-4" />
        <h2 className="text-xl font-bold text-slate-800 dark:text-slate-200 mb-2">No Battles Available</h2>
        <p className="text-slate-600 dark:text-slate-300 max-w-md">The current project does not contain prompt variations. Try generating a new one.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-10">
      <div className="bg-gradient-to-br from-indigo-50 dark:from-[#1E1B4B]/20 to-violet-50/50 dark:to-[#4C1D95]/10 border border-indigo-100 dark:border-indigo-900/30 rounded-xl p-6 print:border-indigo-200 print:bg-white">
        <h2 className="text-xl font-bold text-indigo-900 dark:text-indigo-300 flex items-center mb-2 print:text-indigo-800">
          <Sparkles className="w-5 h-5 mr-3 text-indigo-500" />
          Prompt Battle Report
        </h2>
        <p className="text-sm text-indigo-700/80 dark:text-indigo-400 print:text-indigo-700">
          The AI generated 3 distinct prompt variations for each scene and battled them to find the most cinematic and platform-compatible version.
        </p>
      </div>

      <div className="space-y-8">
        {scenesWithBattles.map((scene: any, index: number) => {
           return (
             <div key={index} className="bg-white dark:bg-[#111113] border border-slate-200/80 dark:border-[#3F3F46] rounded-xl overflow-hidden shadow-sm print:border-slate-300">
                <div className="bg-slate-50 dark:bg-[#18181B] px-6 md:px-8 py-5 md:py-6 border-b border-slate-200/80 dark:border-[#3F3F46] print:bg-slate-50 print:border-slate-300">
                  <h3 className="font-bold text-slate-900 dark:text-white mb-1 print:text-black">Scene {index + 1}: {scene.emotion}</h3>
                  <p className="text-sm md:text-[15px] leading-relaxed text-slate-600 dark:text-slate-300 print:text-slate-600">{scene.sceneBreakdown}</p>
                </div>

                <div className="p-6 md:p-8">
                  <div className="mb-6 flex gap-6 p-6 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/30 rounded-lg print:border-emerald-300 print:bg-emerald-50">
                    <Crown className="w-6 h-6 text-emerald-500 flex-shrink-0" />
                    <div>
                       <h4 className="font-bold text-emerald-900 dark:text-emerald-400 text-sm mb-1 print:text-emerald-800">Winner: {scene.winningPromptVersion || 'Selected Style'}</h4>
                       <p className="text-sm md:text-[15px] leading-relaxed text-emerald-700 dark:text-emerald-500/80 mb-3 print:text-emerald-700">{scene.winnerExplanation || 'Selected for superior cinematic framing.'}</p>
                       <div className="bg-white dark:bg-emerald-950/50 rounded border border-emerald-100 dark:border-emerald-900/50 p-3 print:border-emerald-200">
                         <p className="text-sm font-medium text-emerald-900 dark:text-emerald-100 print:text-emerald-900">{scene.prompt}</p>
                       </div>
                    </div>
                  </div>

                  <h4 className="text-sm md:text-[15px] leading-relaxed font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider mb-3 print:text-slate-600 dark:text-slate-300">All Contenders</h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                     {scene.promptVariations.map((v: any, vIdx: number) => (
                       <div key={vIdx} className={`p-6 rounded-xl border ${scene.winningPromptVersion === v.version ? 'border-emerald-500 ring-1 ring-emerald-500 dark:bg-emerald-950/10' : 'border-slate-200/80 dark:border-[#3F3F46]'} print:border-slate-300`}>
                          <div className="flex justify-between items-center mb-3">
                            <span className="font-bold text-sm dark:text-white print:text-black">{v.version}</span>
                            <span className="text-sm md:text-[15px] leading-relaxed md:text-sm font-bold px-2 py-0.5 bg-slate-100 dark:bg-[#27272A] rounded text-slate-600 dark:text-slate-300 print:bg-slate-200">Score: {Math.round((v.cinematicQuality + v.visualDetail + v.retentionPotential)/3)}</span>
                          </div>
                          
                          <p className="text-sm md:text-[15px] leading-relaxed md:text-sm text-slate-600 dark:text-slate-200 mb-4 line-clamp-6 leading-relaxed print:text-slate-700">{v.prompt}</p>

                          <div className="space-y-1.5 overflow-hidden">
                             <div className="flex items-center text-sm md:text-[15px] leading-relaxed md:text-sm">
                               <span className="text-slate-600 dark:text-slate-300 w-16">Cinematic</span>
                               <div className="flex-1 bg-slate-100 dark:bg-[#27272A] h-1.5 rounded-full mx-2 overflow-hidden print:bg-slate-200">
                                 <div className="bg-indigo-500 h-full rounded-full" style={{ width: `${v.cinematicQuality}%` }}></div>
                               </div>
                               <span className="font-medium dark:text-slate-300 print:text-black w-6 text-right">{v.cinematicQuality}</span>
                             </div>
                             <div className="flex items-center text-sm md:text-[15px] leading-relaxed md:text-sm">
                               <span className="text-slate-600 dark:text-slate-300 w-16">Detail</span>
                               <div className="flex-1 bg-slate-100 dark:bg-[#27272A] h-1.5 rounded-full mx-2 overflow-hidden print:bg-slate-200">
                                 <div className="bg-emerald-500 h-full rounded-full" style={{ width: `${v.visualDetail}%` }}></div>
                               </div>
                               <span className="font-medium dark:text-slate-300 print:text-black w-6 text-right">{v.visualDetail}</span>
                             </div>
                             <div className="flex items-center text-sm md:text-[15px] leading-relaxed md:text-sm">
                               <span className="text-slate-600 dark:text-slate-300 w-16">Veo Ready</span>
                               <div className="flex-1 bg-slate-100 dark:bg-[#27272A] h-1.5 rounded-full mx-2 overflow-hidden print:bg-slate-200">
                                 <div className="bg-amber-500 h-full rounded-full" style={{ width: `${v.veoCompatibility}%` }}></div>
                               </div>
                               <span className="font-medium dark:text-slate-300 print:text-black w-6 text-right">{v.veoCompatibility}</span>
                             </div>
                          </div>
                       </div>
                     ))}
                  </div>
                </div>
             </div>
           )
        })}
      </div>
    </div>
  )
}

function HistoryView({ projects, user, login, onLoad }: { projects: any[], user: any, login: () => void, onLoad: (proj: any) => void }) {
   if (!user) {
    return (
      <div className="space-y-8 md:space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500 text-center py-20">
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Generation History</h2>
        <p className="text-slate-600 dark:text-slate-300 max-w-md mx-auto">Sign in to view your generation history.</p>
        <button onClick={login} className="mt-4 bg-sky-600 text-white font-bold px-6 py-3 rounded-xl hover:bg-sky-500 transition-colors">Sign in with Google</button>
      </div>
    );
   }

   return (
    <div className="space-y-8 md:space-y-10 max-w-3xl animate-in fade-in slide-in-from-bottom-4 duration-500">
      <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Generation History</h2>
      {projects.length === 0 ? (
        <div className="text-center py-20 border border-dashed border-slate-300 dark:border-slate-700 rounded-2xl bg-slate-50/50 dark:bg-[#18181B]">
          <p className="text-slate-600 dark:text-slate-300">No history found.</p>
        </div>
      ) : (
        <div className="bg-white dark:bg-[#18181B] border border-slate-200/80 dark:border-[#3F3F46] rounded-2xl overflow-hidden shadow-sm dark:shadow-black/40 dark:shadow-xl">
           <div className="p-6 border-b border-slate-200/80 dark:border-[#3F3F46] flex justify-between items-center bg-slate-50 dark:bg-[#18181B]">
              <span className="text-sm md:text-[15px] leading-relaxed font-bold uppercase tracking-widest text-slate-600 dark:text-slate-200">All Time</span>
           </div>
           <div className="p-6 md:p-8 flex flex-col gap-6">
              {projects.map((proj, i) => (
                <div key={proj.id || i} onClick={() => onLoad(proj)} className="flex items-center justify-between p-6 bg-slate-50 dark:bg-[#18181B] rounded-xl border border-slate-200/80 dark:border-[#3F3F46] hover:border-sky-300 dark:hover:border-sky-500/50 transition-colors cursor-pointer group">
                   <div className="flex items-center gap-6">
                      <div className="w-10 h-10 rounded-lg bg-slate-200/50 dark:bg-[#27272A]/40 flex items-center justify-center group-hover:bg-sky-100 dark:group-hover:bg-sky-900/40 transition-colors">
                        <History className="w-5 h-5 text-slate-600 dark:text-slate-200 group-hover:text-sky-600 dark:group-hover:text-sky-400" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-slate-800 dark:text-slate-200">Script Gen</p>
                        <p className="text-sm md:text-[15px] leading-relaxed md:text-sm sm:text-sm md:text-[15px] leading-relaxed text-slate-600 dark:text-slate-300 mt-0.5">{proj.scenes?.length || 0} Scenes • {proj.createdAt ? new Date(proj.createdAt.seconds * 1000).toLocaleDateString() : 'Just now'}</p>
                      </div>
                   </div>
                   <button className="px-3 py-1.5 border border-slate-200/80 dark:border-[#3F3F46] text-slate-600 dark:text-slate-300 rounded-lg text-sm md:text-[15px] leading-relaxed font-semibold group-hover:bg-sky-600 group-hover:text-white group-hover:border-transparent min-w-[70px] text-center transition-colors">Load</button>
                </div>
              ))}
           </div>
        </div>
      )}
    </div>
   );
}

function ProfileView({ user, login, logout, projectsCount }: { user: any, login: () => void, logout: () => void, projectsCount: number }) {
  if (!user) {
    return (
      <div className="space-y-8 md:space-y-10 max-w-2xl animate-in fade-in slide-in-from-bottom-4 duration-500 text-center py-20">
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Sign in to your account</h2>
        <p className="text-slate-600 dark:text-slate-300 mb-6 max-w-md mx-auto">Create an account or sign in to sync your projects and maintain your generation history.</p>
        <button onClick={login} className="bg-sky-600 hover:bg-sky-500 text-white font-bold py-3 px-8 rounded-xl transition-all shadow-lg shadow-sky-900/20">
          Sign In with Google
        </button>
      </div>
    );
  }

  return (
   <div className="space-y-8 md:space-y-10 max-w-2xl animate-in fade-in slide-in-from-bottom-4 duration-500">
     <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Your Profile</h2>
     <div className="bg-white dark:bg-[#18181B] border border-slate-200/80 dark:border-[#3F3F46] rounded-2xl overflow-hidden shadow-sm dark:shadow-black/40 dark:shadow-xl">
        <div className="p-6 md:p-8 flex flex-col sm:flex-row items-center sm:items-start gap-6 border-b border-slate-200/80 dark:border-[#3F3F46]">
           {user.photoURL ? (
             <img src={user.photoURL} alt="Profile" className="w-24 h-24 rounded-2xl shadow-lg border-2 border-slate-200/80 dark:border-slate-300" />
           ) : (
             <div className="w-24 h-24 bg-gradient-to-br from-sky-500 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg transform rotate-3">
               <UserCircle2 className="w-12 h-12 text-white/90 transform -rotate-3" />
             </div>
           )}
           <div className="space-y-2 text-center sm:text-left flex-1">
             <h3 className="text-xl font-bold text-slate-900 dark:text-white">{user.displayName || 'AI Studio User'}</h3>
             <p className="text-slate-600 dark:text-slate-300 text-sm">Authenticated User</p>
             <div className="pt-3">
               <span className="inline-block px-3 py-1 bg-sky-100 dark:bg-sky-600/20 text-sky-700 dark:text-sky-400 text-sm md:text-[15px] leading-relaxed font-bold rounded-lg border border-sky-200 dark:border-sky-500/20">
                 {projectsCount} Projects Saved
               </span>
             </div>
           </div>
           <button onClick={logout} className="px-6 md:px-8 py-2 bg-red-50 hover:bg-red-100 dark:bg-red-500/10 dark:hover:bg-red-500/20 text-sm font-semibold rounded-lg text-red-600 dark:text-red-400 border border-transparent hover:border-red-200 dark:hover:border-red-500/30 transition-colors flex items-center gap-4 md:gap-5 md:gap-4">
             <LogOut className="w-4 h-4" /> Sign Out
           </button>
        </div>
        <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-6">
           <div className="p-6 border border-slate-200/80 dark:border-[#3F3F46] rounded-xl bg-slate-50 dark:bg-[#18181B]">
             <h4 className="text-sm md:text-[15px] leading-relaxed font-bold uppercase tracking-widest text-slate-600 dark:text-slate-300 mb-1">Email</h4>
             <p className="text-sm text-slate-900 dark:text-white font-medium break-all">{user.email}</p>
           </div>
           <div className="p-6 border border-slate-200/80 dark:border-[#3F3F46] rounded-xl bg-slate-50 dark:bg-[#18181B]">
             <h4 className="text-sm md:text-[15px] leading-relaxed font-bold uppercase tracking-widest text-slate-600 dark:text-slate-300 mb-1">Status</h4>
             <p className="text-sm text-slate-900 dark:text-white font-medium flex items-center gap-4 md:gap-5 md:gap-4">Active <CheckCircle2 className="w-4 h-4 text-emerald-500"/></p>
           </div>
        </div>
     </div>
   </div>
  );
}

function SettingsView({ settings, toggleSetting, handleResetSettings, theme, setTheme }: any) {
   return (
    <div className="space-y-8 md:space-y-10 max-w-2xl animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4 md:gap-5">
           <SettingsIcon className="w-6 h-6 text-sky-600 dark:text-sky-400" />
           <h2 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">Settings</h2>
        </div>
        <button onClick={handleResetSettings} className="px-6 md:px-8 py-2 border border-slate-200/80 dark:border-[#3F3F46] bg-white dark:bg-[#18181B] text-slate-600 dark:text-slate-300 text-sm md:text-[15px] leading-relaxed font-bold rounded-lg hover:bg-slate-50 dark:hover:bg-slate-300 transition-colors cursor-pointer">
          Reset Rules
        </button>
      </div>

      <div className="bg-white dark:bg-[#18181B] border border-slate-200/80 dark:border-[#3F3F46] rounded-2xl p-6 shadow-sm dark:shadow-xl dark:shadow-black/40 space-y-8 md:space-y-10 transition-colors">
          
          <div>
            <h3 className="text-sm md:text-[15px] leading-relaxed md:text-sm font-bold text-slate-600 dark:text-slate-300 uppercase tracking-widest mb-4">Appearance</h3>
            <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-50 dark:bg-[#18181B] border border-slate-200/80 dark:border-[#3F3F46]">
               <div className="flex items-center gap-4 md:gap-5.5">
                 <div className="p-2 rounded-lg bg-orange-100 text-orange-600 dark:bg-amber-500/10 dark:text-amber-400 shrink-0">
                   {theme === 'dark' ? <Moon className="w-4 h-4"/> : <Sun className="w-4 h-4"/>}
                 </div>
                 <div>
                   <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">Theme Mode</p>
                   <p className="text-sm md:text-[15px] leading-relaxed md:text-sm text-slate-600 dark:text-slate-300 mt-0.5">Toggle between light and dark aesthetics</p>
                 </div>
               </div>
               <div className="flex bg-slate-200 dark:bg-[#18181B] border border-slate-300 dark:border-[#3F3F46] rounded-lg p-1">
                 <button onClick={() => setTheme('light')} className={`px-3 py-1.5 text-sm md:text-[15px] leading-relaxed font-bold rounded flex items-center justify-center transition-colors cursor-pointer ${theme === 'light' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 dark:text-slate-300 hover:text-slate-700'}`}>Light</button>
                 <button onClick={() => setTheme('dark')} className={`px-3 py-1.5 text-sm md:text-[15px] leading-relaxed font-bold rounded flex items-center justify-center transition-colors cursor-pointer ${theme === 'dark' ? 'bg-[#18181B] text-white shadow-sm border border-[#27272A]' : 'text-slate-600 dark:text-slate-300 hover:text-slate-200'}`}>Dark</button>
               </div>
            </div>
          </div>

          <div className="border-t border-slate-200/80 dark:border-[#3F3F46] pt-6 space-y-6 text-left">
            <h3 className="text-sm md:text-[15px] leading-relaxed md:text-sm font-bold text-slate-600 dark:text-slate-300 uppercase tracking-widest mb-4">Prompt Generation Rules <br/> <span className="text-sm md:text-[15px] leading-relaxed md:text-sm lowercase font-normal italic text-slate-600 dark:text-slate-300">These limits shape the AI output</span></h3>
            <SettingItem icon={Sparkles} title="Dynamic Character" desc="AI intelligently picks characters for the story" active={settings.dynamicCharacter} onClick={() => toggleSetting('dynamicCharacter')} />
            <SettingItem icon={UserCircle2} title="Character Consistency" desc="Same character look across all scenes" active={settings.characterConsistency} onClick={() => toggleSetting('characterConsistency')} />
            <SettingItem icon={Box} title="3D Flat Vector Style" desc="Clean 3D flat vector visuals" active={settings.flatVectorStyle} onClick={() => toggleSetting('flatVectorStyle')} />
            <SettingItem icon={Type} title="Hinglish Text Overlay" desc="On-screen Hinglish text" active={settings.hinglishText} onClick={() => toggleSetting('hinglishText')} />
            <SettingItem icon={VolumeX} title="No Lip Sync (Default)" desc="No lip-sync for consistent poses" active={settings.lipSync} onClick={() => toggleSetting('lipSync')} />
            <SettingItem icon={Video} title="Veo Optimized" desc="Formats prompts for Veo / Flow" active={settings.veoOptimized} onClick={() => toggleSetting('veoOptimized')} />
          </div>
      </div>
    </div>
   );
}
