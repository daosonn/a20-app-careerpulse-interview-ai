import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  User as UserIcon,
  Mail,
  FileText,
  Cpu,
  Calendar,
  Award,
  Loader2,
  Sparkles,
  Plus,
  GraduationCap,
  SlidersHorizontal,
  Briefcase,
  Settings,
  Upload,
  Download,
  Eye,
  Pencil,
  Globe,
  Gauge,
  Clock,
  Bell,
  Shield,
  Moon,
  Key,
  Building2,
  Target,
  ChevronRight,
  X,
  Check,
  Trash2,
  RefreshCw,
  ExternalLink,
  Search,
} from 'lucide-react';
import { useAuth } from '../../auth';
import { Card, Badge, Button } from '../../../components/ui';
import { cn } from '../../../lib/utils';
import { apiUrl } from '../../../lib/api';
import { extractTextFromFile } from '../../../lib/fileParser';

/* ------------------------------------------------------------------ */
/*  Types                                                               */
/* ------------------------------------------------------------------ */

type ProfileTab = 'profile' | 'jobs' | 'preferences' | 'settings';

interface TabDef {
  id: ProfileTab;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

const TABS: TabDef[] = [
  { id: 'profile', label: 'Hồ sơ', icon: UserIcon },
  { id: 'jobs', label: 'Công việc', icon: Briefcase },
  { id: 'preferences', label: 'Tuỳ chọn', icon: SlidersHorizontal },
  { id: 'settings', label: 'Cài đặt', icon: Settings },
];

interface EducationEntry {
  id: number;
  school: string;
  degree: string;
  field: string;
  year: string;
}

interface JobSuggestion {
  title: string;
  company: string;
  industry: string;
  fit: number;
  reason: string;
  url?: string;
  location?: string;
  salary?: string;
}

interface Preferences {
  preferred_language: string;
  difficulty: string;
  ai_persona: string;
  availability: string;
  default_interview_type: string;
  stress_test_default: boolean;
  auto_read_questions: boolean;
  questions_per_session: number;
}

interface SettingsData {
  ui_language: string;
  theme: string;
  email_reminders: boolean;
  ai_suggestions: boolean;
  security_alerts: boolean;
  public_profile: boolean;
  anonymous_practice: boolean;
}

/* ------------------------------------------------------------------ */
/*  Shared sub-components                                               */
/* ------------------------------------------------------------------ */

function CardHeader({
  icon: Icon,
  title,
  action,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between mb-5">
      <div className="flex items-center gap-3">
        <span className="inline-flex w-10 h-10 rounded-full bg-gold-500/15 border border-gold-500/40 items-center justify-center shrink-0">
          <Icon className="w-4 h-4 text-gold-400" aria-hidden />
        </span>
        <h3 className="font-serif text-xl text-text-primary leading-tight">
          {title}
        </h3>
      </div>
      {action}
    </div>
  );
}

function KVRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between py-2.5 border-b border-navy-700/60 last:border-0">
      <span className="text-sm text-text-muted">{label}</span>
      <span className="text-sm font-medium text-text-primary text-right max-w-[60%]">
        {value}
      </span>
    </div>
  );
}

function MiniSpinner() {
  return <Loader2 className="w-4 h-4 text-gold-400 animate-spin" aria-hidden />;
}

/* ------------------------------------------------------------------ */
/*  Main Component                                                      */
/* ------------------------------------------------------------------ */

export function Profile() {
  const { user, profile, loading, authenticatedFetch, refreshProfile } = useAuth();
  const [activeTab, setActiveTab] = useState<ProfileTab>('profile');

  if (loading || !user) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-7 h-7 text-gold-400 animate-spin" aria-hidden />
          <p className="text-text-muted text-sm font-medium tracking-wide">
            Đang tải thông tin...
          </p>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center px-4">
        <Card variant="dark" padding="md" className="max-w-lg w-full text-center space-y-4">
          <h2 className="font-serif text-2xl text-text-primary">
            Không thể tải hồ sơ
          </h2>
          <p className="text-text-muted leading-relaxed">
            Không lấy được thông tin profile từ backend. Hãy kiểm tra backend và đăng nhập lại.
          </p>
          <div className="flex justify-center">
            <Link to="/onboarding">
              <Button variant="secondary" size="md">Vào trang onboarding</Button>
            </Link>
          </div>
        </Card>
      </div>
    );
  }

  const joinDate = new Date(user.metadata.creationTime || Date.now()).toLocaleDateString('vi-VN');

  return (
    <div className="px-4 sm:px-6 lg:px-10 py-6 sm:py-8 max-w-7xl mx-auto">
      {/* ========== User Header ========== */}
      <header className="flex flex-col sm:flex-row items-center sm:items-start gap-5 mb-8">
        <div className="relative shrink-0">
          {user.photoURL ? (
            <img
              src={user.photoURL} alt={user.displayName || ''} referrerPolicy="no-referrer"
              className="w-20 h-20 rounded-full ring-[3px] ring-gold-500/50 object-cover bg-navy-700"
            />
          ) : (
            <div className="w-20 h-20 rounded-full ring-[3px] ring-gold-500/50 bg-navy-700 flex items-center justify-center">
              <UserIcon className="w-8 h-8 text-gold-400" aria-hidden />
            </div>
          )}
          <span className="absolute -bottom-0.5 -right-0.5 w-7 h-7 rounded-full bg-navy-800 border border-gold-500/60 flex items-center justify-center" aria-hidden>
            <Award className="w-3.5 h-3.5 text-gold-400" />
          </span>
        </div>
        <div className="flex-1 min-w-0 text-center sm:text-left">
          <h1 className="font-serif text-2xl sm:text-3xl leading-tight text-text-primary">
            {profile.fullName || user.displayName || 'Thành viên'}
          </h1>
          <p className="text-sm text-text-muted mt-1 flex items-center justify-center sm:justify-start gap-1.5 flex-wrap">
            <Target className="w-3.5 h-3.5 text-gold-400 shrink-0" aria-hidden />
            <span>Targeting:</span>
            <span className="text-gold-400 font-medium">
              {profile.currentPosition || 'Chưa xác định vị trí mục tiêu'}
            </span>
          </p>
        </div>
        <Link to="/setup" className="shrink-0">
          <Button variant="primary" size="sm">
            <Plus className="w-4 h-4" aria-hidden />
            Phỏng vấn mới
          </Button>
        </Link>
      </header>

      {/* ========== Tab Bar ========== */}
      <nav className="flex items-center gap-1 border-b border-navy-700/60 mb-8 overflow-x-auto" aria-label="Profile tabs">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={cn(
                'relative flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors whitespace-nowrap',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-400/60 rounded-t-lg',
                active ? 'text-gold-400' : 'text-text-muted hover:text-text-primary',
              )}
              aria-selected={active} role="tab"
            >
              <Icon className="w-4 h-4" aria-hidden />
              {tab.label}
              {active && <span className="absolute bottom-0 left-2 right-2 h-0.5 bg-gold-500 rounded-full" />}
            </button>
          );
        })}
      </nav>

      {/* ========== Outer content frame ========== */}
      <div className="rounded-2xl border border-gold-500/20 bg-navy-900/40 p-4 sm:p-6">
        {activeTab === 'profile' && (
          <ProfileTabContent
            user={user} profile={profile} joinDate={joinDate}
            authenticatedFetch={authenticatedFetch} refreshProfile={refreshProfile}
            initialEducation={profile.education}
          />
        )}
        {activeTab === 'jobs' && (
          <JobsTabContent
            authenticatedFetch={authenticatedFetch}
            skills={profile.skills}
            currentPosition={profile.currentPosition}
          />
        )}
        {activeTab === 'preferences' && <PreferencesTabContent authenticatedFetch={authenticatedFetch} initialPrefs={profile.preferences} />}
        {activeTab === 'settings' && <SettingsTabContent user={user} authenticatedFetch={authenticatedFetch} initialSettings={profile.settings} />}
      </div>
    </div>
  );
}

