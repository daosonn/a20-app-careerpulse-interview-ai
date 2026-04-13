import { useAuth } from '../contexts/AuthContext';
import { User as UserIcon, Mail, FileText, Cpu, MapPin, Calendar, Award } from 'lucide-react';

export function Profile() {
  const { user, profile } = useAuth();

  if (!user || !profile) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="animate-pulse text-[#434654]">Đang tải thông tin...</div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-500">
      {/* Header Profile Card */}
      <div className="bg-white rounded-[2rem] shadow-xl shadow-blue-900/5 border border-[#c3c5d7]/20 p-8 md:p-12 relative overflow-hidden">
        <div className="absolute top-0 right-0 p-8 opacity-5">
          <UserIcon className="w-32 h-32 text-[#003fb1]" />
        </div>
        
        <div className="flex flex-col md:flex-row items-center gap-8 relative z-10">
          <div className="relative group">
            {user.photoURL ? (
              <img 
                src={user.photoURL} 
                alt={user.displayName || 'User'} 
                className="w-32 h-32 rounded-3xl border-4 border-white shadow-lg object-cover"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="w-32 h-32 rounded-3xl bg-[#f3f4f5] border-4 border-white shadow-lg flex items-center justify-center">
                <UserIcon className="w-12 h-12 text-[#737686]" />
              </div>
            )}
            <div className="absolute -bottom-2 -right-2 bg-[#dbe1ff] p-2 rounded-xl border-2 border-white shadow-sm">
              <Award className="w-5 h-5 text-[#003fb1]" />
            </div>
          </div>
          
          <div className="text-center md:text-left">
            <h1 className="text-4xl font-extrabold text-[#191c1d] tracking-tight mb-1">
              {profile.fullName || user.displayName || 'Thành viên mới'}
            </h1>
            <p className="text-xl font-medium text-[#003fb1] mb-4">
              {profile.currentPosition || 'Vị trí chưa xác định'}
            </p>
            <div className="flex flex-col md:flex-row gap-4 text-[#434654] font-medium">
              <div className="flex items-center justify-center md:justify-start gap-2">
                <Mail className="w-4 h-4 text-[#003fb1]" />
                {user.email}
              </div>
              <div className="flex items-center justify-center md:justify-start gap-2">
                <Calendar className="w-4 h-4 text-[#003fb1]" />
                {profile.dob ? `Ngày sinh: ${profile.dob}` : `Gia nhập: ${new Date(user.metadata.creationTime || Date.now()).toLocaleDateString('vi-VN')}`}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Left Column: Skills & Info */}
        <div className="md:col-span-1 space-y-8">
          <div className="bg-white p-8 rounded-[2rem] shadow-lg shadow-blue-900/5 border border-[#c3c5d7]/20">
            <h3 className="text-lg font-bold text-[#191c1d] flex items-center gap-2 mb-6">
              <Cpu className="w-5 h-5 text-[#003fb1]" />
              Kỹ năng nổi bật
            </h3>
            <div className="flex flex-wrap gap-2">
              {profile.skills && profile.skills.length > 0 ? (
                profile.skills.map((skill, index) => (
                  <span 
                    key={index}
                    className="px-4 py-2 bg-[#dbe1ff] text-[#003fb1] rounded-xl text-sm font-bold border border-[#003fb1]/10"
                  >
                    {skill}
                  </span>
                ))
              ) : (
                <span className="text-[#737686] italic text-sm">Chưa có thông tin kỹ năng</span>
              )}
            </div>
          </div>

          <div className="bg-white p-8 rounded-[2rem] shadow-lg shadow-blue-900/5 border border-[#c3c5d7]/20">
            <h3 className="text-lg font-bold text-[#191c1d] flex items-center gap-2 mb-6">
              <MapPin className="w-5 h-5 text-[#003fb1]" />
              Khu vực
            </h3>
            <p className="text-[#434654] font-medium">Việt Nam</p>
          </div>
        </div>

        {/* Right Column: CV Content */}
        <div className="md:col-span-2">
          <div className="bg-white p-8 rounded-[2rem] shadow-lg shadow-blue-900/5 border border-[#c3c5d7]/20 h-full flex flex-col">
            <h3 className="text-lg font-bold text-[#191c1d] flex items-center gap-2 mb-6">
              <FileText className="w-5 h-5 text-[#003fb1]" />
              Nội dung CV đã phân tích
            </h3>
            <div className="bg-[#f8f9fa] rounded-2xl p-6 flex-1 max-h-[400px] overflow-y-auto border border-[#c3c5d7]/10">
              {profile.cvText ? (
                <pre className="whitespace-pre-wrap text-[#434654] text-sm leading-relaxed font-sans">
                  {profile.cvText}
                </pre>
              ) : (
                <div className="text-center py-12 text-[#737686] italic">
                  Không tìm thấy nội dung CV. Bạn có thể cập nhật lại trong buổi phỏng vấn mới.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
