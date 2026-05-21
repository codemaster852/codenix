import React, { useState, useEffect } from "react";
import { CompanyGroup } from "../types";
import { Building2, Users, ShieldAlert, Key, Search, Sparkles, LogIn, PlusCircle } from "lucide-react";
import { motion } from "motion/react";

interface AuthScreenProps {
  onLoginSuccess: (session: {
    groupId: string;
    companyName: string;
    role: "leader" | "worker";
    workerName: string;
  }) => void;
}

export default function AuthScreen({ onLoginSuccess }: AuthScreenProps) {
  const [activeTab, setActiveTab] = useState<"join-worker" | "join-leader" | "create-group">("join-worker");
  const [availableGroups, setAvailableGroups] = useState<{ companyName: string; groupId: string }[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [filteredGroups, setFilteredGroups] = useState<{ companyName: string; groupId: string }[]>([]);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  // Form states
  const [companyName, setCompanyName] = useState("");
  const [groupId, setGroupId] = useState("");
  const [password, setPassword] = useState("");
  const [workerName, setWorkerName] = useState("");
  
  // Feedback states
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  // Fetch available companies on mount for instant lookup
  useEffect(() => {
    fetchGroups();
  }, []);

  const fetchGroups = async () => {
    try {
      const res = await fetch("/api/groups");
      const data = await res.json();
      if (data.success) {
        setAvailableGroups(data.groups);
      }
    } catch (e) {
      console.error("Failed to load autocomplete groups", e);
    }
  };

  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredGroups(availableGroups);
    } else {
      const q = searchQuery.toLowerCase();
      setFilteredGroups(
        availableGroups.filter(
          (g) =>
            g.companyName.toLowerCase().includes(q) ||
            g.groupId.toLowerCase().includes(q)
        )
      );
    }
  }, [searchQuery, availableGroups]);

  // Handle Create Company Group
  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setMessage(null);

    if (!companyName.trim() || !groupId.trim() || !password.trim()) {
      setError("Please fill in all details to create your company group.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/groups/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyName: companyName.trim(),
          groupId: groupId.trim().toLowerCase(),
          leaderPassword: password
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to create group.");
      }

      setMessage(`Nixus group "${data.group.companyName}" successfully provisioned! Now workers can join using Group ID: "${data.group.groupId}".`);
      
      // Auto switch inputs so they can log in
      setSearchQuery(data.group.companyName);
      setGroupId(data.group.groupId);
      setActiveTab("join-leader");
      await fetchGroups();
    } catch (err: any) {
      setError(err.message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  // Handle Login (Workers or Leader)
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setMessage(null);

    if (!groupId.trim() || !password.trim()) {
      setError("Group ID and Group Password are required.");
      return;
    }

    const role = activeTab === "join-leader" ? "leader" : "worker";
    if (role === "worker" && !workerName.trim()) {
      setError("Please provide your Worker Name to start claiming tasks.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/groups/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          groupId: groupId.trim().toLowerCase(),
          password: password,
          role: role,
          workerName: workerName
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Access denied. Check ID or Password.");
      }

      onLoginSuccess({
        groupId: data.groupId,
        companyName: data.companyName,
        role: data.role as "leader" | "worker",
        workerName: data.workerName
      });
    } catch (err: any) {
      setError(err.message || "Incorrect details. Please retry.");
    } finally {
      setLoading(false);
    }
  };

  const handleSelectGroupSuggestion = (g: { companyName: string; groupId: string }) => {
    setSearchQuery(g.companyName);
    setGroupId(g.groupId);
    setIsDropdownOpen(false);
  };

  return (
    <div className="min-h-screen bg-[#0b0f19] flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 font-sans transition-colors duration-300">
      
      {/* Brand Header */}
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          className="inline-flex items-center justify-center space-x-2 bg-gradient-to-tr from-emerald-500/20 to-blue-500/20 border border-emerald-500/30 p-2.5 rounded-2xl mb-4"
        >
          <Sparkles className="h-7 w-7 text-emerald-400 animate-pulse" />
          <span className="text-xl font-bold font-display tracking-wider text-white">NIXUS ENGINE</span>
        </motion.div>
        
        <h2 className="text-3xl font-bold font-display text-transparent bg-clip-text bg-gradient-to-r from-white via-gray-100 to-gray-400 tracking-tight sm:px-4">
          Corporate Task Command
        </h2>
        <p className="mt-2.5 text-sm text-gray-400 sm:px-4 leading-relaxed">
          Zero sign-ups required. Log in directly using your team group credentials or register a brand new corporate subspace.
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-[#111827] border border-gray-800 rounded-3xl overflow-hidden shadow-2xl">
          
          {/* Sub Tab Navigation */}
          <div className="flex border-b border-gray-800 bg-[#0f1524]">
            <button
              onClick={() => {
                setActiveTab("join-worker");
                setError(null);
                setMessage(null);
              }}
              className={`flex-1 py-4 text-xs font-semibold tracking-wider uppercase text-center transition-all flex items-center justify-center gap-1.5 ${
                activeTab === "join-worker"
                  ? "bg-emerald-500/5 text-emerald-400 border-b-2 border-emerald-500"
                  : "text-gray-400 hover:text-white"
              }`}
            >
              <Users className="h-4 w-4" />
              Worker Join
            </button>
            <button
              onClick={() => {
                setActiveTab("join-leader");
                setError(null);
                setMessage(null);
              }}
              className={`flex-1 py-4 text-xs font-semibold tracking-wider uppercase text-center transition-all flex items-center justify-center gap-1.5 ${
                activeTab === "join-leader"
                  ? "bg-emerald-500/5 text-emerald-400 border-b-2 border-emerald-500"
                  : "text-gray-400 hover:text-white"
              }`}
            >
              <ShieldAlert className="h-4 w-4" />
              Leader Access
            </button>
            <button
              onClick={() => {
                setActiveTab("create-group");
                setError(null);
                setMessage(null);
                // Pre-populate a clean Group ID suggestion
                if (companyName) {
                  setGroupId(companyName.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, ""));
                }
              }}
              className={`flex-1 py-4 text-xs font-semibold tracking-wider uppercase text-center transition-all flex items-center justify-center gap-1.5 ${
                activeTab === "create-group"
                  ? "bg-emerald-500/5 text-emerald-400 border-b-2 border-emerald-500"
                  : "text-gray-400 hover:text-white"
              }`}
            >
              <PlusCircle className="h-4 w-4" />
              Create Group
            </button>
          </div>

          <div className="p-6 sm:p-8">
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-5 p-3 rounded-xl bg-rose-500/15 border border-rose-500/20 text-rose-300 text-sm flex gap-2"
              >
                <div className="font-semibold text-rose-400">Error:</div>
                <div className="flex-1">{error}</div>
              </motion.div>
            )}

            {message && (
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-5 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs leading-relaxed"
              >
                {message}
              </motion.div>
            )}

            {/* CREATE GROUP FORM */}
            {activeTab === "create-group" ? (
              <form onSubmit={handleCreateGroup} className="space-y-5">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1.5">
                    Company Name
                  </label>
                  <div className="relative">
                    <Building2 className="absolute left-3 top-3 h-5 w-5 text-gray-500" />
                    <input
                      type="text"
                      required
                      placeholder="e.g. Nixus Logistics"
                      value={companyName}
                      onChange={(e) => {
                        setCompanyName(e.target.value);
                        // Clean ID generator
                        setGroupId(e.target.value.toLowerCase().trim().replace(/[^a-z0-9]/g, "-").replace(/-+/g, "-"));
                      }}
                      className="block w-full pl-10 pr-4 py-2.5 bg-[#1f2937] border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-sm transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1.5">
                    Subspace Group ID (URL Friendly)
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-2.5 text-xs font-mono text-gray-500 font-bold">id:</span>
                    <input
                      type="text"
                      required
                      placeholder="e.g. nixus-hq"
                      value={groupId}
                      onChange={(e) => setGroupId(e.target.value.toLowerCase().replace(/\s+/g, "-"))}
                      className="block w-full pl-9 pr-4 py-2.5 bg-[#1f2937] border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-sm font-mono transition-all"
                    />
                  </div>
                  <p className="mt-1 text-[11px] text-gray-500">
                    Workers will search company by name, and enter this exact code.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1.5">
                    Leader Group Password
                  </label>
                  <div className="relative">
                    <Key className="absolute left-3 top-3 h-5 w-5 text-gray-500" />
                    <input
                      type="password"
                      required
                      placeholder="Set access security key"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="block w-full pl-10 pr-4 py-2.5 bg-[#1f2937] border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-sm transition-all"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full flex items-center justify-center py-3 px-4 rounded-xl text-sm font-semibold tracking-wide text-black bg-emerald-400 hover:bg-emerald-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 transition-all disabled:opacity-50"
                >
                  {loading ? "Creating Corporate Space..." : "Install Corporate Subspace"}
                </button>
              </form>
            ) : (
              /* JOIN FORMS (Worker or Leader logged in with Group) */
              <form onSubmit={handleLogin} className="space-y-5">
                {/* Autocomplete Search Company UI */}
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1.5">
                    Search Company / Organization Name
                  </label>
                  <div className="relative">
                    <Search className="absolute left-3 top-3 h-5 w-5 text-gray-500" />
                    <input
                      type="text"
                      placeholder="Type company name to find..."
                      value={searchQuery}
                      onChange={(e) => {
                        setSearchQuery(e.target.value);
                        setIsDropdownOpen(true);
                      }}
                      onFocus={() => setIsDropdownOpen(true)}
                      className="block w-full pl-10 pr-4 py-2.5 bg-[#1f2937] border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-sm transition-all"
                    />
                    
                    {/* Auto-suggest dropdown */}
                    {isDropdownOpen && filteredGroups.length > 0 && (
                      <div className="absolute z-10 w-full mt-1.5 bg-[#1f2937] border border-gray-700 rounded-xl shadow-xl max-h-48 overflow-y-auto">
                        {filteredGroups.map((g) => (
                          <div
                            key={g.groupId}
                            onClick={() => handleSelectGroupSuggestion(g)}
                            className="px-4 py-2 hover:bg-gray-700 text-sm text-white cursor-pointer transition-colors flex justify-between items-center"
                          >
                            <span className="font-medium">{g.companyName}</span>
                            <span className="text-xs font-mono text-emerald-400 p-1 bg-emerald-950/40 rounded border border-emerald-900/30">ID: {g.groupId}</span>
                          </div>
                        ))}
                      </div>
                    )}
                    {isDropdownOpen && searchQuery && filteredGroups.length === 0 && (
                      <div className="absolute z-10 w-full mt-1.5 bg-[#1f2937] border border-gray-700 p-3 rounded-xl text-xs text-center text-gray-400">
                        No Nixus company match. Switch to the &quot;Create Group&quot; tab!
                      </div>
                    )}
                  </div>
                </div>

                {/* Subspace ID Input (Auto filled from select or editable) */}
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1.5">
                    Subspace Group ID
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Enter Group ID code"
                    value={groupId}
                    onChange={(e) => setGroupId(e.target.value.toLowerCase().replace(/\s+/g, "-"))}
                    className="block w-full px-4 py-2.5 bg-[#1f2937] border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-sm font-mono transition-all"
                  />
                </div>

                {/* Individual Worker Name (Only shown if worker tab) */}
                {activeTab === "join-worker" && (
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1.5">
                      Your Full Name (As registered worker)
                    </label>
                    <input
                      type="text"
                      required={activeTab === "join-worker"}
                      placeholder="e.g. Sarah Connor"
                      value={workerName}
                      onChange={(e) => setWorkerName(e.target.value)}
                      className="block w-full px-4 py-2.5 bg-[#1f2937] border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-3 focus:ring-emerald-500 focus:border-transparent text-sm transition-all"
                    />
                  </div>
                )}

                {/* Leadership Group Password */}
                <div>
                  <div className="flex justify-between items-center mb-1.5">
                    <label className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                      Group Access Password
                    </label>
                    <span className="text-[11px] text-gray-500 italic">Leader provided</span>
                  </div>
                  <div className="relative">
                    <Key className="absolute left-3 top-3 h-5 w-5 text-gray-500" />
                    <input
                      type="password"
                      required
                      placeholder="Enter the group password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="block w-full pl-10 pr-4 py-2.5 bg-[#1f2937] border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-sm transition-all"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-1.5 py-3 px-4 rounded-xl text-sm font-semibold tracking-wide text-black bg-emerald-400 hover:bg-emerald-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 transition-all disabled:opacity-50"
                >
                  <LogIn className="h-4 w-4" />
                  {loading ? "Verifying..." : activeTab === "join-leader" ? "Authorize Leader View" : "Authorize Worker Subspace"}
                </button>
              </form>
            )}
          </div>
          
          <div className="px-6 py-4 bg-[#0f1524] border-t border-gray-800 text-center">
            <span className="text-[11px] text-gray-400 font-mono">
              Demo Company Group: <strong className="text-emerald-400">demo-nixus</strong> / PW: <strong className="text-emerald-400">nixus123</strong>
            </span>
          </div>

        </div>
      </div>
    </div>
  );
}
