import axios, { AxiosInstance } from "axios";

const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

// ── Demo data (cached for ?demo=true mode) ───────────────────────────────────
export const DEMO_CASES = [
  {
    id: 1,
    case_number: "Sessions Case No. 45/2023",
    court_name: "Additional Sessions Court, Saket, New Delhi",
    judge_name: "Hon'ble Justice Rajendra Kumar Mishra",
    petitioner: "State (Delhi Police)",
    respondent: "Ramesh Kumar Yadav",
    status: "active",
    filing_date: "2023-07-01T00:00:00",
    next_date: new Date(Date.now() + 3 * 86400000).toISOString(),
    ipc_sections: "302, 34",
    priority_score: 95.0,
    priority: "urgent",
    description: "Murder of Suresh Yadav at Govindpuri, New Delhi. Accused allegedly killed victim over property dispute.",
    estimated_duration_minutes: 60,
    assigned_user_id: 1,
    created_at: "2023-07-01T00:00:00",
    updated_at: "2024-01-15T00:00:00",
    days_until_next: 3,
    is_urgent: true,
  },
  {
    id: 2,
    case_number: "Sessions Case No. 112/2023",
    court_name: "City Sessions Court, Mumbai",
    judge_name: "Hon'ble Justice Meena Desai",
    petitioner: "State of Maharashtra",
    respondent: "Deepak Shankar Pawar",
    status: "active",
    filing_date: "2023-09-01T00:00:00",
    next_date: new Date(Date.now() + 5 * 86400000).toISOString(),
    ipc_sections: "304, 34",
    priority_score: 88.0,
    priority: "urgent",
    description: "Culpable homicide not amounting to murder. Accused assaulted victim in a drunken brawl at Dharavi.",
    estimated_duration_minutes: 45,
    assigned_user_id: 1,
    created_at: "2023-09-01T00:00:00",
    updated_at: "2024-01-15T00:00:00",
    days_until_next: 5,
    is_urgent: true,
  },
  {
    id: 3,
    case_number: "Sessions Case No. 78/2024",
    court_name: "Principal District and Sessions Court, Lucknow",
    judge_name: "Hon'ble Justice Vikas Chandra Srivastava",
    petitioner: "State of Uttar Pradesh",
    respondent: "Mohammad Arif Khan",
    status: "pending",
    filing_date: "2024-02-15T00:00:00",
    next_date: new Date(Date.now() + 2 * 86400000).toISOString(),
    ipc_sections: "307, 120B, 34",
    priority_score: 85.0,
    priority: "urgent",
    description: "Attempt to murder. Victim Anil Gupta was shot at in broad daylight near Hazratganj Market.",
    estimated_duration_minutes: 50,
    assigned_user_id: 1,
    created_at: "2024-02-15T00:00:00",
    updated_at: "2024-06-01T00:00:00",
    days_until_next: 2,
    is_urgent: true,
  },
  {
    id: 4,
    case_number: "CC No. 892/2024",
    court_name: "Chief Judicial Magistrate Court, Bengaluru",
    judge_name: "Sri M. Suresh Kumar",
    petitioner: "Kavitha Reddy",
    respondent: "Suresh B. Nair",
    status: "pending",
    filing_date: "2024-04-01T00:00:00",
    next_date: new Date(Date.now() + 10 * 86400000).toISOString(),
    ipc_sections: "324, 506",
    priority_score: 55.0,
    priority: "medium",
    description: "Voluntarily causing hurt by dangerous weapons. Complainant alleges accused attacked her with a knife.",
    estimated_duration_minutes: 30,
    assigned_user_id: null,
    created_at: "2024-04-01T00:00:00",
    updated_at: "2024-06-01T00:00:00",
    days_until_next: 10,
    is_urgent: false,
  },
  {
    id: 5,
    case_number: "Sessions Case No. 204/2023",
    court_name: "District and Sessions Court, Patna",
    judge_name: "Hon'ble Justice Santosh Kumar Singh",
    petitioner: "State of Bihar",
    respondent: "Vijay Prasad Singh & Ors",
    status: "active",
    filing_date: "2023-05-01T00:00:00",
    next_date: new Date(Date.now() + 7 * 86400000).toISOString(),
    ipc_sections: "302, 34, 120B",
    priority_score: 90.0,
    priority: "urgent",
    description: "Murder with common intention. Three accused persons allegedly attacked rival faction leader.",
    estimated_duration_minutes: 60,
    assigned_user_id: 1,
    created_at: "2023-05-01T00:00:00",
    updated_at: "2024-06-01T00:00:00",
    days_until_next: 7,
    is_urgent: true,
  },
  {
    id: 6,
    case_number: "CBI RC No. 04/2022",
    court_name: "Special CBI Court, Patiala House Courts, New Delhi",
    judge_name: "Spl. Judge Rajiv Saxena",
    petitioner: "Central Bureau of Investigation",
    respondent: "Harbans Lal Gujral & Anr",
    status: "active",
    filing_date: "2022-06-01T00:00:00",
    next_date: new Date(Date.now() + 14 * 86400000).toISOString(),
    ipc_sections: "120B, 420, 406, 477A",
    priority_score: 75.0,
    priority: "high",
    description: "Criminal conspiracy to defraud public sector banks. Accused allegedly conspired to divert Rs 450 crore.",
    estimated_duration_minutes: 90,
    assigned_user_id: 1,
    created_at: "2022-06-01T00:00:00",
    updated_at: "2024-06-01T00:00:00",
    days_until_next: 14,
    is_urgent: false,
  },
  {
    id: 7,
    case_number: "CC No. 1245/2023",
    court_name: "Metropolitan Magistrate Court, Dwarka, New Delhi",
    judge_name: "Sri Arun Mohan",
    petitioner: "Smt. Anita Verma",
    respondent: "Rajiv Bhatia",
    status: "pending",
    filing_date: "2023-10-01T00:00:00",
    next_date: new Date(Date.now() + 20 * 86400000).toISOString(),
    ipc_sections: "420, 406",
    priority_score: 45.0,
    priority: "medium",
    description: "Cheating and criminal breach of trust. Rs 8 lakh advance collected for property sale not refunded.",
    estimated_duration_minutes: 30,
    assigned_user_id: null,
    created_at: "2023-10-01T00:00:00",
    updated_at: "2024-06-01T00:00:00",
    days_until_next: 20,
    is_urgent: false,
  },
  {
    id: 8,
    case_number: "POCSO Case No. 38/2023",
    court_name: "Special POCSO Court, Chennai",
    judge_name: "Hon'ble Justice S. Kavitha",
    petitioner: "State of Tamil Nadu",
    respondent: "G. Murugesan",
    status: "active",
    filing_date: "2023-06-01T00:00:00",
    next_date: new Date(Date.now() + 4 * 86400000).toISOString(),
    ipc_sections: "376, 354, 506",
    priority_score: 92.0,
    priority: "urgent",
    description: "Rape and outraging modesty case. Victim is a minor aged 14. DNA evidence secured.",
    estimated_duration_minutes: 75,
    assigned_user_id: 1,
    created_at: "2023-06-01T00:00:00",
    updated_at: "2024-06-01T00:00:00",
    days_until_next: 4,
    is_urgent: true,
  },
  {
    id: 9,
    case_number: "Sessions Case No. 156/2024",
    court_name: "Fast Track Court, Kanpur",
    judge_name: "Hon'ble Justice Neelam Agarwal",
    petitioner: "State of UP (on complaint of Ramkali Devi)",
    respondent: "Manoj Kumar Tripathi & Anr",
    status: "pending",
    filing_date: "2024-03-01T00:00:00",
    next_date: new Date(Date.now() + 1 * 86400000).toISOString(),
    ipc_sections: "302, 304B, 498A, 34",
    priority_score: 93.0,
    priority: "urgent",
    description: "Dowry death / murder of Smt. Sunita Tripathi (age 24). Found with burn injuries within 7 years of marriage.",
    estimated_duration_minutes: 75,
    assigned_user_id: 1,
    created_at: "2024-03-01T00:00:00",
    updated_at: "2024-06-01T00:00:00",
    days_until_next: 1,
    is_urgent: true,
  },
  {
    id: 10,
    case_number: "Sessions Case No. 91/2022",
    court_name: "Additional Sessions Court, Jaipur",
    judge_name: "Hon'ble Justice Prakash Chandra Sharma",
    petitioner: "State of Rajasthan",
    respondent: "Ajay Singh Rathore & Anr",
    status: "adjourned",
    filing_date: "2022-01-01T00:00:00",
    next_date: new Date(Date.now() + 6 * 86400000).toISOString(),
    ipc_sections: "302, 120B, 34",
    priority_score: 85.0,
    priority: "urgent",
    description: "Double murder case in Sikar district. Honour killing – two deceased found hanging.",
    estimated_duration_minutes: 60,
    assigned_user_id: 1,
    created_at: "2022-01-01T00:00:00",
    updated_at: "2024-06-01T00:00:00",
    days_until_next: 6,
    is_urgent: true,
  },
];