/* ================================================================== */
/*  TAB 1 — Hồ sơ                                                     */
/* ================================================================== */

function ProfileTabContent({
  user, profile, joinDate, authenticatedFetch, refreshProfile, initialEducation,
}: {
  user: any; profile: any; joinDate: string;
  authenticatedFetch: (url: string, opts?: RequestInit) => Promise<Response>;
  refreshProfile: () => Promise<void>;
  initialEducation?: EducationEntry[];
}) {
  return (
    <div className="grid gap-5 lg:grid-cols-3">
      <PersonalInfoCard
        user={user} profile={profile} joinDate={joinDate}
        authenticatedFetch={authenticatedFetch} refreshProfile={refreshProfile}
      />
      <EducationCard authenticatedFetch={authenticatedFetch} initialEntries={initialEducation} />
      <ResumeVaultCard
        hasCv={!!profile.cvText} cvText={profile.cvText} joinDate={joinDate}
        authenticatedFetch={authenticatedFetch} refreshProfile={refreshProfile}
      />
    </div>
  );
}

/* ----- CV Modal ----- */

// Known section headings in descending length order (longer first to avoid
// "Summary" swallowing "Professional Summary").
const CV_SECTION_KEYWORDS: string[] = [
  'Professional Summary', 'Professional Profile', 'Executive Summary',
  'Technical Skills', 'Core Skills', 'Key Skills', 'Core Competencies',
  'Work Experience', 'Work History', 'Employment History',
  'Experiences', 'Experience', 'Employment',
  'Education', 'Academic Background',
  'Certifications', 'Certification', 'Licenses',
  'Projects', 'Personal Projects', 'Notable Projects',
  'Awards', 'Achievements', 'Accomplishments', 'Honors',
  'Languages', 'Language Skills',
  'Interests', 'Hobbies',
  'References', 'Contact', 'Contact Information',
  'Volunteer', 'Publications', 'Research', 'Summary', 'Objective', 'Profile',
  // Vietnamese
  'Kinh nghiệm làm việc', 'Kinh nghiệm',
  'Học vấn', 'Kỹ năng', 'Dự án',
  'Tóm tắt', 'Mục tiêu', 'Chứng chỉ',
  'Ngôn ngữ', 'Sở thích', 'Liên hệ',
].sort((a, b) => b.length - a.length);

const CV_SECTION_KEYWORDS_LOWER = new Set(CV_SECTION_KEYWORDS.map((k) => k.toLowerCase()));

function cvEscapeRe(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Pre-normalize PDF-extracted CV text.
 *
 * PDF extractors often strip real newlines and replace them with spaces,
 * producing long single-line blobs like:
 *   "...email  Professional Summary  text...  Technical Skills  - bullet..."
 *
 * Steps:
 *   1. Insert \n around known section headings (surrounded by 2+ spaces).
 *   2. Split concatenated bullet points onto their own lines.
 *   3. Collapse 3+ consecutive spaces to one space.
 *   4. Split remaining body lines on 2+ space sequences — each gap was a
 *      real line break in the original PDF ("Degree  University  2020").
 */
function normalizeCvText(raw: string): string {
  let text = raw;

  // Step 1: section headings
  for (const kw of CV_SECTION_KEYWORDS) {
    const esc = cvEscapeRe(kw);
    text = text.replace(
      new RegExp(`[ \\t]{2,}(${esc})(?=[ \\t]{2,}|[ \\t]*[\\n]|[ \\t]*$|[ \\t]*-)`, 'gi'),
      '\n$1\n',
    );
    text = text.replace(
      new RegExp(`^(${esc})[ \\t]{2,}(?=[^\\n])`, 'gim'),
      '$1\n',
    );
  }

  // Step 2: bullets
  text = text.replace(/[ \t]{2,}(-[ \t]+|•[ \t]+)/g, '\n$1');

  // Step 3: collapse 3+ spaces
  text = text.replace(/[ \t]{3,}/g, ' ');

  // Step 4: split every line on remaining 2+ space gaps between non-space chars.
  // Bullet lines are handled separately: split only at sentence-end boundaries
  // so the bullet marker stays intact, then body-split any trailing fragments.
  const out: string[] = [];
  for (const rawLine of text.split('\n')) {
    const trimmed = rawLine.trim();
    if (!trimmed) { out.push(''); continue; }

    if (/^[-•*▪→◆✓]/.test(trimmed)) {
      // Bullet: split where a sentence ends and new content (next entry) begins
      const [bulletContent, ...trailing] = trimmed.split(/(?<=[.!?])[ \t]{2,}(?=\S)/);
      out.push(bulletContent);
      for (const fragment of trailing) {
        out.push(...fragment.split(/(?<=\S)[ \t]{2,}(?=\S)/).map(s => s.trim()).filter(Boolean));
      }
    } else {
      // Body: split on every 2+ space gap between non-space chars
      out.push(...trimmed.split(/(?<=\S)[ \t]{2,}(?=\S)/).map(s => s.trim()).filter(Boolean));
    }
  }

  return out.join('\n');
}

function cvIsSection(line: string): boolean {
  const t = line.trim().replace(/:$/, '').trim();
  if (!t || t.length < 3 || t.length > 60) return false;
  // Exact match against known keyword list (case-insensitive)
  if (CV_SECTION_KEYWORDS_LOWER.has(t.toLowerCase())) return true;
  // All-caps short line (catches custom headings like "CERTIFICATIONS" or "KỸ NĂNG")
  return t === t.toUpperCase() && /[A-ZÀÁÂÃÈÉÊÌÍÒÓÔÕÙÚÝĂĐƠƯ]{3}/.test(t);
}

function cvIsBullet(line: string): boolean {
  return /^[-•*▪→◆✓]\s/.test(line.trim()) || /^\d+[.)]\s/.test(line.trim());
}

