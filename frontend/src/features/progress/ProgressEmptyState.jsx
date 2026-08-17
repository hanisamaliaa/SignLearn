import { BookIcon, ActivityIcon, TrophyIcon } from "../../components/ui/Icons";

const ICONS = {
  courses: <BookIcon size={28} />,
  quizzes: <ActivityIcon size={28} />,
  achievements: <TrophyIcon size={28} />,
};

const MESSAGES = {
  courses: {
    title: "Belum ada kursus yang kamu mulai",
    description: "Yuk, pilih materi pertama untuk dipelajari.",
    actionLabel: "Lihat Kursus",
    actionPath: "/courses",
  },
  quizzes: {
    title: "Belum ada quiz yang dikerjakan",
    description: "Selesaikan pelajaran lalu coba quiz pertamamu.",
    actionLabel: "Lanjut Belajar",
    actionPath: "/progress",
  },
  achievements: {
    title: "Pencapaianmu masih kosong",
    description: "Selesaikan pelajaran dan kuis untuk membuka pencapaian.",
    actionLabel: "Mulai Belajar",
    actionPath: "/courses",
  },
};

export default function ProgressEmptyState({ type = "courses" }) {
  const msg = MESSAGES[type] ?? MESSAGES.courses;
  const icon = ICONS[type] ?? ICONS.courses;

  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="w-16 h-16 bg-[var(--surface-3)] rounded-2xl flex items-center justify-center text-[var(--text-subtle)] mb-4">
        {icon}
      </div>
      <h3 className="text-base font-semibold text-[var(--text)] mb-1">{msg.title}</h3>
      <p className="text-sm text-[var(--text-muted)] max-w-xs">{msg.description}</p>
    </div>
  );
}