export const DEMO_ALERTS = [
  {
    id: 1,
    case_id: 9,
    alert_type: "deadline",
    message: "URGENT: Case Sessions Case No. 156/2024 (State of UP vs Manoj Kumar Tripathi) has a hearing in 1 day on " + new Date(Date.now() + 86400000).toLocaleDateString("en-IN") + " at Fast Track Court, Kanpur.",
    is_read: false,
    triggered_at: new Date().toISOString(),
    deadline_date: new Date(Date.now() + 86400000).toISOString(),
    case_number: "Sessions Case No. 156/2024",
    petitioner: "State of UP",
  },
  {
    id: 2,
    case_id: 3,
    alert_type: "deadline",
    message: "URGENT: Case Sessions Case No. 78/2024 has a hearing in 2 days at Principal District Court, Lucknow.",
    is_read: false,
    triggered_at: new Date().toISOString(),
    deadline_date: new Date(Date.now() + 2 * 86400000).toISOString(),
    case_number: "Sessions Case No. 78/2024",
    petitioner: "State of UP",
  },
  {
    id: 3,
    case_id: 1,
    alert_type: "urgent_priority",
    message: "URGENT PRIORITY: Case Sessions Case No. 45/2023 (State Delhi Police vs Ramesh Kumar Yadav) is marked as URGENT. IPC Sections: 302, 34.",
    is_read: true,
    triggered_at: new Date(Date.now() - 86400000).toISOString(),
    deadline_date: null,
    case_number: "Sessions Case No. 45/2023",
    petitioner: "State (Delhi Police)",
  },
];

