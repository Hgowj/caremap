"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, Clock, ThumbsUp, Plus, MapPin, MessageCircle, ChevronDown, ChevronUp } from "lucide-react";
import BottomNav from "@/components/BottomNav";
import ReportModal from "@/components/ReportModal";
import { REPORT_CONFIG } from "@/lib/reports";
import type { CommunityReport } from "@/lib/reports";

const DEFAULT_LAT = 1.3521;
const DEFAULT_LNG = 103.8198;

interface Comment {
  id: string;
  reportId: string;
  text: string;
  createdAt: number;
}

// In-memory comments (cleared on refresh — Phase 2: persist to D1)
const commentStore: Comment[] = [];

export default function ReportsPage() {
  const [reports, setReports]           = useState<CommunityReport[]>([]);
  const [loading, setLoading]           = useState(true);
  const [showModal, setShowModal]       = useState(false);
  const [userLocation, setUserLocation] = useState<[number, number]>([DEFAULT_LAT, DEFAULT_LNG]);
  const [expandedId, setExpandedId]     = useState<string | null>(null);
  const [comments, setComments]         = useState<Comment[]>([]);
  const [commentText, setCommentText]   = useState("");

  useEffect(() => {
    loadReports();
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (p) => setUserLocation([p.coords.latitude, p.coords.longitude]),
        () => {}
      );
    }
  }, []);

  const loadReports = async () => {
    try {
      const res  = await fetch("/api/reports");
      const data = await res.json();
      setReports(data.reports ?? []);
    } finally {
      setLoading(false);
    }
  };

  const confirm = async (id: string) => {
    setReports(prev => prev.map(r => r.id === id ? { ...r, confirmedCount: r.confirmedCount + 1 } : r));
    await fetch(`/api/reports/${id}/confirm`, { method: "POST" });
  };

  const addComment = (reportId: string) => {
    if (!commentText.trim()) return;
    const comment: Comment = {
      id: `c-${Date.now()}`,
      reportId,
      text: commentText.trim(),
      createdAt: Date.now(),
    };
    commentStore.push(comment);
    setComments([...commentStore]);
    setCommentText("");
  };

  const getComments = (reportId: string) =>
    comments.filter(c => c.reportId === reportId);

  const timeAgo = (ms: number) => {
    const diff = Date.now() - ms;
    const mins = Math.floor(diff / 60000);
    if (mins < 2)  return "just now";
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24)  return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  };

  return (
    <div className="flex flex-col" style={{ height: "100dvh", overflow: "hidden" }}>

      {/* Header */}
      <div className="px-4 pt-12 pb-4 bg-white border-b border-gray-100 shrink-0">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display font-bold text-xl text-gray-800">Community Reports</h1>
            <p className="text-sm text-gray-400 mt-0.5">Real-time conditions from caregivers</p>
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-1.5 bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold px-3 py-2 rounded-xl transition-all"
          >
            <Plus size={14} /> Report
          </button>
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <AlertTriangle size={28} className="animate-pulse text-gray-300" />
          </div>
        ) : reports.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full px-6 text-center">
            <p className="text-4xl mb-3">✅</p>
            <p className="text-gray-600 font-medium">No active reports</p>
            <p className="text-gray-400 text-sm mt-1">
              Tap <strong>Report</strong> above or the flag icon on the map.
            </p>
          </div>
        ) : (
          <div className="px-4 py-4 space-y-3">
            {reports.map((r) => {
              const config     = REPORT_CONFIG[r.category];
              if (!config) return null;
              const isExpanded = expandedId === r.id;
              const rComments  = getComments(r.id);

              return (
                <div key={r.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                  {/* Main report row */}
                  <div className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3 flex-1 min-w-0">
                        <span className="text-2xl shrink-0">{config.emoji}</span>
                        <div className="min-w-0 flex-1">
                          <p className="font-semibold text-sm text-gray-800">{config.label}</p>
                          {(r as any).locationName && (
                            <div className="flex items-center gap-1 mt-0.5">
                              <MapPin size={10} className="text-teal-500 shrink-0" />
                              <p className="text-xs text-teal-600 truncate">{(r as any).locationName}</p>
                            </div>
                          )}
                          {r.description && (
                            <p className="text-xs text-gray-500 mt-0.5">{r.description}</p>
                          )}
                          <div className="flex items-center gap-3 mt-1.5">
                            <div className="flex items-center gap-1">
                              <Clock size={10} className="text-gray-300" />
                              <span className="text-xs text-gray-400">{timeAgo(r.createdAt)}</span>
                            </div>
                            <button
                              onClick={() => setExpandedId(isExpanded ? null : r.id)}
                              className="flex items-center gap-1 text-xs text-gray-400 hover:text-teal-600 transition-colors"
                            >
                              <MessageCircle size={11} />
                              <span>{rComments.length > 0 ? `${rComments.length} comment${rComments.length !== 1 ? "s" : ""}` : "Comment"}</span>
                              {isExpanded ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Confirm/upvote */}
                      <button
                        onClick={() => confirm(r.id)}
                        className="flex flex-col items-center gap-0.5 text-teal-600 hover:text-teal-700 transition-colors shrink-0 pt-0.5"
                      >
                        <ThumbsUp size={16} />
                        <span className="text-xs font-semibold">{r.confirmedCount}</span>
                      </button>
                    </div>
                  </div>

                  {/* Expandable comments section */}
                  {isExpanded && (
                    <div className="border-t border-gray-50 bg-gray-50 px-4 py-3 space-y-2">
                      {rComments.length === 0 ? (
                        <p className="text-xs text-gray-400 text-center py-1">No comments yet. Be the first to update.</p>
                      ) : (
                        rComments.map(c => (
                          <div key={c.id} className="bg-white rounded-xl px-3 py-2">
                            <p className="text-xs text-gray-700">{c.text}</p>
                            <p className="text-[10px] text-gray-400 mt-0.5">{timeAgo(c.createdAt)}</p>
                          </div>
                        ))
                      )}
                      {/* Add comment */}
                      <div className="flex gap-2 items-center pt-1">
                        <input
                          type="text"
                          value={commentText}
                          onChange={e => setCommentText(e.target.value)}
                          onKeyDown={e => e.key === "Enter" && addComment(r.id)}
                          placeholder='e.g. "Elevator still not working as of 3pm"'
                          className="flex-1 text-xs bg-white border border-gray-200 rounded-xl px-3 py-2 outline-none focus:border-teal-400"
                        />
                        <button
                          onClick={() => addComment(r.id)}
                          disabled={!commentText.trim()}
                          className="shrink-0 bg-teal-600 disabled:opacity-40 text-white text-xs font-medium px-3 py-2 rounded-xl"
                        >
                          Post
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      <BottomNav />

      {showModal && (
        <ReportModal
          lat={userLocation[0]}
          lng={userLocation[1]}
          onClose={() => setShowModal(false)}
          onSubmit={() => { loadReports(); setShowModal(false); }}
        />
      )}
    </div>
  );
}