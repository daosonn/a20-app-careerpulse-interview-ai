import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
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
          />
        )}
        {activeTab === 'jobs' && <JobsTabContent authenticatedFetch={authenticatedFetch} />}
        {activeTab === 'preferences' && <PreferencesTabContent authenticatedFetch={authenticatedFetch} />}
        {activeTab === 'settings' && <SettingsTabContent user={user} authenticatedFetch={authenticatedFetch} />}
      </div>
    </div>
  );
}

/* ================================================================== */
/*  TAB 1 — Hồ sơ                                                     */
/* ================================================================== */

function ProfileTabContent({
  user, profile, joinDate, authenticatedFetch, refreshProfile,
}: {
  user: any; profile: any; joinDate: string;
  authenticatedFetch: (url: string, opts?: RequestInit) => Promise<Response>;
  refreshProfile: () => Promise<void>;
}) {
  return (
    <div className="grid gap-5 lg:grid-cols-3">
      <ResumeVaultCard
        hasCv={!!profile.cvText} joinDate={joinDate}
        authenticatedFetch={authenticatedFetch} refreshProfile={refreshProfile}
      />
      <EducationCard authenticatedFetch={authenticatedFetch} />
      <PersonalInfoCard
        user={user} profile={profile} joinDate={joinDate}
        authenticatedFetch={authenticatedFetch} refreshProfile={refreshProfile}
      />
    </div>
  );
}

/* ----- Resume Vault ----- */

function ResumeVaultCard({
  hasCv, joinDate, authenticatedFetch, refreshProfile,
}: {
  hasCv: boolean; joinDate: string;
  authenticatedFetch: (url: string, opts?: RequestInit) => Promise<Response>;
  refreshProfile: () => Promise<void>;
}) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
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
              <button className="p-1.5 rounded-md hover:bg-navy-600 text-text-muted hover:text-gold-400 transition-colors" title="Xem">
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
    </Card>
  );
}

/* ----- Education ----- */

function EducationCard({ authenticatedFetch }: { authenticatedFetch: (url: string, opts?: RequestInit) => Promise<Response> }) {
  const [entries, setEntries] = useState<EducationEntry[]>([]);
  const [loadingList, setLoadingList] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ school: '', degree: '', field: '', year: '' });

  const fetchEntries = useCallback(async () => {
    try {
      const res = await authenticatedFetch(apiUrl('/api/v1/user/education'));
      if (res.ok) setEntries(await res.json());
    } catch { /* ignore */ } finally { setLoadingList(false); }
  }, [authenticatedFetch]);

  useEffect(() => { fetchEntries(); }, [fetchEntries]);

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
          </>
        )}
      </div>
    </Card>
  );
}

/* ================================================================== */
/*  TAB 2 — Công việc                                                  */
/* ================================================================== */

const DEFAULT_JOBS: JobSuggestion[] = [
  { title: 'Senior Product Manager', company: 'Công ty công nghệ hàng đầu', industry: 'Technology', fit: 92, reason: 'Phù hợp cao với kinh nghiệm quản lý sản phẩm và kỹ năng lãnh đạo.' },
  { title: 'Business Strategy Lead', company: 'Tập đoàn tư vấn quốc tế', industry: 'Consulting', fit: 87, reason: 'Tư duy chiến lược và khả năng phân tích phù hợp với vai trò cấp cao.' },
  { title: 'Data-Driven Operations Manager', company: 'Startup FinTech', industry: 'FinTech', fit: 81, reason: 'Nền tảng kỹ thuật kết hợp kinh nghiệm vận hành.' },
];

function JobsTabContent({ authenticatedFetch }: { authenticatedFetch: (url: string, opts?: RequestInit) => Promise<Response> }) {
  const [jobs, setJobs] = useState<JobSuggestion[]>(DEFAULT_JOBS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await authenticatedFetch(apiUrl('/api/v1/user/suggested-jobs'));
        if (res.ok) {
          const data = await res.json();
          if (data.jobs?.length) setJobs(data.jobs);
        }
      } catch { /* use defaults */ } finally { setLoading(false); }
    })();
  }, [authenticatedFetch]);

  if (loading) return <div className="py-10 flex justify-center"><MiniSpinner /></div>;

  return (
    <div className="space-y-5">
      <div>
        <h3 className="font-serif text-xl text-text-primary">Vị trí gợi ý</h3>
        <p className="text-sm text-text-muted mt-1">Dựa trên hồ sơ và kỹ năng của bạn.</p>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        {jobs.map((job) => (
          <Card key={job.title} variant="dark" padding="md" className="flex flex-col hover:border-gold-500/50 transition-colors group">
            <div className="flex items-start justify-between gap-3 mb-4">
              <span className="inline-flex w-10 h-10 rounded-full bg-gold-500/15 border border-gold-500/40 items-center justify-center shrink-0">
                <Briefcase className="w-4 h-4 text-gold-400" aria-hidden />
              </span>
              <Badge variant="gold" size="sm">{job.fit}% Fit</Badge>
            </div>
            <h4 className="font-serif text-lg text-text-primary leading-tight mb-1">{job.title}</h4>
            <div className="flex items-center gap-2 text-xs text-text-muted mb-3">
              <Building2 className="w-3 h-3" aria-hidden />
              {job.company} <span className="text-text-muted/40">·</span> {job.industry}
            </div>
            <p className="text-sm text-text-muted leading-relaxed flex-1">{job.reason}</p>
            <div className="mt-4 pt-4 border-t border-navy-700/60">
              <Link to="/setup">
                <Button variant="secondary" size="sm" fullWidth>Luyện tập cho vai trò này</Button>
              </Link>
            </div>
          </Card>
        ))}
      </div>
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

function PreferencesTabContent({ authenticatedFetch }: { authenticatedFetch: (url: string, opts?: RequestInit) => Promise<Response> }) {
  const [prefs, setPrefs] = useState<Preferences>(DEFAULT_PREFS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<Partial<Preferences>>(DEFAULT_PREFS);

  useEffect(() => {
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
  }, [authenticatedFetch]);

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

function SettingsTabContent({ user, authenticatedFetch }: { user: any; authenticatedFetch: (url: string, opts?: RequestInit) => Promise<Response> }) {
  const [settings, setSettings] = useState<SettingsData>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await authenticatedFetch(apiUrl('/api/v1/user/settings'));
        if (res.ok) setSettings(await res.json());
      } catch { /* use defaults */ } finally { setLoading(false); }
    })();
  }, [authenticatedFetch]);

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
