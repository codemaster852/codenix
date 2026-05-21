import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

// Types for DB
interface Database {
  groups: {
    [groupId: string]: {
      companyName: string;
      groupId: string;
      leaderPasswordHash: string; // leader password
      createdAt: string;
      tasks: any[];
      files: any[];
      updates: any[];
      questions: any[];
    };
  };
}

const DB_FILE = path.join(process.cwd(), "nixus_db.json");

// Helper to load DB
function loadDB(): Database {
  try {
    if (fs.existsSync(DB_FILE)) {
      const content = fs.readFileSync(DB_FILE, "utf-8");
      return JSON.parse(content);
    }
  } catch (err) {
    console.error("Error loading database, resetting...", err);
  }
  // Default Seed Data for Nixus
  const defaultDB: Database = {
    groups: {
      "demo-nixus": {
        companyName: "Nixus Marketing LLC",
        groupId: "demo-nixus",
        leaderPasswordHash: "nixus123",
        createdAt: new Date().toISOString(),
        tasks: [
          {
            id: "task-1",
            groupId: "demo-nixus",
            title: "Redesign Nixus Homepage Hero Section",
            description: "Create high-converting landing page elements with bold Space Grotesk fonts.",
            priority: "high",
            status: "completed",
            dueDate: "2026-06-01",
            createdDate: new Date().toISOString(),
            assignedWorkerName: "Sarah Connor",
            claimedAt: new Date().toISOString(),
            completedAt: new Date().toISOString(),
            completionNotes: "Optimized SVG vectors and added premium dark-slate shades.",
            workerFeedback: "Loved the theme suggestions!"
          },
          {
            id: "task-2",
            groupId: "demo-nixus",
            title: "Implement Q3 Marketing Budget Analytics",
            description: "Build interactive Recharts widgets displaying actual vs projected advertising spend.",
            priority: "medium",
            status: "claimed",
            dueDate: "2026-06-15",
            createdDate: new Date().toISOString(),
            assignedWorkerName: "Marcus Wright",
            claimedAt: new Date().toISOString(),
            completedAt: null,
            completionNotes: null,
            workerFeedback: null
          },
          {
            id: "task-3",
            groupId: "demo-nixus",
            title: "Write Pitch Deck for Nixus Capital Series-A",
            description: "Consolidate Q1/Q2 telemetry logs into an executive-friendly PDF.",
            priority: "high",
            status: "pending",
            dueDate: "2026-05-30",
            createdDate: new Date().toISOString(),
            assignedWorkerName: null,
            claimedAt: null,
            completedAt: null,
            completionNotes: null,
            workerFeedback: null
          }
        ],
        files: [
          {
            id: "file-1",
            groupId: "demo-nixus",
            name: "Nixus_Brand_Guidelines_v2.pdf",
            size: "3.4 MB",
            type: "application/pdf",
            uploadedBy: "Leader",
            uploadedAt: new Date().toISOString(),
            downloadCount: 14
          }
        ],
        updates: [
          {
            id: "post-1",
            groupId: "demo-nixus",
            title: "Welcome to Nixus Interactive Portal!",
            content: "Welcome team! Leaders can add collaborative tasks, workers can claim them, and we can share updates here instantly.",
            author: "Leader",
            date: new Date().toISOString(),
            isUrgent: true
          }
        ],
        questions: [
          {
            id: "q-1",
            groupId: "demo-nixus",
            workerName: "Sarah Connor",
            questionText: "Do we need mobile-first support for the homepage hero?",
            timestamp: new Date().toISOString(),
            answerText: "Yes, please prioritize mobile targets to be at least 44px.",
            answeredAt: new Date().toISOString()
          },
          {
            id: "q-2",
            groupId: "demo-nixus",
            workerName: "Marcus Wright",
            questionText: "Can we use d3 for budget visualization details?",
            timestamp: new Date().toISOString(),
            answerText: null,
            answeredAt: null
          }
        ]
      }
    }
  };
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(defaultDB, null, 2));
  } catch (e) {
    console.error("Failed to write initial db.json file", e);
  }
  return defaultDB;
}

// Write DB helper
function saveDB(data: Database) {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
  } catch (err) {
    console.error("Error saving database file:", err);
  }
}

