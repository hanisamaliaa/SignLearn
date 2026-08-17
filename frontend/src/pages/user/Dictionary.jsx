import { useCallback, useEffect, useMemo, useState } from "react";
import { Alert, Badge, Card, Modal } from "../../components/ui/ui";
import { BookmarkIcon, SearchIcon } from "../../components/ui/Icons";
import { letterImage } from "../../features/bisindo/alphabetImages";
import { groupByCategory, matchLetters, summarise } from "../../features/bisindo/dictionary";
import { spellPhrase, toSpellingText } from "../../features/bisindo/spelling";
import { translationService } from "../../services";

/**
 * Kamus BISINDO untuk siswa.
 *
 * Halaman ini sebelumnya TIDAK ADA. Bank Kata hanya dapat dibuka admin, jadi
 * seluruh isinya tidak pernah sampai ke anak yang seharusnya mempelajarinya.
 *
 * ── Dua sumber, dua sifat ─────────────────────────────────────────────
 *
 * Abjad dirender dari aset yang ikut dikompilasi: selalu ada, bahkan ketika API
 * mati. Kata datang dari Bank Kata dan boleh kosong. Karena itu kegagalan
 * memuat kata TIDAK mengosongkan halaman — abjadnya tetap tampil, dan itulah
 * bahan belajar utamanya saat ini.
 *
 * ── Kata tanpa berkas media ───────────────────────────────────────────
 *
 * Tidak ada entri kata yang membawa gambar atau video, dan tidak perlu:
 * ejaannya dirangkai dari 26 gambar abjad yang sama. Jadi setiap kata di Bank
 * Kata langsung dapat diperagakan tanpa satu berkas pun ditambahkan.
 */
export default function Dictionary() {
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [words, setWords] = useState([]);
  const [wordsError, setWordsError] = useState("");
  const [loading, setLoading] = useState(true);
  const [detail, setDetail] = useState(null);

  useEffect(() => {
    const timer = setTimeout(() => setSearch(searchInput.trim()), 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    const params = { limit: 100 };
    if (search) params.q = search;

    translationService.getTranslations(params)
      .then((payload) => {
        if (cancelled) return;
        setWords(payload?.items ?? []);
        setWordsError("");
      })
      .catch((error) => {
        if (cancelled) return;
        setWords([]);
        // Dicatat, tetapi tidak menghentikan halaman: abjadnya tidak
        // bergantung pada jaringan sama sekali.
        setWordsError(error?.message ?? "Daftar kata gagal dimuat.");
      })
      .finally(() => { if (!cancelled) setLoading(false); });

    return () => { cancelled = true; };
  }, [search]);

  const letters = useMemo(() => matchLetters(search), [search]);
  const groups = useMemo(() => groupByCategory(words), [words]);
  const summary = useMemo(() => summarise(words), [words]);
  const openLetter = useCallback((letter) => setDetail({ kind: "letter", letter }), []);

  const nothingFound = !letters.length && !groups.length && !loading;

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-[var(--text)]">Kamus BISINDO</h1>
          <p className="mt-1 text-[var(--text-muted)]">
            Abjad lengkap A–Z dan kumpulan kata untuk kamu pelajari.
          </p>
        </div>
        <div className="flex gap-2">
          <Badge variant="info">{summary.letters} huruf</Badge>
          {summary.words > 0 && <Badge variant="success">{summary.words} kata</Badge>}
        </div>
      </header>

      <Card padding="sm">
        <label className="relative block">
          <span className="sr-only">Cari huruf atau kata</span>
          <SearchIcon size={17} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-subtle)]" />
          <input
            className="admin-word-input pl-10"
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
            placeholder="Cari huruf atau kata, misalnya: aku"
          />
        </label>
        <p className="mt-2 text-xs text-[var(--text-subtle)]">
          Mengetik sebuah kata akan menampilkan huruf-huruf yang menyusunnya.
        </p>
      </Card>

      {nothingFound && (
        <Card>
          <p className="py-6 text-center text-sm text-[var(--text-muted)]">
            Tidak ada huruf atau kata yang cocok dengan “{search}”.
          </p>
        </Card>
      )}

      {letters.length > 0 && (
        <section aria-labelledby="dict-alphabet">
          <h2 id="dict-alphabet" className="mb-3 text-lg font-extrabold text-[var(--text)]">
            Abjad BISINDO
          </h2>
          <div className="bisindo-letter-grid">
            {letters.map((letter) => (
              <button
                type="button"
                key={letter}
                className="bisindo-letter-card"
                onClick={() => openLetter(letter)}
                aria-label={`Lihat isyarat huruf ${letter}`}
              >
                <img src={letterImage(letter)} alt="" loading="lazy" draggable="false" />
                <span>{letter}</span>
              </button>
            ))}
          </div>
        </section>
      )}

      {wordsError && <Alert type="warning" message={`${wordsError} Abjad di atas tetap bisa dipelajari.`} />}

      {groups.map((group) => (
        <section key={group.category} aria-labelledby={`dict-${group.category}`}>
          <h2 id={`dict-${group.category}`} className="mb-3 flex items-center gap-2 text-lg font-extrabold text-[var(--text)]">
            <BookmarkIcon size={18} className="text-[var(--text-subtle)]" />
            {group.category}
            <span className="text-sm font-medium text-[var(--text-subtle)]">({group.items.length})</span>
          </h2>
          <div className="bisindo-word-grid">
            {group.items.map((item) => (
              <button
                type="button"
                key={item.id}
                className="bisindo-word-card"
                onClick={() => setDetail({ kind: "word", item })}
              >
                <strong>{item.word}</strong>
                <span className="bisindo-word-spelling">{toSpellingText(item.word) || item.translation}</span>
                {item.description && <small>{item.description}</small>}
              </button>
            ))}
          </div>
        </section>
      ))}

      <p className="text-xs leading-5 text-[var(--text-subtle)]">
        Gambar alfabet berasal dari lembar BISINDO yang disetujui proyek dan
        dipotong tanpa mengubah pose, arah tangan, atau susunan jari.
      </p>

      <DetailModal detail={detail} onClose={() => setDetail(null)} />
    </div>
  );
}

