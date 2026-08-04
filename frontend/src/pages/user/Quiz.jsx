import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useApp } from "../../context/app";
import { Button } from "../../components/ui/ui";
import { QUIZ_QUESTIONS } from "../../data/mock";
import { XIcon, ClockIcon } from "../../components/ui/Icons";

const TOTAL = QUIZ_QUESTIONS.length;
const TIME_LIMIT = 300; // 5 minutes

export default function Quiz() {
  const { setQuizResult, recordQuizResult, selectedCourse, selectedLessonId } =
    useApp();
  const navigate = useNavigate();
  const [currentQ, setCurrentQ] = useState(0);
  const [selected, setSelected] = useState(null);
  const [answers, setAnswers] = useState(Array(TOTAL).fill(null));
  const [timeLeft, setTimeLeft] = useState(TIME_LIMIT);
  const [showExit, setShowExit] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const question = QUIZ_QUESTIONS[currentQ];

  useEffect(() => {
    if (submitted) return;

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
  }, [submitted]);

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  const timerColor =
    timeLeft < 60 ? "#E74C3C" : timeLeft < 120 ? "#F4B400" : "#4F8EF7";

  function handleSelect(idx) {
    if (submitted) return;
    setSelected(idx);
  }

  function handleNext() {
    const newAnswers = [...answers];
    newAnswers[currentQ] = selected;
    setAnswers(newAnswers);
    if (currentQ < TOTAL - 1) {
      setCurrentQ(currentQ + 1);
      setSelected(newAnswers[currentQ + 1]);
    }
  }

  function handlePrev() {
    const newAnswers = [...answers];
    newAnswers[currentQ] = selected;
    setAnswers(newAnswers);
    if (currentQ > 0) {
      setCurrentQ(currentQ - 1);
      setSelected(newAnswers[currentQ - 1]);
    }
  }

  function handleFinish() {
    const finalAnswers = [...answers];
    finalAnswers[currentQ] = selected;

    const correct = finalAnswers.filter(
      (a, i) => a === QUIZ_QUESTIONS[i].correctIndex,
    ).length;
    const score = Math.round((correct / TOTAL) * 100);

    // Determine the lesson id being quizzed (current lesson or first).
    const lessonId =
      selectedLessonId ||
      selectedCourse?.lessons?.find((l) => l.status === "current")?.id ||
      selectedCourse?.lessons?.[0]?.id;

    if (lessonId) {
      recordQuizResult(lessonId, score);
    }

    setQuizResult(score);
    setSubmitted(true);
    navigate("/quiz-result");
  }

  function handleJumpTo(i) {
    const newAnswers = [...answers];
    newAnswers[currentQ] = selected;
    setAnswers(newAnswers);
    setCurrentQ(i);
    setSelected(newAnswers[i]);
  }

  const answeredCount = answers.filter(
    (a, i) => a !== null || (i === currentQ && selected !== null),
  ).length;

  return (
    <div className="fixed inset-0 bg-[var(--surface-2)] z-50 flex flex-col overflow-hidden">
      {/* Exit confirm modal */}
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
              <Button
                variant="outline"
                fullWidth
                onClick={() => setShowExit(false)}
              >
                Lanjutkan Kuis
              </Button>
              <Button
                variant="danger"
                fullWidth
                onClick={() => navigate("/lesson")}
              >
                Ya, Keluar
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <header className="bg-[var(--surface)] border-b border-[var(--border)] px-6 py-3 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-[#4F8EF7] rounded-xl flex items-center justify-center">
            <span className="text-white text-sm font-bold">S</span>
          </div>
          <div>
            <p className="text-sm font-bold text-[var(--text)]">
              Kuis: Mengeja Kata Pendek
            </p>
            <p className="text-xs text-[var(--text-subtle)]">
              Focus Mode — Kerjakan dengan tenang
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

      {/* Progress bar */}
      <div className="h-1 bg-[#E2E8F0] flex-shrink-0">
        <div
          className="h-full bg-[#4F8EF7] transition-all duration-500"
          style={{ width: `${((currentQ + 1) / TOTAL) * 100}%` }}
        />
      </div>

      {/* Question body */}
      <div className="flex-1 overflow-y-auto flex items-center justify-center p-6">
        <div className="w-full max-w-2xl animate-fade-in">
          <div className="text-center mb-6">
            <span className="text-sm font-semibold text-[var(--text-subtle)]">
              Soal {currentQ + 1} dari {TOTAL}
            </span>
          </div>

          <div className="bg-[var(--surface)] rounded-2xl p-8 shadow-sm border border-[var(--border)] mb-6">
            <p className="text-xl font-bold text-[var(--text)] text-center leading-relaxed">
              {question.question}
            </p>
          </div>

          <div className="space-y-3 mb-8">
            {question.options.map((option, idx) => {
              const isSelected = selected === idx;
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

          <div className="flex items-center justify-between">
            <Button
              variant="outline"
              onClick={handlePrev}
              disabled={currentQ === 0}
            >
              ← Sebelumnya
            </Button>
            <div className="flex gap-1.5">
              {QUIZ_QUESTIONS.map((_, i) => (
                <button
                  key={i}
                  onClick={() => handleJumpTo(i)}
                  className={`w-8 h-8 rounded-lg text-xs font-bold transition-colors ${
                    i === currentQ
                      ? "bg-[#4F8EF7] text-white"
                      : answers[i] !== null
                        ? "bg-[var(--success-light)] text-[#2ECC71] border border-[#2ECC71]/30"
                        : "bg-[var(--surface-3)] text-[var(--text-subtle)]"
                  }`}
                >
                  {i + 1}
                </button>
              ))}
            </div>
            {currentQ < TOTAL - 1 ? (
              <Button onClick={handleNext}>Selanjutnya →</Button>
            ) : (
              <Button variant="success" onClick={handleFinish}>
                Selesai & Kumpulkan
              </Button>
            )}
          </div>

          <div className="text-center mt-4 text-xs text-[var(--text-subtle)]">
            {answeredCount} dari {TOTAL} soal terjawab
          </div>
        </div>
      </div>
    </div>
  );
}
