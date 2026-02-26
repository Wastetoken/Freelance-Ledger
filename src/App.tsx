import React, { useState, useEffect, useRef } from 'react';
import { 
  Plus, 
  ChevronRight, 
  Clock, 
  CheckSquare, 
  FileText, 
  Users, 
  Shield, 
  Zap, 
  CreditCard, 
  MessageSquare, 
  ArrowRightLeft,
  LayoutDashboard,
  Upload,
  X,
  Download,
  Printer,
  Eye,
  Camera,
  Edit2,
  Trash2,
  Calculator,
  TrendingUp,
  DollarSign
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { HomeScene } from './components/HomeScene';

type SectionType = 
  | 'todo' 
  | 'requirements' 
  | 'hours' 
  | 'overview' 
  | 'scope' 
  | 'billing' 
  | 'comms' 
  | 'qa' 
  | 'assets'
  | 'progress';

interface Project {
  id: number;
  name: string;
  client_name: string;
  status: string;
  created_at: string;
  thumbnail?: string | null;
}

interface Todo {
  id: number;
  task: string;
  status: 'pending' | 'completed';
}

interface HourEntry {
  id: number;
  date: string;
  duration: number;
  description: string;
}

interface ProjectSection {
  section_type: string;
  content: string;
}

interface ProjectFile {
  id: number;
  section_type: string;
  filename: string;
  original_name: string;
  mime_type: string;
  created_at: string;
}

export default function App() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [activeProject, setActiveProject] = useState<Project | null>(null);
  const [activeSection, setActiveSection] = useState<SectionType>('overview');
  const [projectData, setProjectData] = useState<{
    todos: Todo[];
    hours: HourEntry[];
    sections: ProjectSection[];
    files: ProjectFile[];
  }>({ todos: [], hours: [], sections: [], files: [] });

  const [isCreating, setIsCreating] = useState(false);
  const [isEditingProject, setIsEditingProject] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [showCalculator, setShowCalculator] = useState(false);
  const [selectedHomeProject, setSelectedHomeProject] = useState<Project | null>(null);
  const [newProject, setNewProject] = useState({ name: '', client_name: '' });
  const [editProjectData, setEditProjectData] = useState({ name: '', client_name: '', status: '' });

  useEffect(() => {
    fetchProjects();
  }, []);

  useEffect(() => {
    if (activeProject) {
      fetchProjectDetails(activeProject.id);
      setEditProjectData({
        name: activeProject.name,
        client_name: activeProject.client_name,
        status: activeProject.status
      });
    }
  }, [activeProject]);

  const fetchProjects = async () => {
    try {
      const res = await fetch('/api/projects');
      const data = await res.json();
      setProjects(data);
    } catch (e) {
      console.error("Failed to fetch projects", e);
    }
  };

  const fetchProjectDetails = async (id: number) => {
    try {
      const res = await fetch(`/api/projects/${id}`);
      const data = await res.json();
      setProjectData({
        todos: data.todos || [],
        hours: data.hours || [],
        sections: data.sections || [],
        files: data.files || []
      });
    } catch (e) {
      console.error("Failed to fetch project details", e);
    }
  };

  const createProject = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch('/api/projects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newProject)
    });
    const data = await res.json();
    await fetchProjects();
    setIsCreating(false);
    setNewProject({ name: '', client_name: '' });
    const created = { ...newProject, id: data.id, status: 'active', created_at: new Date().toISOString() };
    setActiveProject(created as Project);
  };

  const updateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeProject) return;
    await fetch(`/api/projects/${activeProject.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(editProjectData)
    });
    await fetchProjects();
    setIsEditingProject(false);
    setActiveProject({ ...activeProject, ...editProjectData });
  };

  const deleteProject = async (project: Project) => {
    if (!confirm(`CONFIRM DELETION\n\nProject: ${project.name}\nClient: ${project.client_name}\n\nThis will permanently delete all logs, files, and data. Proceed?`)) return;
    
    try {
      console.log(`Initiating delete for project ${project.id}...`);
      const res = await fetch(`/api/projects/${project.id}`, { 
        method: 'DELETE',
        headers: { 'Accept': 'application/json' }
      });
      
      const data = await res.json();
      console.log("Delete response:", data);

      if (res.ok) {
        // Success
        await fetchProjects();
        if (activeProject?.id === project.id) {
          setActiveProject(null);
        }
      } else {
        // Server-side error
        alert(`SERVER ERROR: ${data.error || 'The server refused to delete the project.'}`);
      }
    } catch (e) {
      console.error("Network/Client Error:", e);
      alert("CONNECTION ERROR: Could not reach the server to perform deletion.");
    }
  };

  const updateSectionContent = async (type: string, content: string) => {
    if (!activeProject) return;
    await fetch(`/api/projects/${activeProject.id}/section`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ section_type: type, content })
    });
    fetchProjectDetails(activeProject.id);
  };

  const uploadFile = async (section: string, file: File) => {
    if (!activeProject) return;
    const formData = new FormData();
    formData.append('file', file);
    formData.append('section_type', section);

    await fetch(`/api/projects/${activeProject.id}/files`, {
      method: 'POST',
      body: formData
    });
    fetchProjectDetails(activeProject.id);
  };

  const deleteFile = async (id: number) => {
    await fetch(`/api/files/${id}`, { method: 'DELETE' });
    if (activeProject) fetchProjectDetails(activeProject.id);
  };

  const addTodo = async (task: string) => {
    if (!activeProject) return;
    await fetch(`/api/projects/${activeProject.id}/todos`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ task })
    });
    fetchProjectDetails(activeProject.id);
  };

  const toggleTodo = async (id: number, currentStatus: string) => {
    await fetch(`/api/todos/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: currentStatus === 'pending' ? 'completed' : 'pending' })
    });
    if (activeProject) fetchProjectDetails(activeProject.id);
  };

  const addHours = async (entry: { date: string; duration: number; description: string }) => {
    if (!activeProject) return;
    await fetch(`/api/projects/${activeProject.id}/hours`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(entry)
    });
    fetchProjectDetails(activeProject.id);
  };

  const getSectionContent = (type: string) => {
    return projectData.sections.find(s => s.section_type === type)?.content || '';
  };

  const getSectionFiles = (type: string) => {
    return projectData.files.filter(f => f.section_type === type);
  };

  const exportToHTML = () => {
    if (!activeProject) return;
    const htmlContent = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <title>${activeProject.name} - Project Handover</title>
        <style>
          body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; line-height: 1.6; color: #1a1a1a; max-width: 800px; margin: 40px auto; padding: 20px; }
          h1 { font-size: 48px; font-weight: 900; text-transform: uppercase; letter-spacing: -2px; border-bottom: 4px solid black; padding-bottom: 10px; }
          h2 { font-size: 24px; font-weight: 800; text-transform: uppercase; margin-top: 40px; border-top: 1px solid #eee; padding-top: 20px; }
          .meta { color: #888; font-size: 12px; text-transform: uppercase; letter-spacing: 1px; }
          .section { margin-bottom: 40px; }
          table { width: 100%; border-collapse: collapse; margin: 20px 0; }
          th, td { border-bottom: 1px solid #eee; padding: 12px; text-align: left; }
          th { font-size: 10px; text-transform: uppercase; color: #888; }
          .todo-item { display: flex; align-items: center; gap: 10px; margin-bottom: 5px; }
          .todo-done { text-decoration: line-through; color: #888; }
          pre { background: #f5f5f5; padding: 20px; white-space: pre-wrap; font-family: monospace; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="meta">Project Handover Document // ${new Date().toLocaleDateString()}</div>
        <h1>${activeProject.name}</h1>
        <div class="meta">Client: ${activeProject.client_name}</div>
        
        <div class="section">
          <h2>Overview</h2>
          <pre>${getSectionContent('overview') || 'No overview provided.'}</pre>
        </div>

        <div class="section">
          <h2>Requirements</h2>
          <pre>${getSectionContent('requirements') || 'No requirements provided.'}</pre>
        </div>

        <div class="section">
          <h2>Task Ledger</h2>
          ${projectData.todos.map(t => `
            <div class="todo-item ${t.status === 'completed' ? 'todo-done' : ''}">
              [${t.status === 'completed' ? 'X' : ' '}] ${t.task}
            </div>
          `).join('')}
        </div>

        <div class="section">
          <h2>Hours Log</h2>
          <table>
            <thead><tr><th>Date</th><th>Duration</th><th>Description</th></tr></thead>
            <tbody>
              ${projectData.hours.map(h => `
                <tr><td>${h.date}</td><td>${h.duration}h</td><td>${h.description}</td></tr>
              `).join('')}
            </tbody>
          </table>
          <div style="font-weight: bold; text-align: right;">Total: ${projectData.hours.reduce((a, b) => a + b.duration, 0)}h</div>
        </div>

        <div class="section">
          <h2>Billing & Scope</h2>
          <pre>${getSectionContent('billing')}</pre>
          <pre>${getSectionContent('scope')}</pre>
        </div>
      </body>
      </html>
    `;
    const blob = new Blob([htmlContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${activeProject.name.toLowerCase()}_handover.html`;
    a.click();
  };

  const sections: { id: SectionType; label: string; icon: any }[] = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    { id: 'todo', label: 'To-do', icon: CheckSquare },
    { id: 'requirements', label: 'Requirements', icon: FileText },
    { id: 'progress', label: 'Progress', icon: Camera },
    { id: 'hours', label: 'Hours Log', icon: Clock },
    { id: 'scope', label: 'Scope + Change', icon: ArrowRightLeft },
    { id: 'billing', label: 'Billing', icon: CreditCard },
    { id: 'comms', label: 'Comms Trail', icon: MessageSquare },
    { id: 'qa', label: 'QA Readiness', icon: Zap },
    { id: 'assets', label: 'Access + Assets', icon: Shield },
  ];

  return (
    <div className="min-h-screen lg:h-screen lg:overflow-hidden bg-white text-[#1A1A1A] font-sans selection:bg-[#1A1A1A] selection:text-white flex flex-col lg:flex-row">
      {/* Mobile Header */}
      <header className="lg:hidden fixed top-0 left-0 right-0 h-16 bg-white border-b border-[#E5E5E5] flex items-center justify-between px-6 z-30">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setIsSidebarOpen(true)}
            className="p-2 -ml-2 hover:bg-[#F5F5F5] transition-colors"
          >
            <LayoutDashboard size={20} />
          </button>
          <h1 className="text-[10px] font-bold tracking-[0.2em] uppercase">Ledger</h1>
        </div>
        {activeProject && (
          <div className="text-[10px] font-bold uppercase truncate max-w-[150px]">
            {activeProject.name}
          </div>
        )}
      </header>

      {/* Sidebar Overlay */}
      <AnimatePresence>
        {isSidebarOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsSidebarOpen(false)}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 lg:hidden"
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <aside className={`fixed inset-y-0 left-0 z-50 w-72 bg-white border-r border-[#E5E5E5] transition-transform duration-300 lg:translate-x-0 flex flex-col h-screen lg:static shrink-0 ${
        isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
      }`}>
        <div className="p-8 border-b border-[#E5E5E5] flex justify-between items-center">
          <div>
            <h1 className="text-xs font-bold tracking-[0.2em] uppercase mb-1">Freelance Ledger</h1>
            <p className="text-[10px] text-[#888] font-mono">V.2026.02.25</p>
          </div>
          <button 
            onClick={() => setIsSidebarOpen(false)}
            className="lg:hidden p-2 -mr-2 hover:bg-[#F5F5F5] transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-4 space-y-2">
          <button 
            onClick={() => {
              setActiveProject(null);
              setShowCalculator(false);
              setIsSidebarOpen(false);
            }}
            className={`w-full flex items-center justify-between p-4 border border-[#E5E5E5] text-xs font-bold uppercase tracking-wider transition-colors ${
              !activeProject && !showCalculator ? 'bg-[#1A1A1A] text-white' : 'hover:bg-[#F5F5F5]'
            }`}
          >
            Dashboard <LayoutDashboard size={14} />
          </button>
          <button 
            onClick={() => {
              setIsCreating(true);
              setIsSidebarOpen(false);
            }}
            className="w-full flex items-center justify-between p-4 bg-[#1A1A1A] text-white text-xs font-bold uppercase tracking-wider hover:bg-black transition-colors"
          >
            New Project <Plus size={14} />
          </button>
          <button 
            onClick={() => {
              setShowCalculator(true);
              setActiveProject(null);
              setIsSidebarOpen(false);
            }}
            className={`w-full flex items-center justify-between p-4 border border-[#E5E5E5] text-xs font-bold uppercase tracking-wider transition-colors ${
              showCalculator ? 'bg-[#1A1A1A] text-white' : 'hover:bg-[#F5F5F5]'
            }`}
          >
            Rate Calculator <Calculator size={14} />
          </button>
        </div>

        <nav className="flex-1 overflow-hidden flex flex-col">
          <div className="px-8 py-4 text-[10px] font-bold uppercase tracking-widest text-[#888] border-b border-[#F5F5F5]">Active Projects</div>
          
          <div className="flex-1 overflow-y-auto no-scrollbar">
            {projects.map(project => (
              <div key={project.id} className="group relative border-b border-[#F5F5F5]">
                {(!activeProject && !showCalculator) ? (
                  <button
                    onClick={() => setSelectedHomeProject(project)}
                    className={`w-full p-4 transition-all ${
                      selectedHomeProject?.id === project.id ? 'bg-[#F5F5F5]' : 'hover:bg-[#FAFAFA]'
                    }`}
                  >
                    <div className={`relative aspect-video bg-[#1A1A1A] overflow-hidden mb-2 border-2 transition-colors ${
                      selectedHomeProject?.id === project.id ? 'border-red-600' : 'border-transparent'
                    }`}>
                      {project.thumbnail ? (
                        <img 
                          src={`/uploads/${project.thumbnail}`} 
                          alt={project.name}
                          className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <FileText size={24} className="text-[#333]" />
                        </div>
                      )}
                      <div className="absolute inset-x-0 bottom-0 p-2 bg-gradient-to-t from-black/80 to-transparent">
                        <div className="text-[8px] font-bold text-white uppercase tracking-tighter truncate">{project.name}</div>
                      </div>
                    </div>
                    <div className="text-left">
                      <div className="text-[10px] font-bold uppercase tracking-tight truncate">{project.name}</div>
                      <div className="text-[8px] text-[#888] uppercase tracking-widest">{project.client_name}</div>
                    </div>
                  </button>
                ) : (
                  <button
                    onClick={() => {
                      setActiveProject(project);
                      setShowCalculator(false);
                      setIsSidebarOpen(false);
                    }}
                    className={`w-full flex items-center justify-between px-8 py-4 text-xs font-medium transition-all ${
                      activeProject?.id === project.id ? 'bg-[#F5F5F5] border-l-4 border-l-[#1A1A1A]' : 'hover:bg-[#FAFAFA]'
                    }`}
                  >
                    <div className="text-left pr-12">
                      <div className="font-bold uppercase tracking-tight">{project.name}</div>
                      <div className="text-[10px] text-[#888] mt-0.5">{project.client_name}</div>
                    </div>
                    <ChevronRight size={14} className={activeProject?.id === project.id ? 'opacity-100' : 'opacity-0'} />
                  </button>
                )}
                
                <div className="absolute right-4 top-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                  <button 
                    onClick={(e) => { 
                      e.stopPropagation(); 
                      setEditProjectData({
                        name: project.name,
                        client_name: project.client_name,
                        status: project.status
                      });
                      setActiveProject(project);
                      setIsEditingProject(true); 
                    }}
                    className="p-1.5 bg-white/90 backdrop-blur shadow-sm hover:bg-white transition-colors"
                    title="Edit Project"
                  >
                    <Edit2 size={12} />
                  </button>
                  <button 
                    onClick={(e) => { 
                      e.stopPropagation(); 
                      deleteProject(project); 
                    }}
                    className="p-1.5 bg-white/90 backdrop-blur shadow-sm hover:bg-red-50 text-red-600 transition-colors"
                    title="Delete Project"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1 min-h-screen lg:h-screen lg:overflow-hidden no-print flex flex-col min-w-0 bg-white">
        <AnimatePresence mode="wait">
          {showCalculator ? (
            <motion.div
              key="calculator"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="flex-1 overflow-y-auto p-6 pt-24 lg:p-20 w-full no-scrollbar"
            >
              <div className="max-w-4xl mx-auto">
                <FreelanceCalculator />
              </div>
            </motion.div>
          ) : activeProject ? (
            <motion.div
              key={activeProject.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="flex-1 overflow-y-auto p-6 pt-24 lg:p-20 w-full no-scrollbar"
            >
              <div className="max-w-4xl mx-auto">
                <header className="mb-12 lg:mb-16 flex flex-col lg:flex-row justify-between items-start gap-8">
                  <div>
                    <div className="flex flex-wrap items-baseline gap-4 mb-4 lg:mb-2">
                      <h2 className="text-4xl lg:text-6xl font-black tracking-tighter uppercase leading-none break-words">
                        {activeProject.name}
                      </h2>
                      <span className="text-xs font-mono text-[#888] uppercase tracking-widest">
                        ID: {activeProject.id.toString().padStart(4, '0')}
                      </span>
                    </div>
                    <div className="flex items-center gap-6">
                      <div className="flex flex-col">
                        <span className="text-[10px] font-bold uppercase tracking-widest text-[#888]">Client</span>
                        <span className="text-sm font-medium">{activeProject.client_name}</span>
                      </div>
                      <div className="w-px h-8 bg-[#E5E5E5]" />
                      <div className="flex flex-col">
                        <span className="text-[10px] font-bold uppercase tracking-widest text-[#888]">Status</span>
                        <span className="text-sm font-medium uppercase tracking-wider">{activeProject.status}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2 w-full lg:w-auto">
                    <button 
                      onClick={exportToHTML}
                      className="flex-1 lg:flex-none flex items-center justify-center gap-2 px-4 py-3 border border-[#E5E5E5] text-[10px] font-bold uppercase tracking-widest hover:bg-white transition-colors"
                    >
                      <Download size={14} /> HTML
                    </button>
                    <button 
                      onClick={() => window.print()}
                      className="flex-1 lg:flex-none flex items-center justify-center gap-2 px-4 py-3 bg-[#1A1A1A] text-white text-[10px] font-bold uppercase tracking-widest hover:bg-black transition-colors"
                    >
                      <Printer size={14} /> PDF
                    </button>
                  </div>
                </header>

                <div className="flex overflow-x-auto no-scrollbar border border-[#E5E5E5] bg-white mb-8 lg:mb-12 sticky top-16 lg:static z-20">
                  {sections.map(s => (
                    <button
                      key={s.id}
                      onClick={() => setActiveSection(s.id)}
                      className={`flex-shrink-0 flex flex-col items-center justify-center p-4 lg:p-6 border-r border-[#E5E5E5] last:border-r-0 transition-colors min-w-[80px] lg:min-w-0 lg:flex-1 ${
                        activeSection === s.id ? 'bg-[#1A1A1A] text-white' : 'hover:bg-[#F5F5F5]'
                      }`}
                    >
                      <s.icon size={18} strokeWidth={activeSection === s.id ? 2.5 : 1.5} />
                      <span className="text-[9px] font-bold uppercase tracking-tighter mt-2 text-center leading-none">
                        {s.label.split(' ')[0]}
                      </span>
                    </button>
                  ))}
                </div>

                <div className="bg-white border border-[#E5E5E5] p-6 lg:p-12 min-h-[400px]">
                  <div className="flex items-center justify-between mb-8 pb-4 border-b border-[#E5E5E5]">
                    <h3 className="text-xl lg:text-2xl font-black uppercase tracking-tight">
                      {sections.find(s => s.id === activeSection)?.label}
                    </h3>
                    <div className="hidden sm:block text-[10px] font-mono text-[#888]">
                      SYSTEM_LOG // {activeSection.toUpperCase()}
                    </div>
                  </div>

                  {activeSection === 'todo' && (
                    <TodoSection 
                      todos={projectData.todos} 
                      onAdd={addTodo} 
                      onToggle={toggleTodo} 
                    />
                  )}

                  {activeSection === 'hours' && (
                    <HoursSection 
                      hours={projectData.hours} 
                      onAdd={addHours} 
                    />
                  )}

                  {['requirements', 'overview', 'scope', 'billing', 'comms', 'qa', 'assets', 'progress'].includes(activeSection) && (
                    <div className="space-y-12">
                      <TextSection 
                        content={getSectionContent(activeSection)} 
                        onSave={(content) => updateSectionContent(activeSection, content)} 
                      />
                      
                      <div className="pt-12 border-t border-[#E5E5E5]">
                        <div className="flex items-center justify-between mb-6">
                          <h4 className="text-xs font-bold uppercase tracking-widest text-[#888]">Attached Assets</h4>
                          <label className="flex items-center gap-2 px-4 py-2 border border-[#E5E5E5] text-[10px] font-bold uppercase tracking-widest cursor-pointer hover:bg-[#F5F5F5] transition-colors">
                            <Upload size={14} /> Upload File
                            <input 
                              type="file" 
                              className="hidden" 
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) uploadFile(activeSection, file);
                              }}
                            />
                          </label>
                        </div>
                        
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                          {getSectionFiles(activeSection).map(file => (
                            <div key={file.id} className="group relative border border-[#E5E5E5] bg-[#F5F5F5] aspect-square overflow-hidden">
                              {file.mime_type.startsWith('image/') ? (
                                <img 
                                  src={`/uploads/${file.filename}`} 
                                  alt={file.original_name} 
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <div className="w-full h-full flex flex-col items-center justify-center p-4 text-center">
                                  <FileText size={32} className="text-[#888] mb-2" />
                                  <span className="text-[10px] font-bold uppercase tracking-tighter truncate w-full">{file.original_name}</span>
                                </div>
                              )}
                              <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4">
                                <a 
                                  href={`/uploads/${file.filename}`} 
                                  target="_blank" 
                                  rel="noreferrer"
                                  className="p-2 bg-white rounded-full hover:bg-[#F5F5F5] transition-colors"
                                >
                                  <Eye size={16} />
                                </a>
                                <button 
                                  onClick={() => deleteFile(file.id)}
                                  className="p-2 bg-white rounded-full hover:bg-red-50 transition-colors text-red-600"
                                >
                                  <X size={16} />
                                </button>
                              </div>
                            </div>
                          ))}
                          {getSectionFiles(activeSection).length === 0 && (
                            <div className="col-span-full py-12 border-2 border-dashed border-[#E5E5E5] flex flex-col items-center justify-center text-[10px] uppercase tracking-widest text-[#888]">
                              No assets uploaded for this section
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="home"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex-1 flex flex-col p-6 pt-24 sm:p-8 lg:p-16 lg:overflow-hidden max-w-6xl mx-auto w-full"
            >
              <div className="shrink-0 mb-8 sm:mb-12">
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6 sm:gap-12 mb-6">
                  <h2 className="text-4xl sm:text-7xl lg:text-9xl font-black tracking-tighter uppercase leading-[0.85] select-none">
                    Studio<br />Control
                  </h2>
                  <HomeScene className="w-20 h-20 sm:w-40 sm:h-40 lg:w-56 lg:h-56 -mt-2" />
                </div>
                
                <div className="flex flex-col sm:flex-row items-start sm:items-end justify-between gap-6">
                  <p className="text-[8px] sm:text-[10px] font-mono text-[#888] uppercase tracking-[0.3em] sm:tracking-[0.4em] max-w-md leading-relaxed select-none">
                    High-performance project management<br className="hidden sm:block" />
                    for the modern independent developer.
                  </p>
                  
                  {selectedHomeProject && (
                    <button 
                      onClick={() => {
                        setActiveProject(selectedHomeProject);
                        setShowCalculator(false);
                      }}
                      className="w-full sm:w-auto bg-[#1A1A1A] text-white px-8 sm:px-10 py-3 sm:py-4 text-xs sm:text-sm font-black uppercase tracking-widest hover:bg-black transition-all flex items-center justify-center gap-4 group shadow-2xl border border-white/10"
                    >
                      Proceed <ArrowRightLeft size={18} className="group-hover:translate-x-1 transition-transform" />
                    </button>
                  )}
                </div>
              </div>

              <div className="flex-1 min-h-0 relative">
                <AnimatePresence mode="wait">
                  {selectedHomeProject ? (
                    <motion.div 
                      key={selectedHomeProject.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="w-full h-full relative bg-[#F5F5F5] border border-[#E5E5E5] overflow-hidden shadow-2xl"
                    >
                      {selectedHomeProject.thumbnail ? (
                        <img 
                          src={`/uploads/${selectedHomeProject.thumbnail}`} 
                          alt={selectedHomeProject.name}
                          className="w-full h-full object-cover"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center text-[#333] p-4 text-center">
                          <LayoutDashboard size={48} sm:size={80} strokeWidth={1} className="mb-4 opacity-10" />
                          <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-[0.3em] opacity-30">No Project Visual</span>
                        </div>
                      )}
                      
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent pointer-events-none" />
                      
                      <div className="absolute bottom-6 left-6 sm:bottom-10 sm:left-10">
                        <div className="text-[9px] sm:text-[10px] font-bold text-white/50 uppercase tracking-[0.3em] sm:tracking-[0.4em] mb-2">Selected Project</div>
                        <h3 className="text-2xl sm:text-4xl lg:text-6xl font-black text-white uppercase tracking-tighter leading-none">
                          {selectedHomeProject.name}
                        </h3>
                      </div>
                    </motion.div>
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center border-2 border-dashed border-[#E5E5E5] p-8 text-center opacity-20">
                      <LayoutDashboard size={48} className="mb-4" />
                      <span className="text-[10px] font-bold uppercase tracking-[0.3em]">Initialize your first project to begin</span>
                    </div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Create Project Modal */}
      <AnimatePresence>
        {isCreating && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 modal-overlay">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white w-full max-w-md p-10 border border-[#E5E5E5]"
            >
              <h3 className="text-3xl font-black uppercase tracking-tighter mb-8">Initialize Project</h3>
              <form onSubmit={createProject} className="space-y-6">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-[#888] mb-2">Project Name</label>
                  <input 
                    autoFocus
                    required
                    type="text"
                    value={newProject.name}
                    onChange={e => setNewProject({...newProject, name: e.target.value})}
                    className="w-full p-4 border border-[#E5E5E5] text-sm focus:outline-none focus:border-[#1A1A1A] transition-colors"
                    placeholder="E.G. REDESIGN_2026"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-[#888] mb-2">Client Name</label>
                  <input 
                    required
                    type="text"
                    value={newProject.client_name}
                    onChange={e => setNewProject({...newProject, client_name: e.target.value})}
                    className="w-full p-4 border border-[#E5E5E5] text-sm focus:outline-none focus:border-[#1A1A1A] transition-colors"
                    placeholder="CLIENT_CORP"
                  />
                </div>
                <div className="flex gap-4 pt-4">
                  <button 
                    type="submit"
                    className="flex-1 bg-[#1A1A1A] text-white p-4 text-xs font-bold uppercase tracking-widest hover:bg-black transition-colors"
                  >
                    Create
                  </button>
                  <button 
                    type="button"
                    onClick={() => setIsCreating(false)}
                    className="flex-1 border border-[#E5E5E5] p-4 text-xs font-bold uppercase tracking-widest hover:bg-[#F5F5F5] transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Edit Project Modal */}
      <AnimatePresence>
        {isEditingProject && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 modal-overlay">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white w-full max-w-md p-10 border border-[#E5E5E5]"
            >
              <h3 className="text-3xl font-black uppercase tracking-tighter mb-8">Edit Project</h3>
              <form onSubmit={updateProject} className="space-y-6">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-[#888] mb-2">Project Name</label>
                  <input 
                    autoFocus
                    required
                    type="text"
                    value={editProjectData.name}
                    onChange={e => setEditProjectData({...editProjectData, name: e.target.value})}
                    className="w-full p-4 border border-[#E5E5E5] text-sm focus:outline-none focus:border-[#1A1A1A] transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-[#888] mb-2">Client Name</label>
                  <input 
                    required
                    type="text"
                    value={editProjectData.client_name}
                    onChange={e => setEditProjectData({...editProjectData, client_name: e.target.value})}
                    className="w-full p-4 border border-[#E5E5E5] text-sm focus:outline-none focus:border-[#1A1A1A] transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-[#888] mb-2">Status</label>
                  <select 
                    value={editProjectData.status}
                    onChange={e => setEditProjectData({...editProjectData, status: e.target.value})}
                    className="w-full p-4 border border-[#E5E5E5] text-sm focus:outline-none focus:border-[#1A1A1A] transition-colors appearance-none bg-white"
                  >
                    <option value="active">ACTIVE</option>
                    <option value="on-hold">ON-HOLD</option>
                    <option value="completed">COMPLETED</option>
                    <option value="archived">ARCHIVED</option>
                  </select>
                </div>
                <div className="flex gap-4 pt-4">
                  <button 
                    type="submit"
                    className="flex-1 bg-[#1A1A1A] text-white p-4 text-xs font-bold uppercase tracking-widest hover:bg-black transition-colors"
                  >
                    Save Changes
                  </button>
                  <button 
                    type="button"
                    onClick={() => setIsEditingProject(false)}
                    className="flex-1 border border-[#E5E5E5] p-4 text-xs font-bold uppercase tracking-widest hover:bg-[#F5F5F5] transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

function TextSection({ content, onSave }: { content: string, onSave: (val: string) => void }) {
  const [val, setVal] = useState(content);
  
  useEffect(() => {
    setVal(content);
  }, [content]);

  return (
    <div className="space-y-6">
      <textarea
        value={val}
        onChange={e => setVal(e.target.value)}
        className="w-full min-h-[400px] p-6 border border-[#E5E5E5] font-mono text-sm leading-relaxed focus:outline-none focus:border-[#1A1A1A] transition-colors resize-none"
        placeholder="ENTER_DATA_HERE..."
      />
      <div className="flex justify-end">
        <button 
          onClick={() => onSave(val)}
          className="bg-[#1A1A1A] text-white px-8 py-3 text-xs font-bold uppercase tracking-widest hover:bg-black transition-colors"
        >
          Commit Changes
        </button>
      </div>
    </div>
  );
}

function TodoSection({ todos, onAdd, onToggle }: { todos: Todo[], onAdd: (t: string) => void, onToggle: (id: number, s: string) => void }) {
  const [newTask, setNewTask] = useState('');

  return (
    <div className="space-y-8">
      <div className="flex gap-2">
        <input 
          type="text"
          value={newTask}
          onChange={e => setNewTask(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && newTask) { onAdd(newTask); setNewTask(''); } }}
          className="flex-1 p-4 border border-[#E5E5E5] text-sm focus:outline-none focus:border-[#1A1A1A]"
          placeholder="ADD_NEW_TASK..."
        />
        <button 
          onClick={() => { if (newTask) { onAdd(newTask); setNewTask(''); } }}
          className="bg-[#1A1A1A] text-white px-6 hover:bg-black transition-colors"
        >
          <Plus size={18} />
        </button>
      </div>

      <div className="space-y-px bg-[#E5E5E5] border border-[#E5E5E5]">
        {todos.length === 0 ? (
          <div className="bg-white p-8 text-center text-[10px] uppercase tracking-widest text-[#888]">No pending tasks</div>
        ) : (
          todos.map(todo => (
            <div key={todo.id} className="bg-white p-4 flex items-center gap-4 group">
              <button 
                onClick={() => onToggle(todo.id, todo.status)}
                className={`w-5 h-5 border flex items-center justify-center transition-colors ${
                  todo.status === 'completed' ? 'bg-[#1A1A1A] border-[#1A1A1A]' : 'border-[#E5E5E5] hover:border-[#1A1A1A]'
                }`}
              >
                {todo.status === 'completed' && <Plus size={12} className="text-white rotate-45" />}
              </button>
              <span className={`text-sm font-medium ${todo.status === 'completed' ? 'line-through text-[#888]' : ''}`}>
                {todo.task}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function FreelanceCalculator() {
  const [activeTab, setActiveTab] = useState<'breakeven' | 'market'>('breakeven');
  
  // Break-Even State
  const [breakeven, setBreakeven] = useState({
    monthlyLiving: 3000,
    monthlyBusiness: 500,
    expectedProjects: 2,
    taxRate: 25
  });

  // Market Comparison State
  const [market, setMarket] = useState({
    taskName: 'Full Stack Website',
    goingRate: 5000,
    clientBudget: 4000,
    yourQuote: 4500
  });

  // Calculations
  const totalMonthlyOverhead = breakeven.monthlyLiving + breakeven.monthlyBusiness;
  const overheadWithTax = totalMonthlyOverhead / (1 - (breakeven.taxRate / 100));
  const breakEvenPerProject = overheadWithTax / (breakeven.expectedProjects || 1);

  const budgetDelta = market.clientBudget - market.yourQuote;
  const marketDelta = market.goingRate - market.yourQuote;
  const breakEvenDelta = market.yourQuote - breakEvenPerProject;

  return (
    <div className="space-y-12">
      <header className="mb-12 lg:mb-16">
        <h2 className="text-4xl lg:text-6xl font-black tracking-tighter uppercase leading-none mb-4">
          Dev Strategy Calc
        </h2>
        <div className="flex gap-8 border-b border-[#E5E5E5]">
          <button 
            onClick={() => setActiveTab('breakeven')}
            className={`pb-4 text-[10px] font-bold uppercase tracking-[0.2em] transition-all relative ${
              activeTab === 'breakeven' ? 'text-[#1A1A1A]' : 'text-[#888] hover:text-[#1A1A1A]'
            }`}
          >
            Break-Even Analysis
            {activeTab === 'breakeven' && <motion.div layoutId="calcTab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#1A1A1A]" />}
          </button>
          <button 
            onClick={() => setActiveTab('market')}
            className={`pb-4 text-[10px] font-bold uppercase tracking-[0.2em] transition-all relative ${
              activeTab === 'market' ? 'text-[#1A1A1A]' : 'text-[#888] hover:text-[#1A1A1A]'
            }`}
          >
            Market Comparison
            {activeTab === 'market' && <motion.div layoutId="calcTab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#1A1A1A]" />}
          </button>
        </div>
      </header>

      {activeTab === 'breakeven' ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          <div className="space-y-8 bg-white border border-[#E5E5E5] p-8 lg:p-12">
            <h3 className="text-xl font-black uppercase tracking-tight border-b border-[#E5E5E5] pb-4 mb-6">Overhead & Volume</h3>
            
            <div className="space-y-6">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest text-[#888] mb-2">Monthly Living Expenses</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#888]">$</span>
                  <input 
                    type="number"
                    value={breakeven.monthlyLiving}
                    onChange={e => setBreakeven({...breakeven, monthlyLiving: parseFloat(e.target.value) || 0})}
                    className="w-full p-4 pl-8 border border-[#E5E5E5] text-sm focus:outline-none focus:border-[#1A1A1A]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest text-[#888] mb-2">Monthly Business Overhead</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#888]">$</span>
                  <input 
                    type="number"
                    value={breakeven.monthlyBusiness}
                    onChange={e => setBreakeven({...breakeven, monthlyBusiness: parseFloat(e.target.value) || 0})}
                    className="w-full p-4 pl-8 border border-[#E5E5E5] text-sm focus:outline-none focus:border-[#1A1A1A]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-[#888] mb-2">Expected Projects / Mo</label>
                  <input 
                    type="number"
                    value={breakeven.expectedProjects}
                    onChange={e => setBreakeven({...breakeven, expectedProjects: parseFloat(e.target.value) || 0})}
                    className="w-full p-4 border border-[#E5E5E5] text-sm focus:outline-none focus:border-[#1A1A1A]"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-[#888] mb-2">Tax Reserve (%)</label>
                  <input 
                    type="number"
                    value={breakeven.taxRate}
                    onChange={e => setBreakeven({...breakeven, taxRate: parseFloat(e.target.value) || 0})}
                    className="w-full p-4 border border-[#E5E5E5] text-sm focus:outline-none focus:border-[#1A1A1A]"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-8">
            <div className="bg-[#1A1A1A] text-white p-8 lg:p-12 border border-[#1A1A1A]">
              <h3 className="text-[10px] font-bold uppercase tracking-[0.3em] text-[#888] mb-8">Break-Even Per Project</h3>
              <div className="text-7xl lg:text-8xl font-black tracking-tighter mb-4">
                ${Math.ceil(breakEvenPerProject).toLocaleString()}
              </div>
              <p className="text-xs font-mono text-[#888] uppercase tracking-widest">
                Minimum quote to cover overhead & taxes
              </p>
            </div>

            <div className="bg-white border border-[#E5E5E5] p-8">
              <h4 className="text-[10px] font-bold uppercase tracking-widest text-[#888] mb-6 border-b border-[#F5F5F5] pb-2">Monthly Financial Goal</h4>
              <div className="space-y-4">
                <div className="flex justify-between text-sm">
                  <span className="text-[#888]">Net Overhead</span>
                  <span className="font-bold">${totalMonthlyOverhead.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-[#888]">Tax Liability</span>
                  <span className="font-bold">${Math.ceil(overheadWithTax - totalMonthlyOverhead).toLocaleString()}</span>
                </div>
                <div className="pt-4 border-t border-[#F5F5F5] flex justify-between text-lg font-black uppercase">
                  <span>Gross Needed</span>
                  <span>${Math.ceil(overheadWithTax).toLocaleString()}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          <div className="space-y-8 bg-white border border-[#E5E5E5] p-8 lg:p-12">
            <h3 className="text-xl font-black uppercase tracking-tight border-b border-[#E5E5E5] pb-4 mb-6">Market Context</h3>
            
            <div className="space-y-6">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest text-[#888] mb-2">Current Task / Service</label>
                <input 
                  type="text"
                  value={market.taskName}
                  onChange={e => setMarket({...market, taskName: e.target.value})}
                  className="w-full p-4 border border-[#E5E5E5] text-sm focus:outline-none focus:border-[#1A1A1A]"
                  placeholder="E.G. LANDING PAGE"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-[#888] mb-2">Market Going Rate</label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#888]">$</span>
                    <input 
                      type="number"
                      value={market.goingRate}
                      onChange={e => setMarket({...market, goingRate: parseFloat(e.target.value) || 0})}
                      className="w-full p-4 pl-8 border border-[#E5E5E5] text-sm focus:outline-none focus:border-[#1A1A1A]"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-[#888] mb-2">Client Budget</label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#888]">$</span>
                    <input 
                      type="number"
                      value={market.clientBudget}
                      onChange={e => setMarket({...market, clientBudget: parseFloat(e.target.value) || 0})}
                      className="w-full p-4 pl-8 border border-[#E5E5E5] text-sm focus:outline-none focus:border-[#1A1A1A]"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest text-[#888] mb-2">Your Proposed Quote</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#888]">$</span>
                  <input 
                    type="number"
                    value={market.yourQuote}
                    onChange={e => setMarket({...market, yourQuote: parseFloat(e.target.value) || 0})}
                    className="w-full p-4 pl-8 border border-[#E5E5E5] text-sm focus:outline-none focus:border-[#1A1A1A]"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-8">
            <div className={`p-8 lg:p-12 border ${breakEvenDelta >= 0 ? 'bg-white border-[#E5E5E5]' : 'bg-red-50 border-red-200'}`}>
              <h3 className="text-[10px] font-bold uppercase tracking-[0.3em] text-[#888] mb-8">Profitability Analysis</h3>
              
              <div className="space-y-6">
                <div className="flex justify-between items-end">
                  <div>
                    <div className="text-[8px] font-bold uppercase tracking-widest text-[#888]">Vs. Break-Even</div>
                    <div className={`text-3xl font-black ${breakEvenDelta >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {breakEvenDelta >= 0 ? '+' : ''}${breakEvenDelta.toLocaleString()}
                    </div>
                  </div>
                  <div className="text-[10px] font-mono text-[#888]">
                    {breakEvenDelta >= 0 ? 'VIABLE' : 'UNSUSTAINABLE'}
                  </div>
                </div>

                <div className="flex justify-between items-end">
                  <div>
                    <div className="text-[8px] font-bold uppercase tracking-widest text-[#888]">Vs. Market Rate</div>
                    <div className={`text-3xl font-black ${marketDelta >= 0 ? 'text-blue-600' : 'text-orange-600'}`}>
                      {marketDelta >= 0 ? 'UNDER' : 'OVER'} ${Math.abs(marketDelta).toLocaleString()}
                    </div>
                  </div>
                  <div className="text-[10px] font-mono text-[#888]">
                    {marketDelta >= 0 ? 'COMPETITIVE' : 'PREMIUM'}
                  </div>
                </div>

                <div className="flex justify-between items-end">
                  <div>
                    <div className="text-[8px] font-bold uppercase tracking-widest text-[#888]">Vs. Client Budget</div>
                    <div className={`text-3xl font-black ${budgetDelta >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {budgetDelta >= 0 ? 'WITHIN' : 'OVER'} ${Math.abs(budgetDelta).toLocaleString()}
                    </div>
                  </div>
                  <div className="text-[10px] font-mono text-[#888]">
                    {budgetDelta >= 0 ? 'AFFORDABLE' : 'NEGOTIATION REQ.'}
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-[#1A1A1A] text-white p-8">
              <p className="text-[10px] font-mono leading-relaxed opacity-60">
                STRATEGY_ADVISORY // 
                {breakEvenDelta < 0 ? " WARNING: Quote is below break-even. You are losing money on this project." : 
                 budgetDelta < 0 ? " WARNING: Quote exceeds client budget. Highlight premium value or reduce scope." :
                 " Project is financially viable and within market norms."}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function HoursSection({ hours, onAdd }: { hours: HourEntry[], onAdd: (e: any) => void }) {
  const [entry, setEntry] = useState({ date: new Date().toISOString().split('T')[0], duration: '', description: '' });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!entry.duration || !entry.description) return;
    onAdd({ ...entry, duration: parseFloat(entry.duration) });
    setEntry({ ...entry, duration: '', description: '' });
  };

  const totalHours = hours.reduce((acc, h) => acc + h.duration, 0);

  return (
    <div className="space-y-12">
      <form onSubmit={handleSubmit} className="flex flex-col gap-2">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <input 
            type="date"
            value={entry.date}
            onChange={e => setEntry({...entry, date: e.target.value})}
            className="p-4 border border-[#E5E5E5] text-sm focus:outline-none focus:border-[#1A1A1A]"
          />
          <input 
            type="number"
            step="0.25"
            value={entry.duration}
            onChange={e => setEntry({...entry, duration: e.target.value})}
            className="p-4 border border-[#E5E5E5] text-sm focus:outline-none focus:border-[#1A1A1A]"
            placeholder="HRS (E.G. 2.5)"
          />
        </div>
        <input 
          type="text"
          value={entry.description}
          onChange={e => setEntry({...entry, description: e.target.value})}
          className="p-4 border border-[#E5E5E5] text-sm focus:outline-none focus:border-[#1A1A1A]"
          placeholder="DESCRIPTION..."
        />
        <button 
          type="submit"
          className="bg-[#1A1A1A] text-white p-4 text-xs font-bold uppercase tracking-widest hover:bg-black transition-colors"
        >
          Log Hours
        </button>
      </form>

      <div className="border border-[#E5E5E5] overflow-x-auto">
        <table className="w-full text-left border-collapse min-w-[500px]">
          <thead>
            <tr className="bg-[#F5F5F5] border-b border-[#E5E5E5]">
              <th className="p-4 text-[10px] font-bold uppercase tracking-widest text-[#888]">Date</th>
              <th className="p-4 text-[10px] font-bold uppercase tracking-widest text-[#888]">Duration</th>
              <th className="p-4 text-[10px] font-bold uppercase tracking-widest text-[#888]">Description</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#E5E5E5]">
            {hours.map(h => (
              <tr key={h.id} className="text-sm">
                <td className="p-4 font-mono text-xs">{h.date}</td>
                <td className="p-4 font-bold">{h.duration.toFixed(2)}h</td>
                <td className="p-4 text-[#555]">{h.description}</td>
              </tr>
            ))}
            {hours.length === 0 && (
              <tr>
                <td colSpan={3} className="p-12 text-center text-[10px] uppercase tracking-widest text-[#888]">No hours logged yet</td>
              </tr>
            )}
          </tbody>
          <tfoot>
            <tr className="bg-[#1A1A1A] text-white">
              <td className="p-4 text-[10px] font-bold uppercase tracking-widest">Total</td>
              <td className="p-4 font-black text-lg">{totalHours.toFixed(2)}h</td>
              <td className="p-4"></td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