/** Satu modal untuk huruf maupun kata: keduanya berakhir sebagai deretan ejaan. */
function DetailModal({ detail, onClose }) {
  // `spellPhrase` dipanggil tanpa syarat supaya urutan hook tetap sama pada
  // setiap render, termasuk saat modalnya tertutup.
  const spelled = useMemo(
    () => spellPhrase(detail?.kind === "word" ? detail.item.word : ""),
    [detail],
  );

  if (!detail) return <Modal open={false} onClose={onClose} title="" />;

  if (detail.kind === "letter") {
    return (
      <Modal open onClose={onClose} title={`Huruf ${detail.letter}`}>
        <div className="bisindo-detail">
          <img
            src={letterImage(detail.letter)}
            alt={`Isyarat BISINDO huruf ${detail.letter}`}
            className="bisindo-detail-hero"
          />
          <p>
            Bentuk tangan untuk huruf <strong>{detail.letter}</strong>. Beberapa
            huruf BISINDO memakai dua tangan, jadi perhatikan keduanya.
          </p>
        </div>
      </Modal>
    );
  }

  const { item } = detail;
  return (
    <Modal open onClose={onClose} title={item.word} size="lg">
      <div className="bisindo-detail">
        <div className="bisindo-detail-spelling">
          {spelled.words.map((word, wordIndex) => (
            <div className="bisindo-detail-word" key={`${word.text}-${wordIndex}`}>
              <div>
                {word.letters.map((char, index) => (
                  <figure key={`${char}-${index}`}>
                    <img src={letterImage(char)} alt={`Huruf ${char}`} loading="lazy" />
                    <figcaption aria-hidden="true">{char}</figcaption>
                  </figure>
                ))}
              </div>
              <span>{word.text}</span>
            </div>
          ))}
        </div>
        {item.description && <p>{item.description}</p>}
        {item.aliases?.length > 0 && (
          <p className="text-sm text-[var(--text-subtle)]">
            Juga dikenal sebagai: {item.aliases.join(", ")}
          </p>
        )}
      </div>
    </Modal>
  );
}