export const DEMO_STATS = {
  total: 15,
  active: 7,
  pending: 5,
  decided: 2,
  upcoming_7_days: 6,
};

export const DEMO_CAUSE_LIST = {
  date: new Date().toISOString().split("T")[0],
  court_name: "Additional Sessions Court, Saket, New Delhi",
  total_cases: 8,
  total_duration_minutes: 390,
  conflicts_detected: 1,
  entries: [
    { case_id: 9, case_number: "Sessions Case No. 156/2024", petitioner: "State of UP", respondent: "Manoj Kumar Tripathi", ipc_sections: "302, 304B", priority: "urgent", priority_score: 93, estimated_duration_minutes: 75, time_slot: "10:30 AM", slot_number: 1, judge_name: "Hon'ble Justice Neelam Agarwal", court_name: "Fast Track Court, Kanpur", status: "pending" },
    { case_id: 1, case_number: "Sessions Case No. 45/2023", petitioner: "State (Delhi Police)", respondent: "Ramesh Kumar Yadav", ipc_sections: "302, 34", priority: "urgent", priority_score: 95, estimated_duration_minutes: 60, time_slot: "11:45 AM", slot_number: 2, judge_name: "Hon'ble Justice Rajendra Kumar Mishra", court_name: "Additional Sessions Court, Saket", status: "active" },
    { case_id: 8, case_number: "POCSO Case No. 38/2023", petitioner: "State of Tamil Nadu", respondent: "G. Murugesan", ipc_sections: "376, 354", priority: "urgent", priority_score: 92, estimated_duration_minutes: 75, time_slot: "12:45 PM", slot_number: 3, judge_name: "Hon'ble Justice S. Kavitha", court_name: "Special POCSO Court, Chennai", status: "active" },
    { case_id: 5, case_number: "Sessions Case No. 204/2023", petitioner: "State of Bihar", respondent: "Vijay Prasad Singh & Ors", ipc_sections: "302, 34, 120B", priority: "urgent", priority_score: 90, estimated_duration_minutes: 60, time_slot: "02:00 PM", slot_number: 4, judge_name: "Hon'ble Justice Santosh Kumar Singh", court_name: "District Court, Patna", status: "active" },
    { case_id: 2, case_number: "Sessions Case No. 112/2023", petitioner: "State of Maharashtra", respondent: "Deepak Shankar Pawar", ipc_sections: "304, 34", priority: "urgent", priority_score: 88, estimated_duration_minutes: 45, time_slot: "03:00 PM", slot_number: 5, judge_name: "Hon'ble Justice Meena Desai", court_name: "City Sessions Court, Mumbai", status: "active" },
  ],
};

// ── HTTP client ───────────────────────────────────────────────────────────────
const isDemoMode = () => new URLSearchParams(window.location.search).get("demo") === "true";

let api: AxiosInstance;

function createApiClient() {
  const instance = axios.create({
    baseURL: BASE_URL,
    timeout: 30000,
    headers: { "Content-Type": "application/json" },
  });

  instance.interceptors.request.use((config) => {
    const token = localStorage.getItem("token");
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
  });

  instance.interceptors.response.use(
    (res) => res,
    (error) => {
      if (error.response?.status === 401) {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        window.location.href = "/login";
      }
      return Promise.reject(error);
    }
  );

  return instance;
}

api = createApiClient();

