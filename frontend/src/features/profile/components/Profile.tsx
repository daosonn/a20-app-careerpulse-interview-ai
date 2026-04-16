import { Link } from 'react-router-dom';
import {
  User as UserIcon,
  Mail,
  FileText,
  Cpu,
  MapPin,
  Calendar,
  Award,
  Loader2,
  Sparkles,
  Plus,
} from 'lucide-react';
import { useAuth } from '../../auth';
import { Card, Badge, Button } from '../../../components/ui';

export function Profile() {
  const { user, profile } = useAuth();

  if (!user || !profile) {
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

  const joinDate = new Date(
    user.metadata.creationTime || Date.now(),
  ).toLocaleDateString('vi-VN');

  return (
    <div className="px-4 sm:px-8 lg:px-12 py-8 sm:py-10 max-w-6xl mx-auto space-y-8 animate-fadeInUp">
      {/* ---------- Header card ---------- */}
      <Card
        variant="highlighted"
        padding="lg"
        className="relative overflow-hidden"
      >
        <div className="absolute top-0 right-0 p-8 opacity-[0.05] pointer-events-none" aria-hidden>
          <UserIcon className="w-36 h-36 text-gold-400" />
        </div>

        <div className="relative z-10 flex flex-col md:flex-row items-center md:items-start gap-8">
          <div className="relative shrink-0">
            {user.photoURL ? (
              <img
                src={user.photoURL}
                alt={user.displayName || 'Ảnh đại diện'}
                referrerPolicy="no-referrer"
                className="w-28 h-28 rounded-full ring-4 ring-gold-500/50 object-cover bg-navy-700"
              />
            ) : (
              <div className="w-28 h-28 rounded-full ring-4 ring-gold-500/50 bg-navy-700 flex items-center justify-center">
                <UserIcon className="w-10 h-10 text-gold-400" aria-hidden />
              </div>
            )}
            <span
              className="absolute -bottom-1 -right-1 w-9 h-9 rounded-full bg-navy-800 border border-gold-500/60 flex items-center justify-center shadow-md"
              aria-hidden
            >
              <Award className="w-4 h-4 text-gold-400" />
            </span>
          </div>

          <div className="text-center md:text-left flex-1 min-w-0">
            <span className="inline-block text-[11px] font-semibold uppercase tracking-[0.28em] text-gold-400 mb-2">
              Hồ sơ thành viên
            </span>
            <h1 className="font-serif text-3xl sm:text-4xl leading-tight text-text-primary mb-1">
              {profile.fullName || user.displayName || 'Thành viên mới'}
            </h1>
            <p className="text-gold-300 font-medium text-lg mb-4">
              {profile.currentPosition || 'Vị trí chưa xác định'}
            </p>
            <div className="flex flex-wrap gap-x-5 gap-y-2 text-sm text-text-muted justify-center md:justify-start">
              <span className="inline-flex items-center gap-1.5">
                <Mail className="w-4 h-4 text-gold-400" aria-hidden />
                <span className="text-text-primary">{user.email}</span>
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-gold-400" aria-hidden />
                {profile.dob ? (
                  <>
                    Ngày sinh:{' '}
                    <span className="text-text-primary">{profile.dob}</span>
                  </>
                ) : (
                  <>
                    Gia nhập: <span className="text-text-primary">{joinDate}</span>
                  </>
                )}
              </span>
            </div>
          </div>

          <Link to="/setup" className="shrink-0 w-full md:w-auto">
            <Button variant="secondary" size="md" className="w-full md:w-auto">
              <Plus className="w-4 h-4" aria-hidden />
              Phỏng vấn mới
            </Button>
          </Link>
        </div>
      </Card>

      {/* ---------- Body grid ---------- */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Left column */}
        <div className="lg:col-span-1 space-y-6">
          {/* Skills */}
          <Card variant="dark" padding="md">
            <div className="flex items-center gap-2.5 mb-5">
              <span className="inline-flex w-8 h-8 rounded-full bg-gold-500/15 border border-gold-500/40 items-center justify-center">
                <Cpu className="w-4 h-4 text-gold-400" aria-hidden />
              </span>
              <h3 className="font-serif text-lg text-text-primary leading-tight">
                Kỹ năng nổi bật
              </h3>
            </div>
            <div className="flex flex-wrap gap-2">
              {profile.skills && profile.skills.length > 0 ? (
                profile.skills.map((skill) => (
                  <Badge key={skill} variant="gold-outline" size="md">
                    {skill}
                  </Badge>
                ))
              ) : (
                <p className="text-text-muted italic text-sm leading-relaxed">
                  Chưa có thông tin kỹ năng. Hoàn tất onboarding để AI tự động
                  trích xuất từ CV.
                </p>
              )}
            </div>
          </Card>

          {/* Region */}
          <Card variant="dark" padding="md">
            <div className="flex items-center gap-2.5 mb-4">
              <span className="inline-flex w-8 h-8 rounded-full bg-gold-500/15 border border-gold-500/40 items-center justify-center">
                <MapPin className="w-4 h-4 text-gold-400" aria-hidden />
              </span>
              <h3 className="font-serif text-lg text-text-primary leading-tight">
                Khu vực
              </h3>
            </div>
            <p className="text-text-primary font-medium">Việt Nam</p>
          </Card>

          {/* Preferences (placeholder — visual polish for now) */}
          <Card variant="dark" padding="md">
            <div className="flex items-center gap-2.5 mb-4">
              <span className="inline-flex w-8 h-8 rounded-full bg-gold-500/15 border border-gold-500/40 items-center justify-center">
                <Sparkles className="w-4 h-4 text-gold-400" aria-hidden />
              </span>
              <h3 className="font-serif text-lg text-text-primary leading-tight">
                Tuỳ chọn phỏng vấn
              </h3>
            </div>
            <dl className="space-y-3 text-sm">
              <div className="flex items-center justify-between">
                <dt className="text-text-muted">Ngôn ngữ</dt>
                <dd className="text-text-primary font-medium">Tiếng Việt</dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="text-text-muted">Cường độ</dt>
                <dd className="text-text-primary font-medium">Normal</dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="text-text-muted">Loại mặc định</dt>
                <dd className="text-text-primary font-medium">Behavioral</dd>
              </div>
            </dl>
          </Card>
        </div>

        {/* Right column — CV content */}
        <div className="lg:col-span-2">
          <Card variant="dark" padding="md" className="h-full flex flex-col">
            <div className="flex items-center justify-between mb-5 gap-4">
              <div className="flex items-center gap-2.5 min-w-0">
                <span className="inline-flex w-8 h-8 rounded-full bg-gold-500/15 border border-gold-500/40 items-center justify-center shrink-0">
                  <FileText className="w-4 h-4 text-gold-400" aria-hidden />
                </span>
                <h3 className="font-serif text-lg text-text-primary leading-tight truncate">
                  Hồ sơ & CV đã phân tích
                </h3>
              </div>
              <Badge variant="gold-outline">Resume Vault</Badge>
            </div>

            <div className="flex-1 bg-navy-900 border border-navy-600 rounded-xl p-5 max-h-[440px] overflow-y-auto">
              {profile.cvText ? (
                <pre className="whitespace-pre-wrap text-text-primary text-sm leading-relaxed font-sans">
                  {profile.cvText}
                </pre>
              ) : (
                <div className="text-center py-12 text-text-muted italic leading-relaxed">
                  Không tìm thấy nội dung CV. Bạn có thể cập nhật lại từ phiên
                  phỏng vấn mới.
                </div>
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
