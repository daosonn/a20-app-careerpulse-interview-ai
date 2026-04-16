export const INTERVIEW_PHASES: Record<string, { icon: string, vi: string, en: string }> = {
  // Legacy indexed phases if still used as numbers 1-7
  "1": { icon: "📝", vi: "Khởi động & Giới thiệu", en: "Warm-up & Intro" },
  "2": { icon: "💼", vi: "Kinh nghiệm CV", en: "CV Deep-dive" },
  "3": { icon: "🔧", vi: "Đánh giá Phù hợp", en: "Job-fit Assessment" },
  "4": { icon: "🧠", vi: "Tình huống & Hành vi", en: "Behavioral" },
  "5": { icon: "🔥", vi: "Động lực & Tầm nhìn", en: "Motivation" },
  "6": { icon: "❓", vi: "Ứng viên hỏi", en: "Candidate Questions" },
  "7": { icon: "🤝", vi: "Kết thúc & Hỏi đáp", en: "Closing" },

  // New string phases from backend
  "Introduction": { icon: "📝", vi: "Khởi động & Giới thiệu", en: "Warm-up & Intro" },
  "CV Deep-dive": { icon: "💼", vi: "Kinh nghiệm CV", en: "CV Deep-dive" },
  "Job-fit Assessment": { icon: "🔧", vi: "Đánh giá Phù hợp", en: "Job-fit Assessment" },
  "Behavioral": { icon: "🧠", vi: "Tình huống & Hành vi", en: "Behavioral" },
  "Motivation": { icon: "🔥", vi: "Động lực & Tầm nhìn", en: "Motivation" },
  "Candidate Questions": { icon: "❓", vi: "Ứng viên hỏi", en: "Candidate Questions" },
  "Closing": { icon: "🤝", vi: "Kết thúc & Hỏi đáp", en: "Closing" }
};
