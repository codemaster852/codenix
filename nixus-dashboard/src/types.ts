export interface CompanyGroup {
  companyName: string;
  groupId: string;
  leaderPasswordHash: string; // Used to authenticate the leader
  createdAt: string;
}

export type TaskPriority = 'low' | 'medium' | 'high';
export type TaskStatus = 'pending' | 'claimed' | 'completed';

export interface Task {
  id: string;
  groupId: string;
  title: string;
  description: string;
  priority: TaskPriority;
  status: TaskStatus;
  dueDate: string;
  createdDate: string;
  assignedWorkerName: string | null;
  claimedAt: string | null;
  completedAt: string | null;
  completionNotes: string | null;
  workerFeedback: string | null; // Feedback optional on completion
}

export interface SharedFile {
  id: string;
  groupId: string;
  name: string;
  size: string; // Formatted size e.g., '1.2 MB'
  type: string;
  uploadedBy: string; // Worker name or 'Leader'
  uploadedAt: string;
  fileDataUrl?: string; // Optional raw contents / mock URLs
  downloadCount: number;
}

export interface UpdatePost {
  id: string;
  groupId: string;
  title: string;
  content: string;
  author: string; // 'Leader' or worker name
  date: string;
  isUrgent: boolean;
}

export interface QuestionItem {
  id: string;
  groupId: string;
  workerName: string;
  questionText: string;
  timestamp: string;
  answerText: string | null;
  answeredAt: string | null;
}

export interface GroupSummary {
  companyName: string;
  groupId: string;
  workersCount: number;
  tasksProgress: {
    pending: number;
    claimed: number;
    completed: number;
  };
}
