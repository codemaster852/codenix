import React, { useState, useEffect, useRef } from "react";
import { Task, SharedFile, UpdatePost, QuestionItem } from "../types";
import {
  LogOut,
  Plus,
  Compass,
  FileDown,
  Upload,
  PieChart as LucidePieChart,
  HelpCircle,
  Megaphone,
  CheckCircle,
  Clock,
  Briefcase,
  User,
  ShieldCheck,
  TrendingUp,
  AlertOctagon,
  RefreshCw,
  FolderOpen,
  ArrowRight,
  BrainCircuit,
  MessageSquare,
  FileSpreadsheet,
  Download
} from "lucide-react";
import { motion } from "motion/react";

interface DashboardProps {
  session: {
    groupId: string;
    companyName: string;
    role: "leader" | "worker";
    workerName: string;
  };
  onLogout: () => void;
}

export default function Dashboard({ session, onLogout }: DashboardProps) {
  // Sync Data State
  const [tasks, setTasks] = useState<Task[]>([]);
  const [files, setFiles] = useState<SharedFile[]>([]);
  const [updates, setUpdates] = useState<UpdatePost[]>([]);
  const [questions, setQuestions] = useState<QuestionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [autoSync, setAutoSync] = useState(true);
  const [activeTab, setActiveTab] = useState<"tasks" | "analytics" | "files" | "updates" | "questions">("tasks");

  // Leader Actions Form state
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newTaskDesc, setNewTaskDesc] = useState("");
  const [newTaskPriority, setNewTaskPriority] = useState<"low" | "medium" | "high">("medium");
  const [newTaskDueDate, setNewTaskDueDate] = useState("");

  const [newUpdateTitle, setNewUpdateTitle] = useState("");
  const [newUpdateContent, setNewUpdateContent] = useState("");
  const [newUpdateUrgent, setNewUpdateUrgent] = useState(false);

  // Worker Action State
  const [newQuestionText, setNewQuestionText] = useState("");
  const [activeCompletingTask, setActiveCompletingTask] = useState<Task | null>(null);
  const [completionNotes, setCompletionNotes] = useState("");
  const [completionFeedback, setCompletionFeedback] = useState("");

  // Leader answering state
  const [activeAnsweringQuestion, setActiveAnsweringQuestion] = useState<QuestionItem | null>(null);
  const [leaderAnswerText, setLeaderAnswerText] = useState("");

  // AI Generation text / reports
  const [aiReport, setAiReport] = useState<string | null>(null);
  const [aiGenerating, setAiGenerating] = useState(false);

  // File drag & drop file state
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Notifications
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" | "info" } | null>(null);

  const triggerToast = (message: string, type: "success" | "error" | "info" = "success") => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 4500);
  };

  // Sync / load all data
  const loadGroupDetails = async (showSilently = false) => {
    if (!showSilently) setLoading(true);
    try {
      const res = await fetch(`/api/groups/${session.groupId}/data`);
      const data = await res.json();
      if (data.success) {
        setTasks(data.tasks || []);
        setFiles(data.files || []);
        setUpdates(data.updates || []);
        setQuestions(data.questions || []);
      } else {
        triggerToast("Failed to fetch latest channel progress", "error");
      }
    } catch (e) {
      console.error(e);
      triggerToast("Network update latency detected", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadGroupDetails();
  }, [session.groupId]);

  // Sync regularly (Polling)
  useEffect(() => {
    if (!autoSync) return;
    const t = setInterval(() => {
      loadGroupDetails(true);
    }, 5500);
    return () => clearInterval(t);
  }, [autoSync, session.groupId]);

  // --- LEADER ACTION: ADD TASK ---
  const handleAddTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;

    try {
      const res = await fetch("/api/tasks/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          groupId: session.groupId,
          title: newTaskTitle.trim(),
          description: newTaskDesc.trim(),
          priority: newTaskPriority,
          dueDate: newTaskDueDate || new Date().toISOString().split("T")[0],
        }),
      });
      const data = await res.json();
      if (data.success) {
        triggerToast(`Task "${newTaskTitle}" dispatched to workers!`);
        setNewTaskTitle("");
        setNewTaskDesc("");
        setNewTaskPriority("medium");
        setNewTaskDueDate("");
        loadGroupDetails(true);
      } else {
        triggerToast(data.error || "Failed to delegate task", "error");
      }
    } catch (err) {
      triggerToast("Failed to communicate with Nixus backend", "error");
    }
  };

  // --- LEADER ACTION: BROADCAST UPDATE ---
  const handleAddUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUpdateTitle.trim() || !newUpdateContent.trim()) return;

    try {
      const res = await fetch("/api/updates/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          groupId: session.groupId,
          title: newUpdateTitle.trim(),
          content: newUpdateContent.trim(),
          author: "Leader",
          isUrgent: newUpdateUrgent,
        }),
      });
      const data = await res.json();
      if (data.success) {
        triggerToast("Company update posted to live feed!");
        setNewUpdateTitle("");
        setNewUpdateContent("");
        setNewUpdateUrgent(false);
        loadGroupDetails(true);
      } else {
        triggerToast("Failed to dispatch broadcast", "error");
      }
    } catch (err) {
      triggerToast("Failed to save bulletin", "error");
    }
  };

  // --- LEADER ACTION: ANSWER QUESTION ---
  const handleAnswerQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeAnsweringQuestion || !leaderAnswerText.trim()) return;

    try {
      const res = await fetch("/api/questions/answer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          groupId: session.groupId,
          questionId: activeAnsweringQuestion.id,
          answerText: leaderAnswerText.trim(),
        }),
      });
      const data = await res.json();
      if (data.success) {
        triggerToast(`Replied to ${activeAnsweringQuestion.workerName}'s inquiry`);
        setActiveAnsweringQuestion(null);
        setLeaderAnswerText("");
        loadGroupDetails(true);
      } else {
        triggerToast("Failed to register answer", "error");
      }
    } catch (err) {
      triggerToast("Error resolving worker ticket", "error");
    }
  };

  // --- LEADER ACTION: DISMISS CLAIM (RELEASE TASK) ---
  const handleReleaseTask = async (taskId: string) => {
    if (!confirm("Are you sure you want to unassign this worker from this task?")) return;
    try {
      const res = await fetch("/api/tasks/unclaim", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          groupId: session.groupId,
          taskId,
        }),
      });
      const data = await res.json();
      if (data.success) {
        triggerToast("Task set back to pending pool.");
        loadGroupDetails(true);
      }
    } catch (e) {
      triggerToast("Network link failed", "error");
    }
  };

  // --- WORKER ACTION: CLAIM TASK ---
  const handleClaimTask = async (taskId: string) => {
    try {
      const res = await fetch("/api/tasks/claim", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          groupId: session.groupId,
          taskId,
          workerName: session.workerName,
        }),
      });
      const data = await res.json();
      if (data.success) {
        triggerToast("You've successfully claimed this task! It's added to your workspace.");
        loadGroupDetails(true);
      } else {
        triggerToast(data.error || "Unable to claim task", "error");
      }
    } catch (e) {
      triggerToast("Server connection error", "error");
    }
  };

  // --- WORKER ACTION: SUBMIT INQUIRY ---
  const handleAddQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newQuestionText.trim()) return;

    try {
      const res = await fetch("/api/questions/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          groupId: session.groupId,
          workerName: session.workerName,
          questionText: newQuestionText.trim(),
        }),
      });
      const data = await res.json();
      if (data.success) {
        triggerToast("Your question was catalogued! The leader can now see and answer it.");
        setNewQuestionText("");
        loadGroupDetails(true);
      } else {
        triggerToast("Failed to post question", "error");
      }
    } catch (err) {
      triggerToast("Network disconnect", "error");
    }
  };

  // --- WORKER ACTION: SUBMIT FINALIZE TASK ---
  const handleCompleteTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeCompletingTask) return;

    try {
      const res = await fetch("/api/tasks/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          groupId: session.groupId,
          taskId: activeCompletingTask.id,
          completionNotes: completionNotes.trim(),
          workerFeedback: completionFeedback.trim(),
        }),
      });
      const data = await res.json();
      if (data.success) {
        triggerToast(`Successfully completed: "${activeCompletingTask.title}"! Excellent job.`);
        setActiveCompletingTask(null);
        setCompletionNotes("");
        setCompletionFeedback("");
        loadGroupDetails(true);
      } else {
        triggerToast("Failed to finalize task", "error");
      }
    } catch (err) {
      triggerToast("Error matching server logs", "error");
    }
  };

  // --- FILE HANDLING: UPLOAD PROCESS ---
  const processFileUpload = async (file: File) => {
    const reader = new FileReader();
    reader.onload = async () => {
      const base64Content = reader.result as string;
      const formattedSize =
        file.size > 1024 * 1024
          ? `${(file.size / (1024 * 1024)).toFixed(1)} MB`
          : `${(file.size / 1024).toFixed(0)} KB`;

      try {
        const res = await fetch("/api/files/upload", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            groupId: session.groupId,
            name: file.name,
            size: formattedSize,
            type: file.type || "application/octet-stream",
            uploadedBy: session.role === "leader" ? "Leader" : session.workerName,
            fileDataUrl: base64Content,
          }),
        });
        const data = await res.json();
        if (data.success) {
          triggerToast(`Successfully saved "${file.name}" to team repository!`);
          loadGroupDetails(true);
        } else {
          triggerToast("Cloud limits rejected file upload", "error");
        }
      } catch (err) {
        triggerToast("Error conveying file telemetry", "error");
      }
    };
    reader.readAsDataURL(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const droppedFile = e.dataTransfer.files[0];
      processFileUpload(droppedFile);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processFileUpload(e.target.files[0]);
    }
  };

  const triggerDownload = async (fileItem: SharedFile) => {
    try {
      // Increment stats
      await fetch("/api/files/download-increment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ groupId: session.groupId, fileId: fileItem.id }),
      });
      loadGroupDetails(true);

      // Create browser standard anchor triggers
      if (fileItem.fileDataUrl) {
        const dLink = document.createElement("a");
        dLink.href = fileItem.fileDataUrl;
        dLink.download = fileItem.name;
        document.body.appendChild(dLink);
        dLink.click();
        document.body.removeChild(dLink);
        triggerToast(`Downloaded ${fileItem.name}`);
      } else {
        // Fallback for demo seed file format (create a dummy txt)
        const dummyBlob = new Blob([`Virtual Cloud File: ${fileItem.name}\nSize: ${fileItem.size}\nRepository Secure Hash Index: SHA-NIX-256`], { type: "text/plain" });
        const dummyUrl = URL.createObjectURL(dummyBlob);
        const dLink = document.createElement("a");
        dLink.href = dummyUrl;
        dLink.download = fileItem.name;
        document.body.appendChild(dLink);
        dLink.click();
        document.body.removeChild(dLink);
        triggerToast(`Rendered virtual package download!`);
      }
    } catch {
      triggerToast("File system access rejected", "error");
    }
  };

  // --- GEMINI CORE REPORT PROCESS ---
  const runAIEngineAnalysis = async () => {
    setAiGenerating(true);
    setAiReport(null);
    try {
      const res = await fetch("/api/gemini/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ groupId: session.groupId }),
      });
      const data = await res.json();
      if (data.success) {
        setAiReport(data.feedback);
        triggerToast("Nixus Gemini Engine analysis compiled!", "info");
      } else {
        triggerToast("Failed to compile AI insights", "error");
      }
    } catch (err) {
      triggerToast("AI server unavailable", "error");
    } finally {
      setAiGenerating(false);
    }
  };

  // Pre-calculate Metrics Matrix for Dashboard Core
  const totalTasksCount = tasks.length;
  const pendingTasks = tasks.filter((t) => t.status === "pending");
  const claimedTasks = tasks.filter((t) => t.status === "claimed");
  const completedTasks = tasks.filter((t) => t.status === "completed");

  const completionRate = totalTasksCount ? Math.round((completedTasks.length / totalTasksCount) * 100) : 0;
  const uniqueWorkersList = Array.from(new Set(tasks.map((t) => t.assignedWorkerName).filter(Boolean))) as string[];
  const unrepliedQuestions = questions.filter((q) => !q.answerText).length;

  // Render priority class names badge
  const renderPriorityBadge = (p: string) => {
    const common = "text-[10px] uppercase tracking-wider font-extrabold px-2.5 py-1 rounded-full border ";
    if (p === "high") return <span className={`${common} bg-rose-500/10 border-rose-500/20 text-rose-400`}>High Tier</span>;
    if (p === "medium") return <span className={`${common} bg-amber-500/10 border-amber-500/20 text-amber-400`}>Medium Tier</span>;
    return <span className={`${common} bg-emerald-500/10 border-emerald-500/20 text-emerald-400`}>Low Tier</span>;
  };

  return (
    <div className="min-h-screen bg-[#070a13] text-gray-200 font-sans flex flex-col relative overflow-hidden">
      
      {/* Decorative Orbs to make it look highly professional and distinctive */}
      <div className="absolute top-0 right-0 w-[450px] h-[450px] bg-emerald-500/5 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-10 left-0 w-[550px] h-[550px] bg-blue-500/5 rounded-full blur-[150px] pointer-events-none" />

      {/* Floating System Messages / Toasts */}
      {toast && (
        <div className="fixed top-5 right-5 z-50 animate-[fadeIn_0.3s_ease] max-w-sm">
          <div className={`p-4 gap-3 shadow-2xl rounded-2xl border flex items-start ${
            toast.type === "error"
              ? "bg-rose-950/90 border-rose-500/30 text-rose-200"
              : toast.type === "info"
              ? "bg-blue-950/90 border-blue-500/30 text-blue-200"
              : "bg-emerald-950/90 border-emerald-500/30 text-emerald-200"
          }`}>
            <AlertOctagon className={`h-5 w-5 ${
              toast.type === "error" ? "text-rose-400" : toast.type === "info" ? "text-blue-400" : "text-emerald-400"
            }`} />
            <div className="text-xs font-semibold leading-normal">{toast.message}</div>
          </div>
        </div>
      )}

      {/* Primary Dashboard Header */}
      <header className="border-b border-gray-800 bg-[#0b0f19]/80 backdrop-blur-xl sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex justify-between items-center">
          <div className="flex items-center space-x-3">
            <span className="p-2.5 bg-gradient-to-tr from-emerald-500/20 to-blue-500/10 border border-emerald-500/35 rounded-xl text-emerald-400">
              <Compass className="h-6 w-6 animate-spin-slow" />
            </span>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-gray-400 text-xs font-mono uppercase tracking-widest">Nixus Core</span>
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              </div>
              <h1 className="text-lg font-bold font-display tracking-tight text-white flex items-center gap-1.5">
                {session.companyName} <span className="text-xs text-emerald-400 font-mono">({session.groupId})</span>
              </h1>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            {/* Realtime telemetry widget */}
            <button
              onClick={() => loadGroupDetails(false)}
              className="p-2 hover:bg-gray-800 rounded-lg text-gray-400 hover:text-white transition-colors flex items-center gap-1 text-xs"
              title="Manually force database check"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              <span className="hidden sm:inline font-mono">Sync</span>
            </button>

            {/* Profile Info badge */}
            <div className="hidden sm:flex items-center space-x-2 bg-gray-900/90 border border-gray-800 px-3.5 py-1.5 rounded-xl">
              {session.role === "leader" ? (
                <ShieldCheck className="h-4 w-4 text-emerald-400" />
              ) : (
                <User className="h-4 w-4 text-emerald-400" />
              )}
              <span className="text-xs font-semibold text-gray-200">
                {session.workerName} <span className="text-[10px] text-gray-500 font-mono capitalize">({session.role})</span>
              </span>
            </div>

            <button
              onClick={onLogout}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/25 rounded-xl text-rose-400 text-xs font-bold transition-all"
            >
              <LogOut className="h-3.5 w-3.5" />
              Exit
            </button>
          </div>
        </div>
      </header>

      {/* Main Container Layout */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        
        {/* Core Live Analytics Row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="bg-[#0f1424] border border-gray-800 rounded-2xl p-4 scale-card-hover relative overflow-hidden">
            <div className="text-gray-500 text-[11px] uppercase tracking-wider font-semibold font-mono">Tasks Complete Rate</div>
            <div className="text-2xl font-bold text-white mt-1 flex items-baseline font-display">
              {completionRate}%
              <span className="text-[10px] text-emerald-400 ml-1.5 font-mono">({completedTasks.length} / {totalTasksCount})</span>
            </div>
            {/* Visual Mini Progress Bar */}
            <div className="w-full bg-gray-800 h-1.5 rounded-full mt-3 overflow-hidden">
              <div className="bg-emerald-400 h-1.5 rounded-full" style={{ width: `${completionRate}%` }} />
            </div>
            <TrendingUp className="absolute right-3.5 top-3.5 h-10 w-10 text-emerald-500/10 pointer-events-none" />
          </div>

          <div className="bg-[#0f1424] border border-gray-800 rounded-2xl p-4 scale-card-hover relative overflow-hidden">
            <div className="text-gray-500 text-[11px] uppercase tracking-wider font-semibold font-mono">Task Status Pool</div>
            <div className="mt-2 text-xs flex justify-between gap-1">
              <div className="text-center flex-1 bg-yellow-500/10 p-1.5 rounded-lg border border-yellow-500/10">
                <div className="font-mono text-yellow-400 font-bold">{pendingTasks.length}</div>
                <div className="text-[9px] text-gray-500">Unclaimed</div>
              </div>
              <div className="text-center flex-1 bg-blue-500/10 p-1.5 rounded-lg border border-blue-500/10">
                <div className="font-mono text-blue-400 font-bold">{claimedTasks.length}</div>
                <div className="text-[9px] text-gray-500">Active</div>
              </div>
              <div className="text-center flex-1 bg-emerald-500/10 p-1.5 rounded-lg border border-emerald-500/10">
                <div className="font-mono text-emerald-400 font-bold">{completedTasks.length}</div>
                <div className="text-[9px] text-gray-500">Done</div>
              </div>
            </div>
            <Briefcase className="absolute right-2 top-2 h-10 w-10 text-blue-500/5 pointer-events-none" />
          </div>

          <div className="bg-[#0f1424] border border-gray-800 rounded-2xl p-4 scale-card-hover relative overflow-hidden">
            <div className="text-gray-500 text-[11px] uppercase tracking-wider font-semibold font-mono">Active Labor Group</div>
            <div className="text-2xl font-bold text-white mt-1 font-display">
              {uniqueWorkersList.length || 1} <span className="text-xs text-gray-400 font-sans font-normal">Team Members</span>
            </div>
            <div className="text-[10px] text-gray-400 mt-2 truncate font-mono">
              {uniqueWorkersList.length > 0 ? uniqueWorkersList.join(", ") : "Waiting for claims..."}
            </div>
            <User className="absolute right-3.5 top-3.5 h-10 w-10 text-indigo-500/10 pointer-events-none" />
          </div>

          <div className="bg-[#0f1424] border border-gray-800 rounded-2xl p-4 scale-card-hover relative overflow-hidden">
            <div className="text-gray-500 text-[11px] uppercase tracking-wider font-semibold font-mono">Team Support Channel</div>
            <div className="text-2xl font-bold text-white mt-1 font-display flex items-baseline">
              {unrepliedQuestions} 
              <span className="text-xs text-amber-400 font-medium ml-1 bg-amber-950/50 px-1.5 py-0.5 rounded border border-amber-900/40">Pending</span>
            </div>
            <div className="text-[10px] text-gray-400 mt-2 flex items-center gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
              <span>Total Q&As resolved: {questions.filter(q => q.answerText).length}</span>
            </div>
            <HelpCircle className="absolute right-3.5 top-3.5 h-10 w-10 text-amber-500/10 pointer-events-none" />
          </div>
        </div>

        {/* Global Urgent Broadcast ticker if present */}
        {updates.some((u) => u.isUrgent) && (
          <div className="mb-6 p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center justify-between animate-pulse">
            <div className="flex items-center space-x-2">
              <Megaphone className="h-5 w-5 text-rose-400 animate-bounce" />
              <div className="font-semibold uppercase tracking-wider text-rose-400 font-mono text-[10px] bg-rose-950 px-2 py-0.5 rounded-md border border-rose-900">URGENT BULLET</div>
              <p className="font-semibold text-gray-100 italic truncate">
                &quot;{updates.find((u) => u.isUrgent)?.title}&quot; — {updates.find((u) => u.isUrgent)?.content}
              </p>
            </div>
            <button
              onClick={() => setActiveTab("updates")}
              className="text-xs font-bold text-rose-300 hover:text-white underline ml-4 flex items-center shrink-0"
            >
              Open Bulletins
              <ArrowRight className="h-3 w-3 ml-1" />
            </button>
          </div>
        )}

        {/* Floating View Tabs */}
        <div className="flex space-x-2 overflow-x-auto pb-3.5 mb-6 scrollbar-thin border-b border-gray-800">
          {[
            { id: "tasks", label: "Tasks Command Lobby", icon: Briefcase },
            { id: "analytics", label: "Executive Analytics & AI", icon: LucidePieChart },
            { id: "files", label: "Doc Storage Box", icon: FileSpreadsheet },
            { id: "updates", label: "Broadcast Feed", icon: Megaphone },
            { id: "questions", label: "Q&A Help Desk", icon: MessageSquare }
          ].map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center space-x-2 py-2 px-4 rounded-xl text-xs font-semibold uppercase tracking-wide whitespace-nowrap transition-all ${
                  activeTab === tab.id
                    ? "bg-emerald-400 text-black shadow-lg"
                    : "bg-[#0f1424] text-gray-400 hover:text-white hover:bg-gray-800 border border-gray-800"
                }`}
              >
                <Icon className="h-4 w-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* ==================== TAB 1: TASKS Command Lobby ==================== */}
        {activeTab === "tasks" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Left/Middle Column - Tasks Stream */}
            <div className="lg:col-span-2 space-y-4">
              <div className="flex justify-between items-center bg-[#0f1424]/40 p-4 rounded-2xl border border-gray-800">
                <div>
                  <h3 className="text-base font-bold font-display text-white">Live Task Stream</h3>
                  <p className="text-xs text-gray-500">Track and claim operations allocated in this company subspace.</p>
                </div>
                <span className="text-xs bg-gray-900 text-gray-400 font-mono px-3 py-1 rounded-xl border border-gray-800">
                  {totalTasksCount} Total Tasks
                </span>
              </div>

              {tasks.length === 0 ? (
                <div className="p-12 text-center bg-[#0f1424] border border-dashed border-gray-800 rounded-3xl">
                  <Briefcase className="h-10 w-10 text-gray-600 mx-auto mb-3" />
                  <p className="text-sm font-semibold text-gray-300 font-display">No corporate tasks active yet in Nixus</p>
                  <p className="text-xs text-gray-500 mt-1 max-w-sm mx-auto">
                    {session.role === "leader" 
                      ? "Get started by logging tasks in the form on the right so workers can check them." 
                      : "The leader has not assigned task items. Stay tuned for workspace deployments."}
                  </p>
                </div>
              ) : (
                <div className="space-y-3.5">
                  {tasks.map((task) => (
                    <div
                      key={task.id}
                      className={`p-4 rounded-2xl bg-[#0f1424] border transition-all ${
                        task.status === "completed"
                          ? "border-emerald-500/30 bg-emerald-950/5/30"
                          : task.status === "claimed"
                          ? "border-blue-500/25"
                          : "border-gray-800"
                      }`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                            {renderPriorityBadge(task.priority)}
                            <span className={`text-[10px] font-mono px-2 py-0.5 rounded border ${
                              task.status === "completed"
                                ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                                : task.status === "claimed"
                                ? "bg-blue-500/10 text-blue-400 border-blue-500/20"
                                : "bg-yellow-500/10 text-yellow-500 border-yellow-500/25"
                            }`}>
                              {task.status.toUpperCase()}
                            </span>
                            <span className="text-gray-500 text-[10px] font-mono flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              Limit: {task.dueDate}
                            </span>
                          </div>
                          
                          <h4 className="text-sm font-bold text-white mt-2.5 font-display lg:text-base leading-tight">
                            {task.title}
                          </h4>
                          <p className="text-xs text-gray-400 mt-1 leading-relaxed max-w-2xl whitespace-pre-line">
                            {task.description || "No description provided."}
                          </p>
                        </div>

                        {/* Task Action Board */}
                        <div className="sm:text-right shrink-0">
                          {task.status === "pending" && (
                            session.role === "worker" ? (
                              <button
                                onClick={() => handleClaimTask(task.id)}
                                className="w-full sm:w-auto px-4 py-2 bg-emerald-400 hover:bg-emerald-300 text-black text-xs font-bold rounded-xl transition-all shadow-md flex items-center justify-center gap-1.5"
                              >
                                Claim Task
                              </button>
                            ) : (
                              <span className="text-[11px] text-gray-500 italic block">Awaiting workers</span>
                            )
                          )}

                          {task.status === "claimed" && (
                            <div className="space-y-1.5">
                              <div className="text-xs text-gray-400 flex items-center justify-end gap-1 font-semibold">
                                <User className="h-3.5 w-3.5 text-blue-400" />
                                <span>{task.assignedWorkerName}</span>
                              </div>
                              
                              {session.role === "worker" && task.assignedWorkerName === session.workerName ? (
                                <button
                                  onClick={() => {
                                    setActiveCompletingTask(task);
                                    setCompletionNotes("");
                                    setCompletionFeedback("");
                                  }}
                                  className="w-full sm:w-auto px-4 py-1.5 bg-blue-500 hover:bg-blue-400 text-white text-xs font-bold rounded-xl transition-all shadow border border-blue-400 flex items-center justify-center gap-1"
                                >
                                  <CheckCircle className="h-3.5 w-3.5" />
                                  Declare Complete
                                </button>
                              ) : (
                                session.role === "leader" && (
                                  <button
                                    onClick={() => handleReleaseTask(task.id)}
                                    className="px-2.5 py-1 text-[10px] font-mono text-rose-400 hover:text-white bg-rose-950/20 hover:bg-rose-950/60 border border-rose-900/40 rounded-lg transition-all"
                                  >
                                    Unassign Worker
                                  </button>
                                )
                              )}
                            </div>
                          )}

                          {task.status === "completed" && (
                            <div className="space-y-1 block sm:text-right">
                              <span className="text-xs text-emerald-400 flex items-center justify-end gap-1.5 font-bold">
                                <CheckCircle className="h-4 w-4" />
                                Done by {task.assignedWorkerName}
                              </span>
                              <span className="text-[10px] text-gray-500 block font-mono">
                                Closed {task.completedAt ? new Date(task.completedAt).toLocaleDateString() : ""}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Display task completions / feedback under the task box */}
                      {task.status === "completed" && (task.completionNotes || task.workerFeedback) && (
                        <div className="mt-3 bg-[#0d1220] p-3 rounded-xl border border-emerald-950/80 text-xs space-y-1.5">
                          {task.completionNotes && (
                            <div>
                              <strong className="text-emerald-400 font-semibold uppercase tracking-wider text-[9px] block">Execution Log:</strong>
                              <span className="text-gray-300 italic font-mono">&quot;{task.completionNotes}&quot;</span>
                            </div>
                          )}
                          {task.workerFeedback && (
                            <div>
                              <strong className="text-amber-400 font-semibold uppercase tracking-wider text-[9px] block">Worker Feedback Rating & Note:</strong>
                              <span className="text-gray-400 italic">&quot;{task.workerFeedback}&quot;</span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Right Column - Forms based on authentication role */}
            <div className="space-y-6">
              
              {/* Leader Console Pane - Add Task Form */}
              {session.role === "leader" ? (
                <div className="bg-[#0f1424] border border-gray-800 rounded-3xl p-5 shadow-xl relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-2.5 bg-emerald-500/10 border-b border-l border-emerald-500/20 rounded-bl-xl text-emerald-400 text-[10px] uppercase tracking-wider font-extrabold">
                    Leader Dashboard Control
                  </div>
                  <h3 className="text-sm uppercase tracking-wider font-bold text-white mb-4">
                    Delegate New Corporate Task
                  </h3>
                  
                  <form onSubmit={handleAddTask} className="space-y-4">
                    <div>
                      <label className="block text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-1">
                        Task Designation / Title
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Audit Revenue Pipelines"
                        value={newTaskTitle}
                        onChange={(e) => setNewTaskTitle(e.target.value)}
                        className="block w-full px-3.5 py-2.5 bg-[#171e30] border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-400 text-xs transition-all"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-1">
                        Core Requirements & Details
                      </label>
                      <textarea
                        rows={3}
                        placeholder="Detail specific deliverables, API endpoints or assets to use."
                        value={newTaskDesc}
                        onChange={(e) => setNewTaskDesc(e.target.value)}
                        className="block w-full px-3.5 py-2.5 bg-[#171e30] border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-400 text-xs transition-all resize-none"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-1">
                          Operational Priority
                        </label>
                        <select
                          value={newTaskPriority}
                          onChange={(e) => setNewTaskPriority(e.target.value as any)}
                          className="block w-full px-3 py-2 bg-[#171e30] border border-gray-700 rounded-xl text-white text-xs focus:outline-none focus:ring-2 focus:ring-emerald-400"
                        >
                          <option value="low">Low Priority</option>
                          <option value="medium">Medium Priority</option>
                          <option value="high">Critical / High</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-1">
                          Deadline Limit
                        </label>
                        <input
                          type="date"
                          value={newTaskDueDate}
                          onChange={(e) => setNewTaskDueDate(e.target.value)}
                          className="block w-full px-3 py-2 bg-[#171e30] border border-gray-700 rounded-xl text-white text-xs focus:outline-none focus:ring-2 focus:ring-emerald-400"
                        />
                      </div>
                    </div>

                    <button
                      type="submit"
                      className="w-full flex items-center justify-center gap-1 py-2.5 px-4 rounded-xl text-xs font-bold text-black bg-emerald-400 hover:bg-emerald-300 transition-all"
                    >
                      <Plus className="h-4 w-4" />
                      Dispatch to Workspace Pool
                    </button>
                  </form>
                </div>
              ) : (
                /* Worker Interactive Workspace Quick Stats Console */
                <div className="bg-[#0f1424] border border-gray-800 rounded-3xl p-5 shadow-xl">
                  <div className="inline-flex items-center space-x-1.5 text-xs text-emerald-400 font-bold mb-3.5">
                    <User className="h-4 w-4" />
                    <span>Worker Central Port</span>
                  </div>
                  <h4 className="text-sm font-semibold text-white font-display">My Registered Workspace Status</h4>
                  <p className="text-xs text-gray-400 mt-1">
                    You can claim any task from the lobby. Once claimed, tasks move to your queue where you can sign off when ready.
                  </p>
                  
                  <div className="grid grid-cols-2 gap-2 mt-4">
                    <div className="bg-[#171e30] p-3 rounded-xl border border-gray-800">
                      <div className="text-[10px] text-gray-500 uppercase font-mono font-bold">My Claims</div>
                      <div className="text-lg font-bold text-white mt-1">
                        {tasks.filter((t) => t.assignedWorkerName === session.workerName && t.status === "claimed").length} Tasks
                      </div>
                    </div>
                    <div className="bg-[#171e30] p-3 rounded-xl border border-gray-800">
                      <div className="text-[10px] text-gray-500 uppercase font-mono font-bold">Files Shared</div>
                      <div className="text-lg font-bold text-white mt-1 font-mono">
                        {files.filter((f) => f.uploadedBy === session.workerName).length} Docs
                      </div>
                    </div>
                  </div>
                  
                  <div className="mt-5 p-3 rounded-xl bg-indigo-950/20 border border-indigo-900/35 text-xs text-gray-300 flex items-start gap-2 leading-relaxed">
                    <CheckCircle className="h-4.5 w-4.5 text-emerald-400 shrink-0 mt-0.5" />
                    <p>
                      Ensure to capture specific <strong>Completion Notes</strong> after finalizing duties. Feedback helps the leader coordinate faster pipelines.
                    </p>
                  </div>
                </div>
              )}

              {/* Real-time-looking Log Stream Widget */}
              <div className="bg-[#0f1424]/60 border border-gray-800 rounded-2xl p-4">
                <h4 className="text-xs uppercase tracking-wider font-bold text-white mb-2.5 flex items-center justify-between">
                  <span>Subspace Activity Logs</span>
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-ping" />
                </h4>
                
                <div className="space-y-2 text-[11px] font-mono max-h-48 overflow-y-auto pr-1">
                  {tasks.slice(0, 5).map((t, idx) => (
                    <div key={idx} className="flex gap-2 text-gray-400 pb-2 border-b border-gray-800 last:border-0">
                      <span className="text-emerald-500 shrink-0">&gt;</span>
                      <div>
                        {t.status === "completed" ? (
                          <span>Task <strong className="text-gray-200">#{t.id.slice(-4)}</strong> finished by <strong className="text-emerald-400">{t.assignedWorkerName}</strong></span>
                        ) : t.status === "claimed" ? (
                          <span>Worker <strong className="text-blue-400">{t.assignedWorkerName}</strong> locked onto task <strong className="text-gray-200">#{t.id.slice(-4)}</strong></span>
                        ) : (
                          <span>New Pending Task <strong className="text-amber-400">"{t.title.slice(0, 20)}..."</strong> registered by Leader</span>
                        )}
                      </div>
                    </div>
                  ))}
                  {tasks.length === 0 && (
                    <div className="text-gray-600 text-center py-2 italic font-sans text-xs">Waiting for action signals...</div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}


        {/* ==================== TAB 2: ANALYTICS & AI ==================== */}
        {activeTab === "analytics" && (
          <div className="space-y-6">

            {/* AI Executive Assistant Integration Block */}
            <div className="p-5 sm:p-6 rounded-3xl bg-gradient-to-br from-[#0f172a] via-[#111c3a] to-[#0d1424] border border-indigo-500/20 shadow-2xl relative overflow-hidden">
              <div className="absolute -top-10 -right-10 w-44 h-44 bg-indigo-500/10 rounded-full blur-[40px] pointer-events-none" />
              <div className="absolute top-4 right-4 text-xs font-mono text-emerald-400 tracking-widest font-extrabold uppercase animate-pulse-slow flex items-center gap-1 bg-emerald-950/40 p-1 px-2 border border-emerald-900/40 rounded">
                <BrainCircuit className="h-3.5 w-3.5" />
                Nixus AI Subspace Node
              </div>

              <div className="max-w-xl">
                <h3 className="text-base font-bold font-display text-transparent bg-clip-text bg-gradient-to-r from-white via-indigo-200 to-indigo-400">
                  Gemini Team Telemetry Assistant
                </h3>
                <p className="text-xs text-gray-400 mt-1 leading-relaxed">
                  Run a secure LLM strategic audit on database performance. Our integrated LLM model evaluates workflow completion rates, checks worker logs or feedbacks for indicators of stress, and charts immediate delegation tasks.
                </p>
              </div>

              <div className="mt-5 flex flex-wrap items-center gap-3">
                <button
                  onClick={runAIEngineAnalysis}
                  disabled={aiGenerating}
                  className="px-5 py-2.5 rounded-xl bg-emerald-400 hover:bg-emerald-300 text-black text-xs font-extrabold flex items-center gap-1.5 shadow-lg tracking-wide transition-all disabled:opacity-40"
                >
                  <BrainCircuit className="h-4.5 w-4.5" />
                  {aiGenerating ? "Synthesizing Nixus Telemetry Logs..." : "Compile Gemini Strategic Audit"}
                </button>
                {aiGenerating && (
                  <span className="text-xs font-mono text-gray-400 animate-pulse">Running server inference... Please hold payload.</span>
                )}
              </div>

              {/* AI Report container output */}
              {aiReport && (
                <motion.div
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-6 p-5 rounded-2xl bg-[#090d1a] border border-gray-800 relative z-10"
                >
                  <h4 className="text-xs font-mono text-indigo-400 uppercase tracking-widest mb-3 border-b border-gray-800 pb-2">
                    GENERATED EXECUTIVE BRIEF
                  </h4>
                  <div className="text-xs text-gray-300 leading-relaxed font-sans space-y-4 whitespace-pre-line prose prose-invert max-w-none">
                    {aiReport}
                  </div>
                </motion.div>
              )}
            </div>

            {/* Custom SVG Telemetry Analytics Charts Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* Pie/Donut Chart Component */}
              <div className="bg-[#0f1424] border border-gray-800 rounded-3xl p-5">
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400">Status Distribution Spectrum</h4>
                  <p className="text-xs text-gray-500 mt-0.5">Custom computed vector sectors of tasks ratio.</p>
                </div>

                <div className="flex flex-col sm:flex-row items-center justify-around gap-6 mt-6">
                  {totalTasksCount === 0 ? (
                    <div className="text-center text-xs text-gray-500 py-12">No metrics recorded to draw spectral map.</div>
                  ) : (
                    <>
                      {/* SVG Circle Graph */}
                      <div className="relative w-36 h-36 flex items-center justify-center">
                        <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 36 36">
                          {/* Background indicator */}
                          <circle cx="18" cy="18" r="15.915" fill="none" stroke="rgba(243, 244, 246, 0.04)" strokeWidth="3" />
                          
                          {/* Completed: Emerald segment */}
                          {completedTasks.length > 0 && (
                            <circle
                              cx="18"
                              cy="18"
                              r="15.915"
                              fill="none"
                              stroke="#10b981"
                              strokeWidth="3.2"
                              strokeDasharray={`${(completedTasks.length / totalTasksCount) * 100} ${100 - (completedTasks.length / totalTasksCount) * 100}`}
                              strokeDashoffset="0"
                            />
                          )}

                          {/* Claimed: Blue segment */}
                          {claimedTasks.length > 0 && (
                            <circle
                              cx="18"
                              cy="18"
                              r="15.915"
                              fill="none"
                              stroke="#3b82f6"
                              strokeWidth="3.2"
                              strokeDasharray={`${(claimedTasks.length / totalTasksCount) * 100} ${100 - (claimedTasks.length / totalTasksCount) * 100}`}
                              strokeDashoffset={-((completedTasks.length / totalTasksCount) * 100)}
                            />
                          )}

                          {/* Pending: Yellow segment */}
                          {pendingTasks.length > 0 && (
                            <circle
                              cx="18"
                              cy="18"
                              r="15.915"
                              fill="none"
                              stroke="#eab308"
                              strokeWidth="3.2"
                              strokeDasharray={`${(pendingTasks.length / totalTasksCount) * 100} ${100 - (pendingTasks.length / totalTasksCount) * 100}`}
                              strokeDashoffset={-(((completedTasks.length + claimedTasks.length) / totalTasksCount) * 100)}
                            />
                          )}
                        </svg>
                        
                        <div className="text-center z-10">
                          <p className="text-xl font-extrabold text-white font-display">{totalTasksCount}</p>
                          <p className="text-[9px] text-gray-500 uppercase tracking-widest font-mono">Assigned</p>
                        </div>
                      </div>

                      {/* Legend Grid */}
                      <div className="space-y-2 text-xs w-full sm:w-auto">
                        <div className="flex items-center space-x-2">
                          <span className="h-3 w-3 rounded-full bg-emerald-500 block shrink-0" />
                          <span className="text-gray-300 font-medium">Completed: </span>
                          <span className="font-mono font-bold text-white ml-auto">{completedTasks.length} ({Math.round((completedTasks.length / totalTasksCount) * 100)}%)</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className="h-3 w-3 rounded-full bg-blue-500 block shrink-0" />
                          <span className="text-gray-300 font-medium">Claimed: </span>
                          <span className="font-mono font-bold text-white ml-auto">{claimedTasks.length} ({Math.round((claimedTasks.length / totalTasksCount) * 100)}%)</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className="h-3 w-3 rounded-full bg-yellow-500 block shrink-0" />
                          <span className="text-gray-300 font-medium">Pending: </span>
                          <span className="font-mono font-bold text-white ml-auto">{pendingTasks.length} ({Math.round((pendingTasks.length / totalTasksCount) * 100)}%)</span>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>


              {/* Bar Chart Component - Tasks Accomplished Per Worker */}
              <div className="bg-[#0f1424] border border-gray-800 rounded-3xl p-5">
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400">Worker Contribution Standings</h4>
                  <p className="text-xs text-gray-500 mt-0.5">Tasks successfully resolved listed per team individual.</p>
                </div>

                <div className="mt-5 space-y-4">
                  {uniqueWorkersList.length === 0 ? (
                    <div className="text-center text-xs text-gray-500 py-12">No individual worker progress recorded.</div>
                  ) : (
                    uniqueWorkersList.map((workerName) => {
                      const workerCompleted = tasks.filter((t) => t.assignedWorkerName === workerName && t.status === "completed").length;
                      const workerClaimed = tasks.filter((t) => t.assignedWorkerName === workerName && t.status === "claimed").length;
                      const maxTasks = Math.max(...uniqueWorkersList.map(w => tasks.filter(t => t.assignedWorkerName === w).length), 1);
                      const completenessPercent = Math.min(Math.round(((workerCompleted + workerClaimed) / maxTasks) * 100), 100);

                      return (
                        <div key={workerName} className="space-y-1.5">
                          <div className="flex justify-between items-center text-xs text-gray-300">
                            <span className="font-semibold text-white">{workerName}</span>
                            <span className="font-mono text-[10px] text-gray-400">
                              <strong className="text-emerald-400">{workerCompleted}</strong> Done / <strong className="text-blue-400">{workerClaimed}</strong> Active
                            </span>
                          </div>
                          
                          {/* Segmented bar representation */}
                          <div className="w-full bg-gray-900 h-3 rounded-md overflow-hidden flex relative">
                            <div 
                              className="bg-emerald-500 h-full transition-all duration-300" 
                              style={{ width: `${(workerCompleted / maxTasks) * 100}%` }}
                              title={`${workerCompleted} tasks done`}
                            />
                            <div 
                              className="bg-blue-500 h-full transition-all duration-300" 
                              style={{ width: `${(workerClaimed / maxTasks) * 100}%` }}
                              title={`${workerClaimed} tasks active`}
                            />
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

            </div>

            {/* Historic Team Feedbacks Section */}
            <div className="bg-[#0f1424] border border-gray-800 rounded-3xl p-5">
              <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-3 flex items-center gap-1">
                <span>Direct Worker Feedback Logs</span>
                <span className="text-[10px] bg-emerald-950 text-emerald-400 px-2 py-0.5 rounded border border-emerald-990 font-mono">
                  {completedTasks.filter(t => t.workerFeedback).length} inputs
                </span>
              </h4>
              
              {completedTasks.filter(t => t.workerFeedback).length === 0 ? (
                <p className="text-xs text-gray-600 py-6 text-center italic">No worker reviews logged in repository yet.</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                  {completedTasks.filter(t => t.workerFeedback).map((task) => (
                    <div key={task.id} className="bg-[#090d1a] border border-gray-800 p-4 rounded-xl space-y-2">
                      <div className="flex justify-between items-center text-xs">
                        <span className="font-bold text-white uppercase tracking-wider text-[10px] bg-emerald-950/40 p-1 px-1.5 text-emerald-400 border border-emerald-900 rounded">
                          {task.assignedWorkerName}
                        </span>
                        <span className="text-gray-500 font-mono text-[9px]">{task.completedAt ? new Date(task.completedAt).toLocaleDateString() : ""}</span>
                      </div>
                      <p className="text-xs text-gray-300 italic">
                        &quot;{task.workerFeedback}&quot;
                      </p>
                      <div className="text-[10px] text-gray-500 flex items-center gap-1 pt-1.5 border-t border-gray-900">
                        <strong className="text-gray-400">Ref duty:</strong>
                        <span className="truncate">{task.title}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>
        )}


        {/* ==================== TAB 3: FILE REPOSITORY ==================== */}
        {activeTab === "files" && (
          <div className="space-y-6">
            
            <div className="bg-[#0f1424] border border-gray-800 rounded-3xl p-6">
              <h3 className="text-base font-bold font-display text-white">Nixus Shared Drive Container</h3>
              <p className="text-xs text-gray-400 mt-1">
                Drag-and-drop any media briefs, PDF guidelines, or spreadsheet logs. Local workers will be synced instantly and can pull the archives with standard base64 download bindings.
              </p>

              {/* Upload Drag Area */}
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`mt-5 p-8 border-2 border-dashed rounded-3xl text-center cursor-pointer transition-all ${
                  isDragOver
                    ? "border-emerald-400 bg-emerald-950/10"
                    : "border-gray-800 hover:border-gray-700 bg-gray-900/40"
                }`}
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileSelect}
                  className="hidden"
                />
                <div className="p-3 bg-gray-800 rounded-2xl w-fit mx-auto mb-3.5 text-gray-400">
                  <Upload className="h-6 w-6 animate-pulse-slow" />
                </div>
                <p className="text-xs font-semibold text-white">
                  Drag & Drop file here, or <span className="text-emerald-400 underline">browse workspace folders</span>
                </p>
                <p className="text-[10px] text-gray-500 mt-1">
                  Supports templates, CSV sheets, layout mockups or reports. Max 25MB index size.
                </p>
              </div>

              {/* Uploaded Files grid */}
              <div className="mt-8">
                <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-4 flex justify-between items-center">
                  <span>Accessible Digital Repositories</span>
                  <span className="text-xs font-mono text-gray-500 font-normal">{files.length} Shared Archives</span>
                </h4>

                {files.length === 0 ? (
                  <div className="text-center py-10 bg-gray-900/20 rounded-2xl border border-gray-800">
                    <FolderOpen className="h-8 w-8 text-gray-700 mx-auto mb-2" />
                    <p className="text-xs text-gray-400">Cabinet is currently empty.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {files.map((file) => (
                      <div
                        key={file.id}
                        className="bg-gray-900/60 hover:bg-[#12192b] border border-gray-800 p-4 rounded-2xl transition-all flex items-start gap-3 relative group"
                      >
                        <div className="p-2 bg-indigo-950/60 rounded-xl text-indigo-400 border border-indigo-900">
                          <FileSpreadsheet className="h-6 w-6" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h5 className="text-xs font-bold text-white truncate" title={file.name}>
                            {file.name}
                          </h5>
                          <div className="flex items-center gap-1.5 mt-1 text-[10px] text-gray-400 font-mono">
                            <span>{file.size}</span>
                            <span>•</span>
                            <span>By {file.uploadedBy}</span>
                          </div>
                          <span className="text-[9px] text-gray-500 block mt-1 font-mono">
                            Shared on {new Date(file.uploadedAt).toLocaleDateString()}
                          </span>
                        </div>
                        
                        <button
                          onClick={() => triggerDownload(file)}
                          className="p-1 px-2.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-400 text-emerald-400 hover:text-black border border-emerald-500/20 text-[10px] font-bold flex items-center gap-1 select-none transition-all cursor-pointer mt-1"
                        >
                          <Download className="h-3 w-3" />
                          {file.downloadCount > 0 ? `${file.downloadCount}` : "Get"}
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

            </div>

          </div>
        )}


        {/* ==================== TAB 4: BROADCAST FEED ==================== */}
        {activeTab === "updates" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Display Bulletins Column */}
            <div className="lg:col-span-2 space-y-4">
              <div className="bg-[#0f1424]/40 p-4 rounded-2xl border border-gray-800 flex justify-between items-center">
                <div>
                  <h3 className="text-base font-bold font-display text-white">Bulletin Workspace Announcements</h3>
                  <p className="text-xs text-gray-500 font-sans">Live company updates, team feedback coordinates and milestones.</p>
                </div>
              </div>

              {updates.length === 0 ? (
                <div className="p-12 text-center bg-[#0f1424] border border-dashed border-gray-800 rounded-3xl">
                  <Megaphone className="h-9 w-9 text-gray-700 mx-auto mb-3" />
                  <p className="text-xs text-gray-400">Bulletin space is clean. Announcements will flash on top of worker channels.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {updates.map((post) => (
                    <div
                      key={post.id}
                      className={`p-5 rounded-3xl bg-[#0f1424] border transition-all ${
                        post.isUrgent
                          ? "border-rose-500/25 bg-rose-950/5"
                          : "border-gray-850"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <span className="text-xs font-bold text-white uppercase tracking-wider bg-gray-900 border border-gray-800 px-3 py-0.5 rounded-lg">
                            {post.author}
                          </span>
                          {post.isUrgent && (
                            <span className="text-[9px] uppercase tracking-widest font-extrabold px-2 py-0.5 rounded bg-rose-500/10 text-rose-400 border border-rose-500/20">
                              Urgent Dispatch
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] text-gray-500 font-mono">
                          {new Date(post.date).toLocaleString()}
                        </span>
                      </div>

                      <h4 className="text-sm font-bold text-white mt-3 font-display">
                        {post.title}
                      </h4>
                      <p className="text-xs text-gray-300 mt-2 leading-relaxed whitespace-pre-line">
                        {post.content}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Post Bulletin Form Block for Leaders */}
            <div>
              {session.role === "leader" ? (
                <div className="bg-[#0f1424] border border-gray-800 rounded-3xl p-5 shadow-xl relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-2.5 bg-rose-500/10 border-b border-l border-rose-500/20 rounded-bl-xl text-rose-400 text-[10px] uppercase tracking-wider font-extrabold">
                    Bulletins Moderator
                  </div>
                  <h3 className="text-xs uppercase tracking-wider font-extrabold text-white mb-4">
                    Broadcast Team Broadcast
                  </h3>

                  <form onSubmit={handleAddUpdate} className="space-y-4">
                    <div>
                      <label className="block text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-1">
                        Bulletin Topic
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Q3 Server Deployment Schedule"
                        value={newUpdateTitle}
                        onChange={(e) => setNewUpdateTitle(e.target.value)}
                        className="block w-full px-3.5 py-2.5 bg-[#171e30] border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-400 text-xs transition-all"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-1">
                        Bulletin Content
                      </label>
                      <textarea
                        rows={4}
                        required
                        placeholder="Detail specific deliverables, deadlines, passwords, and details."
                        value={newUpdateContent}
                        onChange={(e) => setNewUpdateContent(e.target.value)}
                        className="block w-full px-3.5 py-2.5 bg-[#171e30] border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-400 text-xs transition-all resize-none"
                      />
                    </div>

                    <div className="flex items-center space-x-2 py-1.5 bg-[#171e30] p-3 rounded-xl border border-gray-800">
                      <input
                        type="checkbox"
                        id="urgent-box"
                        checked={newUpdateUrgent}
                        onChange={(e) => setNewUpdateUrgent(e.target.checked)}
                        className="h-4 w-4 bg-gray-900 border-gray-700 rounded text-rose-500 focus:ring-rose-500"
                      />
                      <label htmlFor="urgent-box" className="text-xs text-gray-250 cursor-pointer font-semibold select-none flex-1">
                        Flag as Urgent (Pins to top of workers workspace)
                      </label>
                    </div>

                    <button
                      type="submit"
                      className="w-full flex items-center justify-center gap-1.5 py-2.5 px-4 rounded-xl text-xs font-bold text-black bg-emerald-400 hover:bg-emerald-300 transition-all cursor-pointer"
                    >
                      <Megaphone className="h-4 w-4" />
                      Publish Bulletin Broadcast
                    </button>
                  </form>
                </div>
              ) : (
                <div className="bg-[#0f1424] border border-gray-800 rounded-3xl p-5 text-xs text-gray-400 text-center">
                  <Megaphone className="h-8 w-8 text-gray-605 mx-auto mb-2" />
                  <p className="font-semibold text-white">Broadcast Bulletin Board</p>
                  <p className="mt-1 leading-relaxed">
                    Announcements published here are drafted by the <strong>Team Leader</strong>. Check this board daily for pipeline changes.
                  </p>
                </div>
              )}
            </div>

          </div>
        )}


        {/* ==================== TAB 5: INQUIRIES & QUESTIONS HELP DESK ==================== */}
        {activeTab === "questions" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* List questions and answers */}
            <div className="lg:col-span-2 space-y-4">
              <div className="bg-[#0f1424]/40 p-4 rounded-2xl border border-gray-800 flex justify-between items-center">
                <div>
                  <h3 className="text-base font-bold font-display text-white">Active Worker Questions Board</h3>
                  <p className="text-xs text-gray-500">Submit workspace blockers directly to get resolved by team leadership.</p>
                </div>
              </div>

              {questions.length === 0 ? (
                <div className="p-12 text-center bg-[#0f1424] border border-dashed border-gray-800 rounded-3xl">
                  <MessageSquare className="h-9 w-9 text-gray-700 mx-auto mb-3" />
                  <p className="text-xs text-gray-400">All coordinates resolved! No pending queries at this nexpoint.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {questions.map((q) => (
                    <div
                      key={q.id}
                      className={`p-5 rounded-3xl bg-[#0f1424] border transition-all ${
                        q.answerText ? "border-emerald-500/20 bg-emerald-950/2" : "border-amber-500/20 bg-amber-950/5"
                      }`}
                    >
                      {/* Worker Question Meta */}
                      <div className="flex items-center justify-between text-xs pb-3 border-b border-gray-850">
                        <div className="flex items-center space-x-2">
                          <span className="font-bold text-white uppercase tracking-wider text-[10px] bg-indigo-950/50 p-1 px-2 border border-indigo-900 rounded">
                            {q.workerName}
                          </span>
                          <span className="text-[9px] text-gray-400 font-mono">
                            {new Date(q.timestamp).toLocaleString()}
                          </span>
                        </div>
                        
                        <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${
                          q.answerText ? "bg-emerald-950 text-emerald-400 border border-emerald-900" : "bg-amber-950 text-amber-400 border border-amber-900"
                        }`}>
                          {q.answerText ? "Resolved" : "Open Token"}
                        </span>
                      </div>

                      {/* Question Text */}
                      <div className="py-3 text-sm text-gray-250 leading-relaxed font-display">
                        &quot;{q.questionText}&quot;
                      </div>

                      {/* Reply field or Reply Render */}
                      {q.answerText ? (
                        <div className="mt-2 bg-[#090d1a] border border-emerald-950 p-3.5 rounded-2xl relative">
                          <div className="absolute top-2 right-2 flex items-center gap-1 text-[9px] text-emerald-400 uppercase font-mono font-bold font-display">
                            <ShieldCheck className="h-3.5 w-3.5" />
                            Leader Resolve
                          </div>
                          
                          <div className="text-[10px] text-gray-500 uppercase tracking-wider font-extrabold text-[8px] font-mono mb-1">Company Executive Response</div>
                          <p className="text-xs text-gray-300 leading-normal italic font-semibold">
                            &quot;{q.answerText}&quot;
                          </p>
                          <span className="text-[9px] text-gray-500 block mt-1.5 font-mono text-right">
                            Replied on {q.answeredAt ? new Date(q.answeredAt).toLocaleString() : ""}
                          </span>
                        </div>
                      ) : (
                        session.role === "leader" ? (
                          <div className="mt-3.5 pt-3.5 border-t border-gray-800">
                            {activeAnsweringQuestion?.id === q.id ? (
                              <form onSubmit={handleAnswerQuestion} className="space-y-3">
                                <textarea
                                  rows={2.5}
                                  required
                                  placeholder={`Craft reply response to save for ${q.workerName}...`}
                                  value={leaderAnswerText}
                                  onChange={(e) => setLeaderAnswerText(e.target.value)}
                                  className="block w-full px-3.5 py-2 bg-[#171e30] border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-400 text-xs transition-all"
                                />
                                <div className="flex justify-end gap-2 text-xs">
                                  <button
                                    type="button"
                                    onClick={() => setActiveAnsweringQuestion(null)}
                                    className="px-3.5 py-1.5 bg-gray-800 hover:bg-gray-750 text-gray-300 rounded-lg transition-all"
                                  >
                                    Cancel
                                  </button>
                                  <button
                                    type="submit"
                                    className="px-4 py-1.5 bg-emerald-400 hover:bg-emerald-300 text-black font-extrabold rounded-lg transition-all"
                                  >
                                    Publish Resolution
                                  </button>
                                </div>
                              </form>
                            ) : (
                              <button
                                onClick={() => {
                                  setActiveAnsweringQuestion(q);
                                  setLeaderAnswerText("");
                                }}
                                className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-black text-[11px] font-extrabold rounded-lg tracking-wide transition-colors"
                              >
                                Answer Question
                              </button>
                            )}
                          </div>
                        ) : (
                          <span className="text-[11px] text-gray-500 italic font-mono block mt-1.5">Awaiting corporate manager resolution...</span>
                        )
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Submit question widget (Workers only) */}
            <div>
              {session.role === "worker" ? (
                <div className="bg-[#0f1424] border border-gray-800 rounded-3xl p-5 shadow-xl relative overflow-hidden">
                  <h3 className="text-xs uppercase tracking-wider font-extrabold text-white mb-3 flex items-center gap-1">
                    <HelpCircle className="h-4.5 w-4.5 text-amber-400" />
                    Submit Workspace Query
                  </h3>
                  <p className="text-xs text-gray-400 leading-relaxed mb-4">
                    Blockers? API issues? Ask the managers to provide direct, real-time guidelines.
                  </p>

                  <form onSubmit={handleAddQuestion} className="space-y-4">
                    <textarea
                      rows={4}
                      required
                      placeholder="e.g. Do we have access locks for the Q3 database server, or can we check-out locally?"
                      value={newQuestionText}
                      onChange={(e) => setNewQuestionText(e.target.value)}
                      className="block w-full px-3.5 py-2.5 bg-[#171e30] border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-400 text-xs transition-all resize-none"
                    />

                    <button
                      type="submit"
                      className="w-full flex items-center justify-center gap-1.5 py-2.5 px-4 rounded-xl text-xs font-bold text-black bg-emerald-400 hover:bg-emerald-300 transition-all cursor-pointer"
                    >
                      <MessageSquare className="h-4 w-4" />
                      Dispatch Question to Lead
                    </button>
                  </form>
                </div>
              ) : (
                <div className="bg-[#0f1424] border border-gray-800 rounded-3xl p-5 text-xs text-gray-400 text-center space-y-2">
                  <HelpCircle className="h-8 w-8 text-gray-605 mx-auto" />
                  <p className="font-semibold text-white">Corporate Help Desk Lobby</p>
                  <p className="leading-relaxed">
                    As group dispatcher, answers you submit here will immediately pin inside the worker workspace panel so they can lift production locks.
                  </p>
                </div>
              )}
            </div>

          </div>
        )}

      </main>

      {/* FOOTER */}
      <footer className="border-t border-gray-800 bg-[#070a13] py-6 text-center text-xs text-gray-500 font-mono mt-auto relative z-10">
        <p>© 2026 Nixus Corporate Workspace Inc. Fully integrated sandbox database.</p>
        <div className="mt-2.5 flex items-center justify-center space-x-3.5">
          <label className="flex items-center space-x-2 text-[10px] text-gray-500 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={autoSync}
              onChange={(e) => setAutoSync(e.target.checked)}
              className="h-3 w-3 rounded text-emerald-500 focus:ring-0 bg-gray-950 border-gray-800"
            />
            <span>Enable 5.5s Live Polling Sync</span>
          </label>
        </div>
      </footer>

      {/* WORKER DECLARE FINALIZE MODAL */}
      {activeCompletingTask && (
        <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-md bg-[#0f1424] border border-gray-800 rounded-3xl p-6 relative shadow-2xl"
          >
            <h3 className="text-base font-bold font-display text-white">Finalize Task Verification</h3>
            <p className="text-xs text-gray-450 mt-1">
              Mark <span className="text-emerald-400 font-semibold">&quot;{activeCompletingTask.title}&quot;</span> as completed and submit completion report details.
            </p>

            <form onSubmit={handleCompleteTask} className="mt-4 space-y-4">
              <div>
                <label className="block text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1">
                  Resolution Log / Completion Notes
                </label>
                <textarea
                  rows={2.5}
                  required
                  placeholder="e.g. Uploaded v2 SVG parameters, optimized mobile margin boxes."
                  value={completionNotes}
                  onChange={(e) => setCompletionNotes(e.target.value)}
                  className="block w-full px-3 py-2 bg-[#171e30] border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-400 text-xs transition-all resize-none"
                />
              </div>

              <div>
                <label className="block text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1">
                  Morale Rating & Feedback to Lead (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Great specs! High execution efficiency."
                  value={completionFeedback}
                  onChange={(e) => setCompletionFeedback(e.target.value)}
                  className="block w-full px-3 py-2 bg-[#171e30] border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-400 text-xs transition-all"
                />
              </div>

              <div className="flex justify-end gap-2 overflow-hidden">
                <button
                  type="button"
                  onClick={() => setActiveCompletingTask(null)}
                  className="px-4 py-2 rounded-xl bg-gray-800 hover:bg-gray-750 text-gray-300 text-xs font-semibold tracking-wide transition-all"
                >
                  Close Modal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-emerald-400 hover:bg-emerald-300 text-black text-xs font-bold tracking-wide transition-all shadow-md"
                >
                  Verify Task Resolution
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

    </div>
  );
}