function cvIsDateLine(line: string): boolean {
  return /\b(19|20)\d{2}\b/.test(line) && line.trim().length <= 80;
}

interface CvBlock {
  heading: string | null;
  lines: string[];
}

function parseCvBlocks(text: string): CvBlock[] {
  const allLines = normalizeCvText(text).split('\n');
  const blocks: CvBlock[] = [];
  let current: CvBlock = { heading: null, lines: [] };

  const commit = () => {
    while (current.lines.length && current.lines[current.lines.length - 1] === '') {
      current.lines.pop();
    }
    if (current.heading !== null || current.lines.some((l) => l !== '')) {
      blocks.push(current);
    }
  };

  for (const rawLine of allLines) {
    const line = rawLine.trim();
    if (cvIsSection(line)) {
      commit();
      current = { heading: line, lines: [] };
    } else if (line === '') {
      if (current.lines.length > 0 && current.lines[current.lines.length - 1] !== '') {
        current.lines.push('');
      }
    } else {
      current.lines.push(line);
    }
  }
  commit();

  return blocks;
}

function CvLine({ line }: { line: string }) {
  if (line === '') return <div className="h-3" aria-hidden />;

  if (cvIsBullet(line)) {
    const content = line.trim().replace(/^[-•*▪→◆✓]\s+/, '').replace(/^\d+[.)]\s+/, '');
    return (
      <div className="flex gap-2.5 mt-1">
        <span className="mt-[9px] w-1.5 h-1.5 rounded-full bg-gold-400/55 shrink-0" />
        <span className="text-[14px] text-text-primary leading-7">{content}</span>
      </div>
    );
  }

  if (cvIsDateLine(line)) {
    return (
      <p className="text-[12px] text-text-muted font-medium tracking-wide mt-0.5">
        {line}
      </p>
    );
  }

  // Short line without sentence-ending punctuation → job title, company, school
  const isEntryTitle = line.length <= 70 && !/[.!?,;]$/.test(line);
  if (isEntryTitle) {
    return (
      <p className="text-[15px] font-semibold text-text-primary leading-snug mt-3 first:mt-0">
        {line}
      </p>
    );
  }

  return <p className="text-[14px] text-text-secondary leading-[1.7] mt-1">{line}</p>;
}

