import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useApp } from "../../context/app";
import { Button } from "../../components/ui/ui";
import { XIcon, ClockIcon } from "../../components/ui/Icons";
import BrandLogo from "../../components/common/BrandLogo";
import SpellCameraQuestion from "../../features/quiz/SpellCameraQuestion";

/**
 * Halaman pengerjaan kuis.
 *
 * ── Yang berubah, dan kenapa itu penting ──────────────────────────────
 *
 * Soal dulu diambil dari `data/mock.js` dan skornya dihitung DI SINI:
 *
 *     const correct = answers.filter((a, i) => a === QUIZ_QUESTIONS[i].correctIndex)
 *     const score   = Math.round((correct / TOTAL) * 100)
 *
 * Artinya kunci jawaban ikut terkirim ke browser — siapa pun yang membuka
 * DevTools dapat membacanya sebelum menjawab — dan skor apa pun dapat
 * dikirimkan ke server.
 *
 * Sekarang soal datang dari API TANPA `correctIndex`, dan yang dikirim balik
 * hanyalah indeks pilihan. Server yang membandingkannya ke kunci jawaban,
 * menghitung skor, dan menentukan kelulusan terhadap KKM milik kuis itu.
 *
 * ── Dua bentuk soal ───────────────────────────────────────────────────
 *
 * `multiple-choice` menjawab dengan `selectedIndex`; `camera-spell` menjawab
 * dengan `answerText`, yaitu huruf-huruf yang berhasil diperagakan di depan
 * kamera. Keduanya tetap dinilai di server.
 *
 * Kata target soal kamera memang terlihat oleh klien — ia bagian dari
 * soalnya, karena peserta harus tahu apa yang harus dieja. Konsekuensinya
 * jujur: skor soal kamera dapat dipalsukan lewat DevTools dan layak untuk
 * latihan, bukan penilaian resmi.
 */