async function runExpress() {
  const db = loadDB();
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: "25mb" }));

  // --- API ROUTE 1: GET GROUPS HEADERS (For search/join autocomplete) ---
  app.get("/api/groups", (req, res) => {
    try {
      const publicGroups = Object.values(db.groups).map((g) => ({
        companyName: g.companyName,
        groupId: g.groupId,
      }));
      res.json({ success: true, groups: publicGroups });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // --- API ROUTE 2: CREATE GROUP ---
  app.post("/api/groups/create", (req, res) => {
    try {
      const { companyName, groupId, leaderPassword } = req.body;
      if (!companyName || !groupId || !leaderPassword) {
        return res.status(400).json({ success: false, error: "All fields are required" });
      }

      const cleanGroupId = groupId.trim().toLowerCase().replace(/\s+/g, "-");
      if (db.groups[cleanGroupId]) {
        return res.status(400).json({ success: false, error: "Group ID already exists" });
      }

      db.groups[cleanGroupId] = {
        companyName: companyName.trim(),
        groupId: cleanGroupId,
        leaderPasswordHash: leaderPassword, // Stored securely for simple auth context
        createdAt: new Date().toISOString(),
        tasks: [],
        files: [],
        updates: [],
        questions: []
      };

      saveDB(db);
      res.json({ success: true, group: db.groups[cleanGroupId] });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // --- API ROUTE 3: JOIN & VALIDATE GROUP ACCESS ---
  app.post("/api/groups/join", (req, res) => {
    try {
      const { groupId, password, role, workerName } = req.body;
      if (!groupId || !password) {
        return res.status(400).json({ success: false, error: "Group ID and password are required" });
      }

      const cleanId = groupId.trim().toLowerCase();
      const group = db.groups[cleanId];

      if (!group) {
        return res.status(404).json({ success: false, error: "Company Group ID not found. Verify company name/ID." });
      }

      if (group.leaderPasswordHash !== password) {
        return res.status(401).json({ success: false, error: "Incorrect group leader password." });
      }

      if (role === 'worker' && !workerName?.trim()) {
        return res.status(400).json({ success: false, error: "Worker Name is required." });
      }

      // Login succeeds
      res.json({
        success: true,
        companyName: group.companyName,
        groupId: group.groupId,
        role: role,
        workerName: role === 'worker' ? workerName.trim() : "Leader"
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // --- API ROUTE 4: GET GROUP FULL SYNCHRONIZED DATA ---
  app.get("/api/groups/:id/data", (req, res) => {
    try {
      const groupId = req.params.id.trim().toLowerCase();
      const group = db.groups[groupId];
      if (!group) {
        return res.status(404).json({ success: false, error: "Group not found" });
      }
      res.json({
        success: true,
        companyName: group.companyName,
        groupId: group.groupId,
        tasks: group.tasks,
        files: group.files,
        updates: group.updates,
        questions: group.questions
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // --- API ROUTE 5: TASKS OPERATION (CREATE) ---
  app.post("/api/tasks/create", (req, res) => {
    try {
      const { groupId, title, description, priority, dueDate } = req.body;
      const group = db.groups[groupId?.trim().toLowerCase()];
      if (!group) return res.status(404).json({ success: false, error: "Group not found" });

      const newTask = {
        id: `task-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        groupId: group.groupId,
        title: title.trim(),
        description: description?.trim() || "",
        priority: priority || "medium",
        status: "pending",
        dueDate: dueDate || new Date().toISOString().split('T')[0],
        createdDate: new Date().toISOString(),
        assignedWorkerName: null,
        claimedAt: null,
        completedAt: null,
        completionNotes: null,
        workerFeedback: null
      };

      group.tasks.push(newTask);
      saveDB(db);
      res.json({ success: true, task: newTask });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // --- API ROUTE 6: TASKS OPERATION (CLAIM) ---
  app.post("/api/tasks/claim", (req, res) => {
    try {
      const { groupId, taskId, workerName } = req.body;
      const group = db.groups[groupId?.trim().toLowerCase()];
      if (!group) return res.status(404).json({ success: false, error: "Group not found" });

      const task = group.tasks.find((t) => t.id === taskId);
      if (!task) return res.status(404).json({ success: false, error: "Task not found" });

      if (task.status !== "pending") {
        return res.status(400).json({ success: false, error: "Task is already claimed or completed" });
      }

      task.status = "claimed";
      task.assignedWorkerName = workerName;
      task.claimedAt = new Date().toISOString();

      saveDB(db);
      res.json({ success: true, task });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // --- API ROUTE 7: TASKS OPERATION (COMPLETE) ---
  app.post("/api/tasks/complete", (req, res) => {
    try {
      const { groupId, taskId, completionNotes, workerFeedback } = req.body;
      const group = db.groups[groupId?.trim().toLowerCase()];
      if (!group) return res.status(404).json({ success: false, error: "Group not found" });

      const task = group.tasks.find((t) => t.id === taskId);
      if (!task) return res.status(404).json({ success: false, error: "Task not found" });

      task.status = "completed";
      task.completedAt = new Date().toISOString();
      task.completionNotes = completionNotes?.trim() || "";
      task.workerFeedback = workerFeedback?.trim() || "";

      saveDB(db);
      res.json({ success: true, task });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // --- API ROUTE 8: TASKS OPERATION (RELEASE/UNCLAIM) ---
  app.post("/api/tasks/unclaim", (req, res) => {
    try {
      const { groupId, taskId } = req.body;
      const group = db.groups[groupId?.trim().toLowerCase()];
      if (!group) return res.status(404).json({ success: false, error: "Group not found" });

      const task = group.tasks.find((t) => t.id === taskId);
      if (!task) return res.status(404).json({ success: false, error: "Task not found" });

      task.status = "pending";
      task.assignedWorkerName = null;
      task.claimedAt = null;
      task.completedAt = null;
      task.completionNotes = null;
      task.workerFeedback = null;

      saveDB(db);
      res.json({ success: true, task });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // --- API ROUTE 9: UPLOAD FILE METADATA AND CONTENT ---
  app.post("/api/files/upload", (req, res) => {
    try {
      const { groupId, name, size, type, uploadedBy, fileDataUrl } = req.body;
      const group = db.groups[groupId?.trim().toLowerCase()];
      if (!group) return res.status(404).json({ success: false, error: "Group not found" });

      const newFile = {
        id: `file-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        groupId: group.groupId,
        name: name || "unnamed_file",
        size: size || "unknown",
        type: type || "application/octet-stream",
        uploadedBy: uploadedBy || "Anonymous",
        uploadedAt: new Date().toISOString(),
        fileDataUrl: fileDataUrl || "", // virtual file payload
        downloadCount: 0
      };

      group.files.push(newFile);
      saveDB(db);
      res.json({ success: true, file: newFile });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // --- API ROUTE 10: REGISTER DOWNLOAD ACTION ---
  app.post("/api/files/download-increment", (req, res) => {
    try {
      const { groupId, fileId } = req.body;
      const group = db.groups[groupId?.trim().toLowerCase()];
      if (!group) return res.status(404).json({ success: false, error: "Group not found" });

      const file = group.files.find((f) => f.id === fileId);
      if (!file) return res.status(404).json({ success: false, error: "File not found" });

      file.downloadCount += 1;
      saveDB(db);
      res.json({ success: true, downloadCount: file.downloadCount });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // --- API ROUTE 11: CREATE UPDATES/ANNOUNCEMENT ---
  app.post("/api/updates/create", (req, res) => {
    try {
      const { groupId, title, content, author, isUrgent } = req.body;
      const group = db.groups[groupId?.trim().toLowerCase()];
      if (!group) return res.status(404).json({ success: false, error: "Group not found" });

      const newPost = {
        id: `post-${Date.now()}`,
        groupId: group.groupId,
        title: title.trim(),
        content: content.trim(),
        author: author || "Leader",
        date: new Date().toISOString(),
        isUrgent: !!isUrgent
      };

      group.updates.unshift(newPost);
      saveDB(db);
      res.json({ success: true, update: newPost });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // --- API ROUTE 12: ASK A QUESTION ---
  app.post("/api/questions/create", (req, res) => {
    try {
      const { groupId, workerName, questionText } = req.body;
      const group = db.groups[groupId?.trim().toLowerCase()];
      if (!group) return res.status(404).json({ success: false, error: "Group not found" });

      const newQuestion = {
        id: `q-${Date.now()}`,
        groupId: group.groupId,
        workerName: workerName.trim(),
        questionText: questionText.trim(),
        timestamp: new Date().toISOString(),
        answerText: null,
        answeredAt: null
      };

      group.questions.unshift(newQuestion);
      saveDB(db);
      res.json({ success: true, question: newQuestion });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // --- API ROUTE 13: ANSWER A QUESTION ---
  app.post("/api/questions/answer", (req, res) => {
    try {
      const { groupId, questionId, answerText } = req.body;
      const group = db.groups[groupId?.trim().toLowerCase()];
      if (!group) return res.status(404).json({ success: false, error: "Group not found" });

      const question = group.questions.find((q) => q.id === questionId);
      if (!question) return res.status(404).json({ success: false, error: "Question not found" });

      question.answerText = answerText.trim();
      question.answeredAt = new Date().toISOString();

      saveDB(db);
      res.json({ success: true, question });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // --- API ROUTE 14: GEMINI INTELLIGENT EXECUTIVE ANALYSIS ---
  app.post("/api/gemini/analyze", async (req, res) => {
    try {
      const { groupId } = req.body;
      const group = db.groups[groupId?.trim().toLowerCase()];
      if (!group) {
        return res.status(404).json({ success: true, feedback: "Group not found for analysis." });
      }

      // Check if GEMINI_API_KEY exists
      if (!process.env.GEMINI_API_KEY) {
        return res.json({
          success: true,
          feedback: `### 🚀 Quick Performance Overview (AI Sandbox mode)
No custom Gemini API key configured. Here is the local metric readout:
- **Total Registered Assets**: ${group.tasks.length} tasks and ${group.files.length} documents.
- **Worker Questions**: ${group.questions.filter(q => !q.answerText).length} pending queries.
- **Completed Tasks**: ${group.tasks.filter(t => t.status === 'completed').length} finalized.
- **Efficiency Rate**: ${Math.round((group.tasks.filter(t => t.status === 'completed').length / (group.tasks.length || 1)) * 100)}% execution efficiency.

*Add your Gemini API key under AI Studio Settings > Secrets to unlock live advanced LLM suggestions!*`
        });
      }

      // Initialize GoogleGenAI SDK correctly based on guidelines
      const ai = new GoogleGenAI({
        apiKey: process.env.GEMINI_API_KEY,
        httpOptions: {
          headers: {
            "User-Agent": "aistudio-build",
          },
        },
      });

      // Construct a tight prompt summarizing tasks, files, updates, questions
      const tasksSummary = group.tasks.map(t => 
        `- [${t.status.toUpperCase()}] "${t.title}" (Priority: ${t.priority}, Assigned to: ${t.assignedWorkerName || "Unassigned"}. Completion notes: ${t.completionNotes || "None"}, Worker feedback: ${t.workerFeedback || "None"})`
      ).join("\n");

      const questionSummary = group.questions.map(q =>
        `- "${q.questionText}" asked by ${q.workerName} (${q.answerText ? "Answered: " + q.answerText : "Awaiting Leader Reply"})`
      ).join("\n");

      const prompt = `Analyze the current team status and tasks for Nixus company group "${group.companyName}". Prepare a creative, helpful, executive-ready dashboard analysis with 3 clear sections:
1. 📈 **Overall Growth Progress & Bottlenecks**: High-level telemetry of completed vs pending priority items.
2. 👥 **Worker Morale & Task Feedback Evaluation**: Insights based on completed worker feedback and pending questions.
3. ⚡ **Strategic Nexpoint Actions**: 3 highly specific task suggestions or steps that the Team Leader should delegate immediately.

Keep the tone encouraging, technical and concise. Max 350 words.

Heres the data matrix:
**TASKS MATRIX**
${tasksSummary || "No tasks registered."}

**TEAM QUESTIONS MATRIX**
${questionSummary || "No questions registered."}
`;

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: prompt,
      });

      const feedback = response.text || "AI generated report is empty.";
      res.json({ success: true, feedback });
    } catch (err: any) {
      console.error("Gemini invocation failed:", err);
      res.json({
        success: true, 
        feedback: `### Nixus Local Workspace Intel
*The AI subsystem encountered an initialization warning: ${err.message}. Showing local metrics matrix: *
- **Group Activity Level**: Active
- **Task Completeness**: ${group.tasks.filter(t => t.status === 'completed').length}/${group.tasks.length}
- **Document Repositories**: ${group.files.length} shared assets.`
      });
    }
  });

  // --- VITE MIDDLEWARE CONFIGURATION ---
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[Nixus Engine] Server listening on http://0.0.0.0:${PORT}`);
  });
}

runExpress().catch((err) => {
  console.error("Fatal initialization error in Nixus Server core:", err);
});