function CvModal({ cvText, onClose }: { cvText?: string; onClose: () => void }) {
  const text = cvText?.trim() || '';
  const wordCount = text ? text.split(/\s+/).filter(Boolean).length : 0;
  const blocks = React.useMemo(() => parseCvBlocks(text), [text]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center p-4 sm:p-6 bg-black/75 backdrop-blur-sm overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-3xl my-6 flex flex-col rounded-2xl bg-navy-900 border border-navy-600/60 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-navy-700/60 shrink-0">
          <div className="flex items-center gap-3">
            <span className="inline-flex w-8 h-8 rounded-lg bg-gold-500/15 border border-gold-500/35 items-center justify-center">
              <FileText className="w-4 h-4 text-gold-400" aria-hidden />
            </span>
            <div>
              <span className="font-serif text-base text-text-primary block leading-tight">
                CV đã phân tích
              </span>
              {wordCount > 0 && (
                <span className="text-[11px] text-text-muted">
                  {wordCount.toLocaleString()} từ
                </span>
              )}
            </div>
          </div>
          <button
            className="p-1.5 rounded-md text-text-muted hover:text-text-primary hover:bg-navy-700 transition-colors"
            onClick={onClose}
            aria-label="Đóng"
          >
            <X className="w-4 h-4" aria-hidden />
          </button>
        </div>

        {/* CV body */}
        <div className="overflow-y-auto max-h-[80vh] px-6 sm:px-8 py-6">
          {!text ? (
            <p className="text-sm text-text-muted italic">Không có nội dung CV.</p>
          ) : (
            <div className="space-y-6">
              {blocks.map((block, i) => (
                <div key={i}>
                  {block.heading && (
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-[3px] h-5 bg-gold-500 rounded-full shrink-0" />
                      <span className="text-[11px] font-bold uppercase tracking-[0.22em] text-gold-400">
                        {block.heading.replace(/:$/, '')}
                      </span>
                      <div className="flex-1 h-px bg-gold-500/20" />
                    </div>
                  )}
                  {block.lines.length > 0 && (
                    <div className={block.heading ? 'pl-4' : ''}>
                      {block.lines.map((line, j) => (
                        <CvLine key={j} line={line} />
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ----- Resume Vault ----- */

function ResumeVaultCard({
  hasCv, cvText, joinDate, authenticatedFetch, refreshProfile,
}: {
  hasCv: boolean; cvText?: string; joinDate: string;
  authenticatedFetch: (url: string, opts?: RequestInit) => Promise<Response>;
  refreshProfile: () => Promise<void>;
}) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [showModal, setShowModal] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError('');
    try {
      const cvText = await extractTextFromFile(file);
      const res = await authenticatedFetch(apiUrl('/api/v1/user/cv'), {
        method: 'PUT',
        body: JSON.stringify({ cv_text: cvText }),
      });
      if (!res.ok) throw new Error('Không thể cập nhật CV.');
      await refreshProfile();
    } catch (err: any) {
      setError(err.message || 'Lỗi khi tải CV.');
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  return (
    <Card variant="highlighted" padding="md" className="flex flex-col">
      <CardHeader icon={FileText} title="Resume Vault" />
      <div className="flex-1 space-y-2.5">
        {hasCv ? (
          <div className="flex items-center gap-3 p-3 rounded-lg bg-navy-700/50 border border-navy-600/60 group">
            <span className="inline-flex w-9 h-9 rounded-lg bg-gold-500/10 border border-gold-500/30 items-center justify-center shrink-0">
              <FileText className="w-4 h-4 text-gold-400" aria-hidden />
            </span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-text-primary truncate">CV đã phân tích</p>
              <p className="text-[11px] text-text-muted">Cập nhật: {joinDate}</p>
            </div>
            <div className="flex items-center gap-1 opacity-60 group-hover:opacity-100 transition-opacity">
              <button
                className="p-1.5 rounded-md hover:bg-navy-600 text-text-muted hover:text-gold-400 transition-colors"
                title="Xem CV"
                onClick={() => setShowModal(true)}
              >
                <Eye className="w-3.5 h-3.5" aria-hidden />
              </button>
            </div>
          </div>
        ) : (
          <div className="py-8 text-center text-text-muted text-sm italic">
            Chưa có CV nào được tải lên.
          </div>
        )}
        {error && <p className="text-xs text-status-error">{error}</p>}
      </div>
      <div className="mt-4 pt-4 border-t border-navy-700/60">
        <input type="file" ref={fileRef} onChange={handleUpload} accept=".pdf,.docx,.txt" className="hidden" />
        <Button variant="secondary" size="sm" fullWidth loading={uploading} onClick={() => fileRef.current?.click()}>
          <Upload className="w-4 h-4" aria-hidden />
          {uploading ? 'Đang xử lý...' : 'Tải lên CV mới'}
        </Button>
      </div>

      {showModal && (
        <CvModal cvText={cvText} onClose={() => setShowModal(false)} />
      )}
    </Card>
  );
}

/* ----- Education ----- */

function EducationCard({
  authenticatedFetch,
  initialEntries,
}: {
  authenticatedFetch: (url: string, opts?: RequestInit) => Promise<Response>;
  initialEntries?: EducationEntry[];
}) {
  const [entries, setEntries] = useState<EducationEntry[]>(initialEntries || []);
  const [loadingList, setLoadingList] = useState(!initialEntries);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ school: '', degree: '', field: '', year: '' });

  const fetchEntries = useCallback(async () => {
    try {
      const res = await authenticatedFetch(apiUrl('/api/v1/user/education'));
      if (res.ok) setEntries(await res.json());
    } catch { /* ignore */ } finally { setLoadingList(false); }
  }, [authenticatedFetch]);

  useEffect(() => {
    if (!initialEntries) fetchEntries();
  }, [fetchEntries, initialEntries]);

  const handleAdd = async () => {
    if (!form.school.trim()) return;
    setSaving(true);
    try {
      const res = await authenticatedFetch(apiUrl('/api/v1/user/education'), {
        method: 'POST',
        body: JSON.stringify(form),
      });
      if (res.ok) {
        await fetchEntries();
        setForm({ school: '', degree: '', field: '', year: '' });
        setShowForm(false);
      }
    } catch { /* ignore */ } finally { setSaving(false); }
  };

  const handleDelete = async (id: number) => {
    try {
      await authenticatedFetch(apiUrl(`/api/v1/user/education/${id}`), { method: 'DELETE' });
      setEntries((prev) => prev.filter((e) => e.id !== id));
    } catch { /* ignore */ }
  };

  return (
    <Card variant="highlighted" padding="md" className="flex flex-col">
      <CardHeader icon={GraduationCap} title="Học vấn" />
      <div className="flex-1 space-y-2.5">
        {loadingList ? (
          <div className="py-6 flex justify-center"><MiniSpinner /></div>
        ) : entries.length === 0 && !showForm ? (
          <div className="p-3 rounded-lg bg-navy-700/50 border border-navy-600/60">
            <p className="text-sm text-text-muted">Chưa có thông tin học vấn.</p>
          </div>
        ) : (
          entries.map((edu) => (
            <div key={edu.id} className="flex items-start gap-3 p-3 rounded-lg bg-navy-700/50 border border-navy-600/60 group">
              <span className="inline-flex w-8 h-8 rounded-lg bg-gold-500/10 border border-gold-500/30 items-center justify-center shrink-0 mt-0.5">
                <GraduationCap className="w-3.5 h-3.5 text-gold-400" aria-hidden />
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-text-primary">{edu.school}</p>
                <p className="text-xs text-text-muted mt-0.5">
                  {[edu.degree, edu.field, edu.year].filter(Boolean).join(' · ')}
                </p>
              </div>
              <button onClick={() => handleDelete(edu.id)} className="p-1.5 rounded-md hover:bg-status-error/10 text-text-muted hover:text-status-error opacity-0 group-hover:opacity-100 transition-all">
                <Trash2 className="w-3.5 h-3.5" aria-hidden />
              </button>
            </div>
          ))
        )}

        {showForm && (
          <div className="space-y-2 p-3 rounded-lg bg-navy-700/50 border border-gold-500/30">
            <input value={form.school} onChange={(e) => setForm((f) => ({ ...f, school: e.target.value }))} placeholder="Tên trường *" className="w-full h-9 rounded-lg bg-navy-700 border border-navy-600 px-3 text-sm text-text-primary placeholder:text-text-muted outline-none focus:border-gold-400" />
            <div className="grid grid-cols-2 gap-2">
              <input value={form.degree} onChange={(e) => setForm((f) => ({ ...f, degree: e.target.value }))} placeholder="Bằng cấp" className="h-9 rounded-lg bg-navy-700 border border-navy-600 px-3 text-sm text-text-primary placeholder:text-text-muted outline-none focus:border-gold-400" />
              <input value={form.field} onChange={(e) => setForm((f) => ({ ...f, field: e.target.value }))} placeholder="Chuyên ngành" className="h-9 rounded-lg bg-navy-700 border border-navy-600 px-3 text-sm text-text-primary placeholder:text-text-muted outline-none focus:border-gold-400" />
            </div>
            <input value={form.year} onChange={(e) => setForm((f) => ({ ...f, year: e.target.value }))} placeholder="Năm (vd: 2018 - 2022)" className="w-full h-9 rounded-lg bg-navy-700 border border-navy-600 px-3 text-sm text-text-primary placeholder:text-text-muted outline-none focus:border-gold-400" />
            <div className="flex gap-2 pt-1">
              <Button variant="primary" size="sm" className="flex-1" loading={saving} onClick={handleAdd}>
                <Check className="w-3.5 h-3.5" aria-hidden /> Lưu
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setShowForm(false)}>
                <X className="w-3.5 h-3.5" aria-hidden />
              </Button>
            </div>
          </div>
        )}
      </div>
      {!showForm && (
        <div className="mt-4 pt-4 border-t border-navy-700/60">
          <Button variant="secondary" size="sm" fullWidth onClick={() => setShowForm(true)}>
            <Plus className="w-4 h-4" aria-hidden /> Thêm học vấn
          </Button>
        </div>
      )}
    </Card>
  );
}

/* ----- Personal Info ----- */

function PersonalInfoCard({
  user, profile, joinDate, authenticatedFetch, refreshProfile,
}: {
  user: any; profile: any; joinDate: string;
  authenticatedFetch: (url: string, opts?: RequestInit) => Promise<Response>;
  refreshProfile: () => Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    full_name: profile.fullName || user.displayName || '',
    dob: profile.dob || '',
    current_position: profile.currentPosition || '',
  });

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await authenticatedFetch(apiUrl('/api/v1/user/profile'), {
        method: 'PUT',
        body: JSON.stringify(form),
      });
      if (res.ok) {
        await refreshProfile();
        setEditing(false);
      }
    } catch { /* ignore */ } finally { setSaving(false); }
  };

  return (
    <Card variant="highlighted" padding="md" className="flex flex-col">
      <CardHeader
        icon={UserIcon} title="Thông tin cá nhân"
        action={
          !editing ? (
            <button onClick={() => setEditing(true)} className="p-2 rounded-lg hover:bg-navy-700 text-text-muted hover:text-gold-400 transition-colors">
              <Pencil className="w-4 h-4" aria-hidden />
            </button>
          ) : null
        }
      />
      <div className="flex-1">
        {editing ? (
          <div className="space-y-2.5">
            <div>
              <label className="text-[10px] uppercase tracking-widest text-text-muted mb-1 block">Họ tên</label>
              <input value={form.full_name} onChange={(e) => setForm((f) => ({ ...f, full_name: e.target.value }))} className="w-full h-9 rounded-lg bg-navy-700 border border-navy-600 px-3 text-sm text-text-primary outline-none focus:border-gold-400" />
            </div>
            <div>
              <label className="text-[10px] uppercase tracking-widest text-text-muted mb-1 block">Ngày sinh</label>
              <input value={form.dob} onChange={(e) => setForm((f) => ({ ...f, dob: e.target.value }))} placeholder="dd/mm/yyyy" className="w-full h-9 rounded-lg bg-navy-700 border border-navy-600 px-3 text-sm text-text-primary placeholder:text-text-muted outline-none focus:border-gold-400" />
            </div>
            <div>
              <label className="text-[10px] uppercase tracking-widest text-text-muted mb-1 block">Vị trí mục tiêu</label>
              <input value={form.current_position} onChange={(e) => setForm((f) => ({ ...f, current_position: e.target.value }))} className="w-full h-9 rounded-lg bg-navy-700 border border-navy-600 px-3 text-sm text-text-primary outline-none focus:border-gold-400" />
            </div>
            <div className="flex gap-2 pt-2">
              <Button variant="primary" size="sm" className="flex-1" loading={saving} onClick={handleSave}>
                <Check className="w-3.5 h-3.5" aria-hidden /> Lưu
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setEditing(false)}>
                <X className="w-3.5 h-3.5" aria-hidden /> Huỷ
              </Button>
            </div>
          </div>
        ) : (
          <>
            <KVRow label="Họ tên" value={profile.fullName || user.displayName || 'Chưa cập nhật'} />
            <KVRow label="Email" value={user.email || '—'} />
            <KVRow label="Vị trí mục tiêu" value={profile.currentPosition || 'Chưa xác định'} />
            <KVRow label="Ngày sinh" value={profile.dob || 'Chưa cập nhật'} />
            <KVRow label="Gia nhập" value={joinDate} />
            <div className="mt-4 pt-3 border-t border-navy-700/60">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-text-muted mb-2.5">Kỹ năng</p>
              <div className="flex flex-wrap gap-1.5">
                {profile.skills && profile.skills.length > 0
                  ? profile.skills.map((skill: string) => <Badge key={skill} variant="gold-outline" size="sm">{skill}</Badge>)
                  : <span className="text-xs text-text-muted italic">Chưa có kỹ năng</span>}
              </div>
            </div>
            {profile.tools && profile.tools.length > 0 && (
              <div className="mt-4 pt-3 border-t border-navy-700/60">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-text-muted mb-2.5">Công cụ</p>
                <div className="flex flex-wrap gap-1.5">
                  {profile.tools.map((tool: string) => <Badge key={tool} variant="navy" size="sm">{tool}</Badge>)}
                </div>
              </div>
            )}
            {profile.projects && profile.projects.length > 0 && (
              <div className="mt-4 pt-3 border-t border-navy-700/60">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-text-muted mb-2.5">Dự án</p>
                <div className="space-y-2">
                  {profile.projects.map((proj: any, idx: number) => (
                    <div key={idx} className="p-2 rounded-lg bg-navy-800/50 border border-navy-700/60">
                      <p className="text-xs font-bold text-gold-400">{proj.name || proj.title || 'Dự án'}</p>
                      <p className="text-[11px] text-text-muted line-clamp-2">{proj.description || proj.role}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </Card>
  );
}

/* ================================================================== */
/*  TAB 2 — Công việc                                                  */
/* ================================================================== */

interface JobPlatform {
  id: string;
  name: string;
  icon: string;
  tagline: string;
  buildUrl: (query: string) => string;
  borderClass: string;
  badgeClass: string;
}

const JOB_PLATFORMS: JobPlatform[] = [
  {
    id: 'itviec',
    name: 'ITviec',
    icon: '💻',
    tagline: 'Tuyển dụng IT chuyên biệt tại Việt Nam',
    buildUrl: (q) => `https://itviec.com/it-jobs?q=${encodeURIComponent(q)}`,
    borderClass: 'border-blue-700/40 hover:border-blue-500/60',
    badgeClass: 'bg-blue-900/30 text-blue-300',
  },
  {
    id: 'topcv',
    name: 'TopCV',
    icon: '🇻🇳',
    tagline: 'Nền tảng việc làm số 1 Việt Nam',
    buildUrl: (q) => `https://topcv.vn/tim-kiem-viec-lam?q=${encodeURIComponent(q)}&page=1`,
    borderClass: 'border-green-700/40 hover:border-green-500/60',
    badgeClass: 'bg-green-900/30 text-green-300',
  },
  {
    id: 'vietnamworks',
    name: 'VietnamWorks',
    icon: '🔍',
    tagline: 'Cổng tuyển dụng lớn nhất Việt Nam',
    buildUrl: (q) => `https://www.vietnamworks.com/viec-lam?q=${encodeURIComponent(q)}`,
    borderClass: 'border-orange-700/40 hover:border-orange-500/60',
    badgeClass: 'bg-orange-900/30 text-orange-300',
  },
  {
    id: 'linkedin',
    name: 'LinkedIn Jobs',
    icon: '🔗',
    tagline: 'Mạng nghề nghiệp toàn cầu',
    buildUrl: (q) => `https://www.linkedin.com/jobs/search/?keywords=${encodeURIComponent(q)}&location=Vietnam`,
    borderClass: 'border-sky-700/40 hover:border-sky-500/60',
    badgeClass: 'bg-sky-900/30 text-sky-300',
  },
];

function JobsTabContent({
  authenticatedFetch,
  skills,
  currentPosition,
}: {
  authenticatedFetch: (url: string, opts?: RequestInit) => Promise<Response>;
  skills?: string[];
  currentPosition?: string;
}) {
  const navigate = useNavigate();
  const [jobs, setJobs] = useState<JobSuggestion[]>([]);
  const [loadingInit, setLoadingInit] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const autoFetchedRef = useRef(false);

  const primaryQuery = currentPosition || (skills && skills.length > 0 ? skills[0] : '');
  const topSkills = skills?.slice(0, 3) ?? [];
  const hasProfile = !!(skills?.length || currentPosition);

  // On mount: check SQL cache first; auto-refresh if empty and user has profile data
  useEffect(() => {
    if (autoFetchedRef.current) return;
    autoFetchedRef.current = true;
    if (!hasProfile) return;

    (async () => {
      setLoadingInit(true);
      try {
        // Try cached results first (fast)
        const cached = await authenticatedFetch(apiUrl('/api/v1/user/suggested-jobs'));
        if (cached.ok) {
          const data = await cached.json();
          if (data.jobs?.length) {
            setJobs(data.jobs);
            return;
          }
        }
        // No cache — trigger full platform fetch + AI evaluation
        const res = await authenticatedFetch(apiUrl('/api/v1/user/suggested-jobs?refresh=true'));
        if (res.ok) {
          const data = await res.json();
          setJobs(data.jobs ?? []);
        }
      } catch { /* silent */ } finally { setLoadingInit(false); }
    })();
  }, [authenticatedFetch, hasProfile]);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      const res = await authenticatedFetch(apiUrl('/api/v1/user/suggested-jobs?refresh=true'));
      if (res.ok) {
        const data = await res.json();
        setJobs(data.jobs ?? []);
      }
    } catch { /* silent */ } finally { setRefreshing(false); }
  };

  if (loadingInit) {
    return (
      <div className="py-16 flex flex-col items-center justify-center gap-4 text-center">
        <div className="relative">
          <Loader2 className="w-8 h-8 text-gold-400 animate-spin" aria-hidden />
          <span className="absolute inset-0 rounded-full bg-gold-500/10 animate-ping" />
        </div>
        <div>
          <p className="text-sm font-medium text-text-primary">AI đang phân tích hồ sơ của bạn...</p>
          <p className="text-xs text-text-muted mt-1">Đánh giá mức độ phù hợp với từng vị trí công việc</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">

      {/* ── Platform deep-links ── */}
      <section>
        <div className="flex items-center gap-3 mb-4">
          <span className="inline-flex w-8 h-8 rounded-lg bg-gold-500/15 border border-gold-500/40 items-center justify-center shrink-0">
            <Search className="w-3.5 h-3.5 text-gold-400" aria-hidden />
          </span>
          <div>
            <h3 className="font-serif text-lg text-text-primary leading-tight">Tìm việc trực tiếp</h3>
            <p className="text-xs text-text-muted mt-0.5">
              {primaryQuery
                ? <>Tìm kiếm "<span className="text-gold-400 font-medium">{primaryQuery}</span>" trên các nền tảng việc làm IT</>
                : 'Tìm kiếm trên các nền tảng việc làm IT hàng đầu'}
            </p>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {JOB_PLATFORMS.map((platform) => (
            <a
              key={platform.id}
              href={primaryQuery ? platform.buildUrl(primaryQuery) : '#'}
              target="_blank"
              rel="noopener noreferrer"
              className={cn(
                'flex flex-col gap-3 p-4 rounded-xl bg-navy-800/60 border transition-all group',
                primaryQuery ? platform.borderClass + ' cursor-pointer' : 'border-navy-700/40 opacity-50 pointer-events-none',
              )}
            >
              <div className="flex items-center justify-between">
                <span className="text-2xl" aria-hidden>{platform.icon}</span>
                <ExternalLink className="w-3.5 h-3.5 text-text-muted group-hover:text-gold-400 transition-colors" aria-hidden />
              </div>
              <div>
                <p className="text-sm font-semibold text-text-primary group-hover:text-gold-300 transition-colors">
                  {platform.name}
                </p>
                <p className="text-[11px] text-text-muted leading-tight mt-0.5">{platform.tagline}</p>
              </div>
              {primaryQuery && (
                <span className={cn('text-[10px] font-medium px-2 py-0.5 rounded-full self-start', platform.badgeClass)}>
                  {primaryQuery}
                </span>
              )}
            </a>
          ))}
        </div>

        {/* Skill quick-links */}
        {topSkills.length > 1 && primaryQuery && (
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span className="text-[11px] text-text-muted">Kỹ năng khác:</span>
            {topSkills.filter((s) => s !== primaryQuery).map((skill) => (
              <div key={skill} className="flex items-center gap-1">
                {JOB_PLATFORMS.slice(0, 2).map((platform) => (
                  <a
                    key={platform.id}
                    href={platform.buildUrl(skill)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[11px] px-2 py-0.5 rounded-full bg-navy-700 border border-navy-600 text-text-muted hover:text-gold-400 hover:border-gold-500/40 transition-colors"
                  >
                    {skill} · {platform.name}
                  </a>
                ))}
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ── AI-matched positions ── */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <span className="inline-flex w-8 h-8 rounded-lg bg-gold-500/15 border border-gold-500/40 items-center justify-center shrink-0">
              <Sparkles className="w-3.5 h-3.5 text-gold-400" aria-hidden />
            </span>
            <div>
              <h3 className="font-serif text-lg text-text-primary leading-tight">AI Gợi ý phù hợp</h3>
              <p className="text-xs text-text-muted mt-0.5">Phân tích dựa trên CV và kỹ năng của bạn</p>
            </div>
          </div>
          <Button
            variant="ghost" size="sm"
            onClick={handleRefresh}
            loading={refreshing}
            disabled={refreshing}
          >
            <RefreshCw className={cn('w-3.5 h-3.5', refreshing && 'animate-spin')} aria-hidden />
            Làm mới
          </Button>
        </div>

        {jobs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 rounded-xl border border-dashed border-navy-600/60 text-center gap-3">
            <span className="inline-flex w-12 h-12 rounded-full bg-navy-800 border border-navy-700 items-center justify-center">
              <Briefcase className="w-5 h-5 text-text-muted" aria-hidden />
            </span>
            <div>
              <p className="text-sm font-medium text-text-primary">Chưa có gợi ý AI</p>
              <p className="text-xs text-text-muted mt-1 max-w-xs">
                {skills && skills.length > 0
                  ? 'Nhấn "Làm mới" để AI phân tích hồ sơ và đề xuất vị trí phù hợp.'
                  : 'Tải CV lên trước để AI có thể phân tích và gợi ý vị trí phù hợp.'}
              </p>
            </div>
            {!(skills && skills.length > 0) && (
              <Link to="/onboarding">
                <Button variant="secondary" size="sm">Tải CV ngay</Button>
              </Link>
            )}
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {jobs.map((job, idx) => {
              const fitColor =
                job.fit >= 80 ? 'text-green-400 border-green-500/40 bg-green-500/10' :
                job.fit >= 60 ? 'text-gold-400 border-gold-500/40 bg-gold-500/10' :
                'text-text-muted border-navy-600 bg-navy-700/50';
              return (
                <Card key={idx} variant="dark" padding="md" className="flex flex-col hover:border-gold-500/50 transition-colors group">
                  {/* Header */}
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <span className="inline-flex w-10 h-10 rounded-full bg-gold-500/15 border border-gold-500/40 items-center justify-center shrink-0">
                      <Briefcase className="w-4 h-4 text-gold-400" aria-hidden />
                    </span>
                    <div className={cn('flex items-center gap-1 px-2 py-0.5 rounded-full border text-xs font-semibold', fitColor)}>
                      <Sparkles className="w-3 h-3" aria-hidden />
                      {job.fit}% phù hợp
                    </div>
                  </div>

                  {/* Job info */}
                  <h4 className="font-serif text-base text-text-primary leading-tight mb-1">{job.title}</h4>
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-text-muted mb-2">
                    <span className="flex items-center gap-1">
                      <Building2 className="w-3 h-3 shrink-0" aria-hidden />
                      <span className="truncate max-w-[120px]">{job.company}</span>
                    </span>
                    {job.location && (
                      <>
                        <span className="text-text-muted/40">·</span>
                        <span>{job.location}</span>
                      </>
                    )}
                    {job.salary && (
                      <>
                        <span className="text-text-muted/40">·</span>
                        <span className="text-gold-400/80 font-medium">{job.salary}</span>
                      </>
                    )}
                  </div>

                  {/* AI reason */}
                  <p className="text-xs text-text-muted leading-relaxed flex-1 italic border-l-2 border-gold-500/30 pl-2">
                    {job.reason}
                  </p>

                  {/* Actions */}
                  <div className="mt-4 pt-3 border-t border-navy-700/60 flex gap-2">
                    <Button
                      variant="secondary"
                      size="sm"
                      className="flex-1"
                      onClick={() => navigate('/setup', { state: { prefillJob: { title: job.title, company: job.company, location: job.location, salary: job.salary, reason: job.reason, url: job.url } } })}
                    >
                      Luyện tập
                    </Button>
                    {job.url ? (
                      <a href={job.url} target="_blank" rel="noopener noreferrer" className="shrink-0">
                        <Button variant="ghost" size="sm" title="Xem tin tuyển dụng">
                          <ExternalLink className="w-4 h-4" aria-hidden />
                        </Button>
                      </a>
                    ) : (
                      <a
                        href={JOB_PLATFORMS[0].buildUrl(job.title)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="shrink-0"
                      >
                        <Button variant="ghost" size="sm" title="Tìm trên ITviec">
                          <Search className="w-4 h-4" aria-hidden />
                        </Button>
                      </a>
                    )}
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}

/* ================================================================== */
/*  TAB 3 — Tuỳ chọn                                                  */
/* ================================================================== */

const DEFAULT_PREFS: Preferences = {
  preferred_language: 'vi',
  difficulty: 'Normal',
  ai_persona: 'AI Coach',
  availability: '',
  default_interview_type: 'Behavioral',
  stress_test_default: false,
  auto_read_questions: true,
  questions_per_session: 5,
};

function PreferencesTabContent({
  authenticatedFetch,
  initialPrefs,
}: {
  authenticatedFetch: (url: string, opts?: RequestInit) => Promise<Response>;
  initialPrefs?: Preferences;
}) {
  const [prefs, setPrefs] = useState<Preferences>(initialPrefs || DEFAULT_PREFS);
  const [loading, setLoading] = useState(!initialPrefs);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<Partial<Preferences>>(initialPrefs || DEFAULT_PREFS);

  useEffect(() => {
    if (initialPrefs) return;
    (async () => {
      try {
        const res = await authenticatedFetch(apiUrl('/api/v1/user/preferences'));
        if (res.ok) {
          const data = await res.json();
          setPrefs(data);
          setForm(data);
        }
      } catch { /* use defaults */ } finally { setLoading(false); }
    })();
  }, [authenticatedFetch, initialPrefs]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await authenticatedFetch(apiUrl('/api/v1/user/preferences'), {
        method: 'PUT', body: JSON.stringify(form),
      });
      if (res.ok) {
        const data = await res.json();
        setPrefs(data);
        setEditing(false);
      }
    } catch { /* ignore */ } finally { setSaving(false); }
  };

  if (loading) return <div className="py-10 flex justify-center"><MiniSpinner /></div>;

  const difficultyLabel: Record<string, string> = { Normal: 'Bình thường', Advanced: 'Nâng cao', Expert: 'Chuyên gia' };

  return (
    <div className="grid gap-5 md:grid-cols-2">
      <Card variant="highlighted" padding="md">
        <CardHeader icon={SlidersHorizontal} title="Tuỳ chọn phỏng vấn" action={
          !editing ? (
            <button onClick={() => setEditing(true)} className="p-2 rounded-lg hover:bg-navy-700 text-text-muted hover:text-gold-400 transition-colors">
              <Pencil className="w-4 h-4" aria-hidden />
            </button>
          ) : null
        } />
        {editing ? (
          <div className="space-y-3">
            <div>
              <label className="text-[10px] uppercase tracking-widest text-text-muted mb-1 block">Ngôn ngữ</label>
              <select value={form.preferred_language} onChange={(e) => setForm((f) => ({ ...f, preferred_language: e.target.value }))} className="w-full h-9 rounded-lg bg-navy-700 border border-navy-600 px-3 text-sm text-text-primary outline-none focus:border-gold-400">
                <option value="vi">Tiếng Việt</option>
                <option value="en">English</option>
              </select>
            </div>
            <div>
              <label className="text-[10px] uppercase tracking-widest text-text-muted mb-1 block">Độ khó</label>
              <select value={form.difficulty} onChange={(e) => setForm((f) => ({ ...f, difficulty: e.target.value }))} className="w-full h-9 rounded-lg bg-navy-700 border border-navy-600 px-3 text-sm text-text-primary outline-none focus:border-gold-400">
                <option value="Normal">Bình thường</option>
                <option value="Advanced">Nâng cao</option>
                <option value="Expert">Chuyên gia</option>
              </select>
            </div>
            <div>
              <label className="text-[10px] uppercase tracking-widest text-text-muted mb-1 block">AI Persona</label>
              <input value={form.ai_persona || ''} onChange={(e) => setForm((f) => ({ ...f, ai_persona: e.target.value }))} className="w-full h-9 rounded-lg bg-navy-700 border border-navy-600 px-3 text-sm text-text-primary outline-none focus:border-gold-400" />
            </div>
            <div>
              <label className="text-[10px] uppercase tracking-widest text-text-muted mb-1 block">Thời gian luyện tập</label>
              <input value={form.availability || ''} onChange={(e) => setForm((f) => ({ ...f, availability: e.target.value }))} className="w-full h-9 rounded-lg bg-navy-700 border border-navy-600 px-3 text-sm text-text-primary placeholder:text-text-muted outline-none focus:border-gold-400" placeholder="Vd: Tối các ngày trong tuần" />
            </div>
            <div className="flex gap-2 pt-2">
              <Button variant="primary" size="sm" className="flex-1" loading={saving} onClick={handleSave}><Check className="w-3.5 h-3.5" aria-hidden /> Lưu</Button>
              <Button variant="ghost" size="sm" onClick={() => { setForm(prefs); setEditing(false); }}><X className="w-3.5 h-3.5" aria-hidden /></Button>
            </div>
          </div>
        ) : (
          <div>
            <KVRow label="Ngôn ngữ" value={prefs.preferred_language === 'vi' ? 'Tiếng Việt' : 'English'} />
            <KVRow label="Độ khó" value={difficultyLabel[prefs.difficulty] || prefs.difficulty} />
            <KVRow label="AI Persona" value={prefs.ai_persona} />
            <KVRow label="Thời gian" value={prefs.availability || 'Chưa đặt'} />
          </div>
        )}
      </Card>
      <Card variant="highlighted" padding="md">
        <CardHeader icon={Sparkles} title="Cài đặt luyện tập" />
        <div>
          <KVRow label="Loại phỏng vấn mặc định" value={prefs.default_interview_type} />
          <KVRow label="Chế độ Stress-test" value={prefs.stress_test_default ? 'Bật' : 'Tắt'} />
          <KVRow label="Tự động đọc câu hỏi" value={prefs.auto_read_questions ? 'Bật' : 'Tắt'} />
          <KVRow label="Số câu hỏi / phiên" value={`${prefs.questions_per_session} câu`} />
        </div>
      </Card>
    </div>
  );
}

/* ================================================================== */
/*  TAB 4 — Cài đặt                                                   */
/* ================================================================== */

const DEFAULT_SETTINGS: SettingsData = {
  ui_language: 'vi',
  theme: 'dark',
  email_reminders: true,
  ai_suggestions: true,
  security_alerts: true,
  public_profile: false,
  anonymous_practice: false,
};

function SettingsTabContent({
  user,
  authenticatedFetch,
  initialSettings,
}: {
  user: any;
  authenticatedFetch: (url: string, opts?: RequestInit) => Promise<Response>;
  initialSettings?: SettingsData;
}) {
  const [settings, setSettings] = useState<SettingsData>(initialSettings || DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(!initialSettings);

  useEffect(() => {
    if (initialSettings) return;
    (async () => {
      try {
        const res = await authenticatedFetch(apiUrl('/api/v1/user/settings'));
        if (res.ok) setSettings(await res.json());
      } catch { /* use defaults */ } finally { setLoading(false); }
    })();
  }, [authenticatedFetch, initialSettings]);

  const toggleSetting = async (field: keyof SettingsData) => {
    const newVal = !settings[field];
    setSettings((s) => ({ ...s, [field]: newVal }));
    try {
      await authenticatedFetch(apiUrl('/api/v1/user/settings'), {
        method: 'PUT', body: JSON.stringify({ [field]: newVal }),
      });
    } catch {
      setSettings((s) => ({ ...s, [field]: !newVal })); // rollback
    }
  };

  if (loading) return <div className="py-10 flex justify-center"><MiniSpinner /></div>;

  return (
    <div className="grid gap-5 md:grid-cols-2">
      <Card variant="dark" padding="md">
        <CardHeader icon={UserIcon} title="Tài khoản" />
        <KVRow label="Email" value={user.email || '—'} />
        <KVRow label="Đăng nhập" value="Google OAuth" />
        <KVRow label="UID" value={user.uid?.slice(0, 12) + '...'} />
      </Card>

      <Card variant="dark" padding="md">
        <CardHeader icon={Settings} title="Tuỳ chỉnh" />
        <KVRow label="Ngôn ngữ giao diện" value={settings.ui_language === 'vi' ? 'Tiếng Việt' : 'English'} />
        <KVRow label="Giao diện" value={settings.theme === 'dark' ? 'Dark (Navy)' : 'Light'} />
        <div className="mt-5 pt-4 border-t border-navy-700/60">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-text-muted mb-3">Thông báo</p>
          {([
            { field: 'email_reminders' as const, icon: Bell, label: 'Email nhắc luyện tập' },
            { field: 'ai_suggestions' as const, icon: Sparkles, label: 'Gợi ý phiên mới từ AI' },
            { field: 'security_alerts' as const, icon: Shield, label: 'Cảnh báo bảo mật' },
          ]).map((item) => (
            <div key={item.field} className="flex items-center justify-between py-2">
              <span className="flex items-center gap-2 text-sm text-text-primary">
                <item.icon className="w-3.5 h-3.5 text-text-muted" aria-hidden />
                {item.label}
              </span>
              <button
                onClick={() => toggleSetting(item.field)}
                className={cn('w-9 h-5 rounded-full flex items-center px-0.5 transition-colors', settings[item.field] ? 'bg-gold-500 justify-end' : 'bg-navy-600 justify-start')}
                aria-label={`${item.label}: ${settings[item.field] ? 'Bật' : 'Tắt'}`}
                role="switch" aria-checked={settings[item.field]}
              >
                <span className="w-4 h-4 rounded-full bg-white shadow-sm" />
              </button>
            </div>
          ))}
        </div>
        <div className="mt-5 pt-4 border-t border-navy-700/60">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-text-muted mb-3">Quyền riêng tư</p>
          {([
            { field: 'public_profile' as const, icon: Globe, label: 'Hồ sơ công khai' },
            { field: 'anonymous_practice' as const, icon: Moon, label: 'Ẩn danh khi luyện tập' },
          ]).map((item) => (
            <div key={item.field} className="flex items-center justify-between py-2">
              <span className="flex items-center gap-2 text-sm text-text-primary">
                <item.icon className="w-3.5 h-3.5 text-text-muted" aria-hidden />
                {item.label}
              </span>
              <button
                onClick={() => toggleSetting(item.field)}
                className={cn('w-9 h-5 rounded-full flex items-center px-0.5 transition-colors', settings[item.field] ? 'bg-gold-500 justify-end' : 'bg-navy-600 justify-start')}
                aria-label={`${item.label}: ${settings[item.field] ? 'Bật' : 'Tắt'}`}
                role="switch" aria-checked={settings[item.field]}
              >
                <span className="w-4 h-4 rounded-full bg-white shadow-sm" />
              </button>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