export default function Quiz() {
  const {
    selectedCourse,
    selectedCourseId,
    selectedLessonId,
    submitQuiz,
    setQuizResult,
  } = useApp();
  const navigate = useNavigate();

  const [quiz, setQuiz] = useState(null);
  const [sessionId,setSessionId]=useState(null);
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [submitError, setSubmitError] = useState(null);

  const [currentQ, setCurrentQ] = useState(0);
  // Satu larik untuk kedua bentuk soal: angka untuk pilihan ganda, teks untuk
  // soal kamera. Jawaban disimpan begitu dibuat, sehingga berpindah soal tidak
  // pernah bisa menghilangkannya.
  const [answers, setAnswers] = useState([]);
  const [timeLeft, setTimeLeft] = useState(300);
  const [showExit, setShowExit] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  // Di ref, bukan state: catatan huruf tidak memengaruhi apa pun yang dirender,
  // dan menaruhnya di state akan merender ulang kamera setiap huruf keliru.
  const mistakesRef = useRef({});

  /**
   * Kuis mana yang dikerjakan: diutamakan yang terikat pelajaran yang sedang
   * dibuka; bila tidak ada, kuis pertama kursus ini.
   */
  const targetQuiz = useMemo(() => {
    const list = selectedCourse?.quizzes ?? [];
    return list.find((q) => q.lessonId === selectedLessonId) ?? list[0] ?? null;
  }, [selectedCourse, selectedLessonId]);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      if (!targetQuiz || !selectedCourseId) {
        setLoading(false);
        setLoadError("Kuis untuk kursus ini belum tersedia.");
        return;
      }

      try {
        const { quizService } = await import("../../services");
        const payload = await quizService.startQuiz(selectedCourseId, targetQuiz.id);
        if (cancelled) return;

        setQuiz(payload.quiz);
        setQuestions(payload.questions ?? []);
        setSessionId(payload.session?.id??null);
        setAnswers(Array(payload.questions?.length ?? 0).fill(null));
        setTimeLeft(payload.quiz?.durationSeconds ?? 300);
        setLoading(false);
      } catch (error) {
        if (cancelled) return;
        setLoadError(error.message ?? "Gagal memuat kuis.");
        setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [targetQuiz, selectedCourseId]);

  const total = questions.length;

  const handleFinish = useCallback(async () => {
    if (submitted || total === 0) return;
    setSubmitted(true);

    /**
     * Seluruh pertanyaan WAJIB terkirim — server menolak jawaban parsial
     * (§8.12). Soal yang dilewati tetap dikirim dalam bentuk yang pasti
     * dinilai salah, bukan menggagalkan seluruh pengerjaan: indeks -1 di luar
     * jangkauan pilihan, atau teks kosong untuk soal kamera. Itu yang membuat
     * kamera yang bermasalah tidak mengunci peserta dari kursusnya.
     */
    const payload = questions.map((q, i) =>
      q.questionType === "camera-spell"
        ? {
            questionId: q.id,
            answerText: typeof answers[i] === "string" ? answers[i] : "",
            // Huruf yang sempat keliru diperagakan. Murni telemetri belajar;
            // server tidak memakainya untuk menskor.
            mistakes: mistakesRef.current[i] ?? null,
          }
        : { questionId: q.id, selectedIndex: Number.isInteger(answers[i]) ? answers[i] : -1 },
    );

    const spent = (quiz?.durationSeconds ?? 300) - timeLeft;
    const outcome = await submitQuiz(selectedCourseId, quiz.id, sessionId, payload, spent);

    if (!outcome.success) {
      setSubmitError(outcome.message);
      setSubmitted(false);
      return;
    }

    setQuizResult(outcome.result.score, outcome.result.passed);
    navigate("/quiz-result");
  }, [
    submitted, total, answers, questions, quiz, timeLeft,
    submitQuiz, selectedCourseId, sessionId, setQuizResult, navigate,
  ]);

  useEffect(() => {
    if (submitted || loading || total === 0) return;

    const timer = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          clearInterval(timer);
          handleFinish();
          return 0;
        }
        return t - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [submitted, loading, total, handleFinish]);

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  const timerColor =
    timeLeft < 60 ? "#E74C3C" : timeLeft < 120 ? "#F4B400" : "#4F8EF7";

  function recordAnswer(index, value) {
    if (submitted) return;
    setAnswers((current) => {
      if (current[index] === value) return current;
      const next = [...current];
      next[index] = value;
      return next;
    });
  }

  function handleSelect(idx) {
    recordAnswer(currentQ, idx);
  }

  // Stabil terhadap soal yang sedang dibuka: komponen kamera memanggilnya dari
  // dalam effect, dan fungsi baru setiap render akan memicu putaran tak henti.
  const handleSpellAnswer = useCallback(
    (text, mistakes) => {
      if (mistakes) mistakesRef.current[currentQ] = mistakes;
      setAnswers((current) => {
        if (current[currentQ] === text) return current;
        const next = [...current];
        next[currentQ] = text;
        return next;
      });
    },
    [currentQ],
  );

  function goToQuestion(nextIndex) {
    setCurrentQ(nextIndex);
  }

  const isAnswered = (value) =>
    typeof value === "string" ? value.length > 0 : Number.isInteger(value);
  const answeredCount = answers.filter(isAnswered).length;

  // ─── Keadaan memuat & gagal ────────────────────────────────────────────

  if (loading) {
    return (
      <div className="fixed inset-0 bg-[var(--surface-2)] z-50 flex items-center justify-center">
        <p className="text-[var(--text-muted)]">Memuat kuis…</p>
      </div>
    );
  }

  if (loadError || total === 0) {
    return (
      <div className="fixed inset-0 bg-[var(--surface-2)] z-50 flex items-center justify-center p-6">
        <div className="bg-[var(--surface)] rounded-2xl p-8 max-w-sm w-full text-center shadow-xl">
          <div className="text-4xl mb-4">📝</div>
          <h2 className="text-xl font-bold text-[var(--text)] mb-2">
            Kuis belum tersedia
          </h2>
          <p className="text-sm text-[var(--text-muted)] mb-6">
            {loadError ?? "Kuis ini belum memiliki pertanyaan."}
          </p>
          <Button fullWidth onClick={() => navigate("/courses")}>
            Kembali ke Kursus
          </Button>
        </div>
      </div>
    );
  }

  const question = questions[currentQ];

  return (
    <div className="fixed inset-0 bg-[var(--surface-2)] z-50 flex flex-col overflow-hidden">
      {showExit && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
          <div className="relative bg-[var(--surface)] rounded-2xl p-8 max-w-sm w-full shadow-xl text-center animate-scale-in">
            <div className="text-4xl mb-4">⚠️</div>
            <h2 className="text-xl font-bold text-[var(--text)] mb-2">
              Keluar dari Kuis?
            </h2>
            <p className="text-sm text-[var(--text-muted)] mb-6">
              Progres kuis Anda akan hilang jika keluar sekarang. Anda harus
              mengulang kuis dari awal.
            </p>
            <div className="flex gap-3">
              <Button variant="outline" fullWidth onClick={() => setShowExit(false)}>
                Lanjutkan Kuis
              </Button>
              <Button variant="danger" fullWidth onClick={() => navigate("/lesson")}>
                Ya, Keluar
              </Button>
            </div>
          </div>
        </div>
      )}

      <header className="bg-[var(--surface)] border-b border-[var(--border)] px-6 py-3 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-3">
          <BrandLogo className="quiz-brand" />
          <div>
            <p className="text-sm font-bold text-[var(--text)]">
              {quiz?.title ?? "Kuis"}
            </p>
            <p className="text-xs text-[var(--text-subtle)]">
              Nilai minimum lulus: {quiz?.minPassingScore ?? 70}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div
            className="flex items-center gap-2 px-4 py-2 rounded-xl font-mono font-bold text-sm"
            style={{ background: `${timerColor}18`, color: timerColor }}
          >
            <ClockIcon size={15} />
            {String(minutes).padStart(2, "0")}:
            {String(seconds).padStart(2, "0")}
          </div>
          <button
            onClick={() => setShowExit(true)}
            className="flex items-center gap-1.5 text-sm text-[var(--text-muted)] hover:text-[#E74C3C] transition-colors px-3 py-2 rounded-xl hover:bg-[var(--danger-light)]"
          >
            <XIcon size={15} /> Keluar
          </button>
        </div>
      </header>

      <div className="h-1 bg-[#E2E8F0] flex-shrink-0">
        <div
          className="h-full bg-[#4F8EF7] transition-all duration-500"
          style={{ width: `${((currentQ + 1) / total) * 100}%` }}
        />
      </div>

      <div className="flex-1 overflow-y-auto flex items-center justify-center p-6">
        <div className="w-full max-w-2xl animate-fade-in">
          <div className="text-center mb-6">
            <span className="text-sm font-semibold text-[var(--text-subtle)]">
              Soal {currentQ + 1} dari {total}
            </span>
          </div>

          <div className="bg-[var(--surface)] rounded-2xl p-8 shadow-sm border border-[var(--border)] mb-6">
            <p className="text-xl font-bold text-[var(--text)] text-center leading-relaxed">
              {question.question}
            </p>
          </div>

          {question.questionType === "camera-spell" ? (
            <div className="mb-8 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-sm">
              <SpellCameraQuestion
                key={question.id}
                target={question.answerText ?? ""}
                onAnswerChange={handleSpellAnswer}
              />
            </div>
          ) : (
          <div className="space-y-3 mb-8">
            {(question.options ?? []).map((option, idx) => {
              const isSelected = answers[currentQ] === idx;
              return (
                <button
                  key={idx}
                  onClick={() => handleSelect(idx)}
                  className={`w-full text-left p-4 rounded-xl border-2 transition-all duration-150 flex items-center gap-4 ${
                    isSelected
                      ? "border-[#4F8EF7] bg-[var(--primary-light)]"
                      : "border-[var(--border)] bg-[var(--surface)] hover:border-[#4F8EF7]/40 hover:bg-[var(--surface-2)]"
                  }`}
                >
                  <div
                    className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-sm flex-shrink-0 transition-colors ${
                      isSelected
                        ? "bg-[#4F8EF7] text-white"
                        : "bg-[var(--surface-3)] text-[var(--text-muted)]"
                    }`}
                  >
                    {String.fromCharCode(65 + idx)}
                  </div>
                  <span
                    className={`font-medium ${isSelected ? "text-[var(--primary)]" : "text-[var(--text)]"}`}
                  >
                    {option}
                  </span>
                  {isSelected && (
                    <div className="ml-auto w-5 h-5 bg-[#4F8EF7] rounded-full flex items-center justify-center">
                      <span className="text-white text-xs">✓</span>
                    </div>
                  )}
                </button>
              );
            })}
          </div>
          )}

          {submitError && (
            <div className="mb-6 p-4 rounded-xl bg-[var(--danger-light)] border border-[#E74C3C]/30 text-sm text-[#E74C3C]">
              {submitError}
            </div>
          )}

          <div className="flex items-center justify-between">
            <Button
              variant="outline"
              onClick={() => goToQuestion(currentQ - 1)}
              disabled={currentQ === 0}
            >
              ← Sebelumnya
            </Button>
            <div className="flex gap-1.5">
              {questions.map((_, i) => (
                <button
                  key={i}
                  onClick={() => goToQuestion(i)}
                  className={`w-8 h-8 rounded-lg text-xs font-bold transition-colors ${
                    i === currentQ
                      ? "bg-[#4F8EF7] text-white"
                      : isAnswered(answers[i])
                        ? "bg-[var(--success-light)] text-[#2ECC71] border border-[#2ECC71]/30"
                        : "bg-[var(--surface-3)] text-[var(--text-subtle)]"
                  }`}
                >
                  {i + 1}
                </button>
              ))}
            </div>
            {currentQ < total - 1 ? (
              <Button onClick={() => goToQuestion(currentQ + 1)}>Selanjutnya →</Button>
            ) : (
              <Button variant="success" onClick={handleFinish} disabled={submitted}>
                {submitted ? "Mengirim…" : "Selesai & Kumpulkan"}
              </Button>
            )}
          </div>

          <div className="text-center mt-4 text-xs text-[var(--text-subtle)]">
            {answeredCount} dari {total} soal terjawab
          </div>
        </div>
      </div>
    </div>
  );
}