// ── Auth ──────────────────────────────────────────────────────────────────────
export const authApi = {
  login: async (email: string, password: string) => {
    if (isDemoMode()) {
      const demoUser = { id: 1, email: "judge@court.in", full_name: "Hon'ble Justice Rajendra Kumar Mishra", role: "judge", is_active: true, created_at: new Date().toISOString() };
      return { access_token: "demo_token", token_type: "bearer", user: demoUser };
    }
    const { data } = await api.post("/auth/login", { email, password });
    return data;
  },
  register: async (payload: { email: string; full_name: string; password: string; role: string }) => {
    const { data } = await api.post("/auth/register", payload);
    return data;
  },
  me: async () => {
    if (isDemoMode()) {
      return { id: 1, email: "judge@court.in", full_name: "Hon'ble Justice Rajendra Kumar Mishra", role: "judge", is_active: true, created_at: new Date().toISOString() };
    }
    const { data } = await api.get("/auth/me");
    return data;
  },
};

// ── Cases ─────────────────────────────────────────────────────────────────────
export const casesApi = {
  list: async (params?: Record<string, string | number>) => {
    if (isDemoMode()) {
      return { items: DEMO_CASES, total: DEMO_CASES.length, page: 1, size: 20 };
    }
    const { data } = await api.get("/cases", { params });
    return data;
  },
  get: async (id: number) => {
    if (isDemoMode()) {
      return DEMO_CASES.find((c) => c.id === id) || DEMO_CASES[0];
    }
    const { data } = await api.get(`/cases/${id}`);
    return data;
  },
  create: async (payload: Record<string, unknown>) => {
    const { data } = await api.post("/cases", payload);
    return data;
  },
  update: async (id: number, payload: Record<string, unknown>) => {
    const { data } = await api.put(`/cases/${id}`, payload);
    return data;
  },
  delete: async (id: number) => {
    await api.delete(`/cases/${id}`);
  },
  stats: async () => {
    if (isDemoMode()) return DEMO_STATS;
    const { data } = await api.get("/cases/stats/summary");
    return data;
  },
  documents: async (id: number) => {
    if (isDemoMode()) return [];
    const { data } = await api.get(`/cases/${id}/documents`);
    return data;
  },
};

// ── Documents ─────────────────────────────────────────────────────────────────
export const documentsApi = {
  upload: async (caseId: number, file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    const { data } = await api.post(`/documents/upload/${caseId}`, formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return data;
  },
  getText: async (docId: number) => {
    const { data } = await api.get(`/documents/${docId}/text`);
    return data;
  },
  delete: async (docId: number) => {
    await api.delete(`/documents/${docId}`);
  },
};

// ── Research ──────────────────────────────────────────────────────────────────
export const researchApi = {
  query: async (query: string, caseId?: number, topK = 5) => {
    if (isDemoMode()) {
      return {
        answer: `Based on relevant Indian legal precedents:\n\n**Query:** ${query}\n\n**Analysis:**\nIn *Bachan Singh v. State of Punjab (1980)*, the Supreme Court established the 'rarest of rare' doctrine for cases under IPC Section 302. The court held that capital punishment should be awarded only in the most exceptional circumstances.\n\nFor cases involving IPC Section 120B (criminal conspiracy), the prosecution must prove beyond reasonable doubt that there was a pre-arranged plan and meeting of minds between the accused.\n\n**Relevant IPC Provisions:**\n- Section 302: Punishment for murder (death or life imprisonment)\n- Section 34: Acts done by several persons in furtherance of common intention\n- Section 120B: Punishment for criminal conspiracy\n\n*[Demo mode – configure OPENAI_API_KEY for live RAG answers]*`,
        sources: [
          { filename: "Bachan Singh v. State of Punjab (1980)", score: 0.95, snippet: "The rarest of rare doctrine was established...", doc_id: null },
          { filename: "Mohd. Ajmal Kasab v. State of Maharashtra (2012)", score: 0.88, snippet: "Common intention under Section 34 requires prior concert...", doc_id: null },
        ],
        query,
      };
    }
    const { data } = await api.post("/research/query", { query, case_id: caseId, top_k: topK });
    return data;
  },
};

// ── Cause List ─────────────────────────────────────────────────────────────────
export const causeListApi = {
  get: async (targetDate?: string, courtName?: string) => {
    if (isDemoMode()) return DEMO_CAUSE_LIST;
    const { data } = await api.get("/cause-list", { params: { target_date: targetDate, court_name: courtName } });
    return data;
  },
};

// ── Alerts ────────────────────────────────────────────────────────────────────
export const alertsApi = {
  list: async (unreadOnly = false) => {
    if (isDemoMode()) return DEMO_ALERTS;
    const { data } = await api.get("/alerts", { params: { unread_only: unreadOnly } });
    return data;
  },
  count: async () => {
    if (isDemoMode()) return { unread: 2 };
    const { data } = await api.get("/alerts/count");
    return data;
  },
  markRead: async (id: number) => {
    if (isDemoMode()) return;
    await api.post(`/alerts/${id}/read`);
  },
  markAllRead: async () => {
    if (isDemoMode()) return;
    await api.post("/alerts/read-all");
  },
};

export default api;
