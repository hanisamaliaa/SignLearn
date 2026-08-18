import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Alert, Badge, Card, Modal } from "../../components/ui/ui";
import { ArrowLeftIcon, ArrowRightIcon, SearchIcon, XIcon } from "../../components/ui/Icons";
import { letterImage } from "../../features/bisindo/alphabetImages";
import { groupByCategory, matchLetters, summarise } from "../../features/bisindo/dictionary";
import { spellPhrase, toSpellingText } from "../../features/bisindo/spelling";
import { parseYouTubeId } from "../../features/lesson/youtube";
import { translationService } from "../../services";
import { useReducedMotion } from "../../hooks/useLandingMotion";

const PAGE_SIZE = 12;
const TYPE_FILTERS = [
  { key: "all", label: "Semua" },
  { key: "alphabet", label: "Abjad" },
  { key: "vocabulary", label: "Kosakata" },
];

function buildPageRange(current, total) {
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }
  const pages = [];
  pages.push(1);
  if (current > 3) pages.push("...");
  const start = Math.max(2, current - 1);
  const end = Math.min(total - 1, current + 1);
  for (let i = start; i <= end; i++) pages.push(i);
  if (current < total - 2) pages.push("...");
  if (total > 1) pages.push(total);
  return pages;
}

export default function Dictionary() {
  const reducedMotion = useReducedMotion();
  const vocabRef = useRef(null);
  const searchInputRef = useRef(null);

  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [activeType, setActiveType] = useState("all");
  const [activeCategory, setActiveCategory] = useState("Semua");
  const [currentPage, setCurrentPage] = useState(1);
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
    const params = { limit: 200 };
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
        setWordsError(error?.message ?? "Daftar kata gagal dimuat.");
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [search]);

  const letters = useMemo(() => matchLetters(search), [search]);
  const allGroups = useMemo(() => groupByCategory(words), [words]);
  const summary = useMemo(() => summarise(words), [words]);
  const openLetter = useCallback((letter) => setDetail({ kind: "letter", letter }), []);

  const categories = useMemo(() => {
    const cats = allGroups.map((g) => g.category);
    return ["Semua", ...cats];
  }, [allGroups]);

  const filteredGroups = useMemo(() => {
    if (activeCategory === "Semua") return allGroups;
    return allGroups.filter((g) => g.category === activeCategory);
  }, [allGroups, activeCategory]);

  const filteredWords = useMemo(() => {
    return filteredGroups.flatMap((g) => g.items);
  }, [filteredGroups]);

  const totalPages = Math.max(1, Math.ceil(filteredWords.length / PAGE_SIZE));
  const safePage = Math.min(currentPage, totalPages);
  const paginatedWords = useMemo(() => {
    const start = (safePage - 1) * PAGE_SIZE;
    return filteredWords.slice(start, start + PAGE_SIZE);
  }, [filteredWords, safePage]);

  const showAlphabet = activeType === "all" || activeType === "alphabet";
  const showVocabulary = activeType === "all" || activeType === "vocabulary";

  const handleClearSearch = useCallback(() => {
    setSearchInput("");
    setSearch("");
    setCurrentPage(1);
    searchInputRef.current?.focus();
  }, []);

  const handleTypeChange = (type) => {
    setActiveType(type);
    setCurrentPage(1);
  };

  const handleCategoryChange = (cat) => {
    setActiveCategory(cat);
    setCurrentPage(1);
  };

  const scrollToVocab = () => {
    if (vocabRef.current) {
      vocabRef.current.scrollIntoView({ behavior: reducedMotion ? "auto" : "smooth", block: "start" });
    }
  };

  const handlePageChange = (page) => {
    setCurrentPage(page);
    setTimeout(scrollToVocab, 50);
  };

  const handleSearchKeyDown = (event) => {
    if (event.key === "Escape" && searchInput) {
      event.preventDefault();
      handleClearSearch();
    }
  };

  const pageStart = filteredWords.length === 0 ? 0 : (safePage - 1) * PAGE_SIZE + 1;
  const pageEnd = Math.min(safePage * PAGE_SIZE, filteredWords.length);
  const pageRange = useMemo(() => buildPageRange(safePage, totalPages), [safePage, totalPages]);

  const showSearchInfo = search && !loading;
  const showSearchEmpty = search && !loading && !wordsError && filteredWords.length === 0 && (!showAlphabet || letters.length === 0);
  const searchResultCount = filteredWords.length;

  return (
    <div className="dictionary-page space-y-5">
      {/* Header */}
      <header className="dictionary-header">
        <div>
          <h1 className="text-2xl font-extrabold text-[var(--text)]">Kamus BISINDO</h1>
          <p className="mt-1 text-[var(--text-muted)]">
            Abjad lengkap A–Z dan kumpulan kata untuk kamu pelajari.
          </p>
        </div>
        <div className="dictionary-header-stats">
          <Badge variant="info">{summary.letters} huruf</Badge>
          {summary.words > 0 && <Badge variant="success">{summary.words} kata</Badge>}
        </div>
      </header>

      {/* Search */}
      <div className="dictionary-search-wrap" role="search" aria-label="Cari di Kamus BISINDO">
        <div className="dictionary-search-inner">
          <SearchIcon size={17} className="dictionary-search-icon" aria-hidden="true" />
          <input
            ref={searchInputRef}
            type="search"
            className="dictionary-search-input"
            value={searchInput}
            onChange={(event) => { setSearchInput(event.target.value); setCurrentPage(1); }}
            onKeyDown={handleSearchKeyDown}
            placeholder="Cari huruf atau kata..."
            aria-label="Cari huruf atau kata dalam kamus"
          />
          {searchInput && (
            <button
              type="button"
              className="dictionary-search-clear"
              onClick={handleClearSearch}
              aria-label="Hapus pencarian"
            >
              <XIcon size={16} />
            </button>
          )}
        </div>
        <p className="dictionary-search-hint">Contoh: A, makan, teman</p>
      </div>

      {/* Type filter */}
      <div className="dictionary-type-filter" role="tablist" aria-label="Tipe konten">
        {TYPE_FILTERS.map((f) => (
          <button
            type="button"
            key={f.key}
            role="tab"
            aria-selected={activeType === f.key}
            className={`dictionary-type-btn${activeType === f.key ? " is-active" : ""}`}
            onClick={() => handleTypeChange(f.key)}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Search info */}
      {showSearchInfo && (
        <p className="dictionary-search-info" aria-live="polite" aria-atomic="true">
          Hasil untuk &ldquo;{search}&rdquo;
          {searchResultCount > 0 && (
            <> &mdash; <strong>{searchResultCount} kata ditemukan</strong></>
          )}
        </p>
      )}

      {/* Search empty result */}
      {showSearchEmpty && (
        <Card>
          <div className="dictionary-empty">
            <p className="text-[var(--text-muted)]">
              Tidak menemukan hasil untuk &ldquo;{search}&rdquo;
            </p>
            <p className="text-xs text-[var(--text-subtle)]">
              Coba kata lain atau periksa kembali ejaannya.
            </p>
            <button type="button" className="dictionary-empty-clear" onClick={handleClearSearch}>
              Hapus pencarian
            </button>
          </div>
        </Card>
      )}

      {/* Alphabet section */}
      {showAlphabet && letters.length > 0 && (
        <section aria-labelledby="dict-alphabet">
          <h2 id="dict-alphabet" className="mb-3 text-lg font-extrabold text-[var(--text)]">
            Abjad BISINDO
          </h2>
          <div className="bisindo-letter-grid">
            {letters.map((letter, i) => (
              <motion.button
                type="button"
                key={letter}
                className="bisindo-letter-card"
                onClick={() => openLetter(letter)}
                aria-label={`Lihat isyarat huruf ${letter}`}
                initial={reducedMotion ? false : { opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: reducedMotion ? 0 : 0.25, delay: reducedMotion ? 0 : i * 0.02 }}
              >
                <img src={letterImage(letter)} alt="" loading="lazy" draggable="false" />
                <span>{letter}</span>
              </motion.button>
            ))}
          </div>
        </section>
      )}

      {/* Vocabulary error */}
      {wordsError && <Alert type="warning" message={`${wordsError} Abjad di atas tetap bisa dipelajari.`} />}

      {/* Vocabulary section */}
      {showVocabulary && (
        <section ref={vocabRef} aria-labelledby="dict-vocabulary" className="dictionary-vocab-section">
          <div className="dictionary-vocab-header">
            <h2 id="dict-vocabulary" className="text-lg font-extrabold text-[var(--text)]">
              Kosakata BISINDO
            </h2>
          </div>

          {/* Category chips */}
          {categories.length > 2 && (
            <div className="dictionary-category-chips" role="tablist" aria-label="Filter kategori">
              {categories.map((cat) => (
                <button
                  type="button"
                  key={cat}
                  role="tab"
                  aria-selected={activeCategory === cat}
                  className={`dictionary-category-chip${activeCategory === cat ? " is-active" : ""}`}
                  onClick={() => handleCategoryChange(cat)}
                >
                  {cat}
                </button>
              ))}
            </div>
          )}

          {/* Vocabulary grid */}
          {loading ? (
            <div className="bisindo-word-grid">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="bisindo-word-card dictionary-skeleton-card">
                  <div className="dictionary-skeleton-line dictionary-skeleton-title" />
                  <div className="dictionary-skeleton-line dictionary-skeleton-spelling" />
                  <div className="dictionary-skeleton-line dictionary-skeleton-desc" />
                </div>
              ))}
            </div>
          ) : paginatedWords.length > 0 ? (
            <div className="bisindo-word-grid dictionary-result-enter" key={`${search}-${safePage}-${activeCategory}`}>
              {paginatedWords.map((item) => (
                <button
                  type="button"
                  key={item.id}
                  className="bisindo-word-card"
                  onClick={() => setDetail({ kind: "word", item })}
                >
                  {item.signImage && (
                    <img
                      className="bisindo-word-thumbnail"
                      src={item.signImage}
                      alt={`Pratinjau gerakan BISINDO untuk ${item.word}`}
                      loading="lazy"
                    />
                  )}
                  <strong>{item.word}</strong>
                  <span className="bisindo-word-spelling">{toSpellingText(item.word) || item.translation}</span>
                  {item.description && <small>{item.description}</small>}
                  {(item.signImage || item.signVideo) && (
                    <span className="bisindo-word-media-badges" aria-label="Media tersedia">
                      {item.signImage && <span>Gambar</span>}
                      {item.signVideo && <span>Video</span>}
                    </span>
                  )}
                  {item.category && <span className="bisindo-word-category">{item.category}</span>}
                </button>
              ))}
            </div>
          ) : !wordsError ? (
            <Card>
              <div className="dictionary-empty">
                <p className="text-[var(--text-muted)]">Belum ada kata di kategori ini.</p>
              </div>
            </Card>
          ) : null}

          {/* Pagination */}
          {!loading && filteredWords.length > PAGE_SIZE && (
            <nav className="dictionary-pagination" aria-label="Navigasi halaman kosakata">
              <p className="dictionary-pagination-info">
                Menampilkan {pageStart}–{pageEnd} dari {filteredWords.length} kata
              </p>
              <div className="dictionary-pagination-controls">
                <button
                  type="button"
                  className="dictionary-pagination-btn"
                  disabled={safePage <= 1}
                  onClick={() => handlePageChange(safePage - 1)}
                  aria-label="Halaman sebelumnya"
                >
                  <ArrowLeftIcon size={15} /> Sebelumnya
                </button>
                <div className="dictionary-pagination-pages" role="list">
                  {pageRange.map((page, i) =>
                    page === "..." ? (
                      <span key={`ellipsis-${i}`} className="dictionary-pagination-ellipsis" aria-hidden="true">
                        …
                      </span>
                    ) : (
                      <button
                        type="button"
                        key={page}
                        role="listitem"
                        className={`dictionary-pagination-page${page === safePage ? " is-active" : ""}`}
                        onClick={() => handlePageChange(page)}
                        aria-label={`Halaman ${page}`}
                        aria-current={page === safePage ? "page" : undefined}
                      >
                        {page}
                      </button>
                    )
                  )}
                </div>
                <button
                  type="button"
                  className="dictionary-pagination-btn"
                  disabled={safePage >= totalPages}
                  onClick={() => handlePageChange(safePage + 1)}
                  aria-label="Halaman berikutnya"
                >
                  Berikutnya <ArrowRightIcon size={15} />
                </button>
              </div>
            </nav>
          )}
        </section>
      )}

      <p className="text-xs leading-5 text-[var(--text-subtle)]">
        Gambar alfabet berasal dari lembar BISINDO yang disetujui proyek dan
        dipotong tanpa mengubah pose, arah tangan, atau susunan jari.
      </p>

      <DetailModal detail={detail} onClose={() => setDetail(null)} />
    </div>
  );
}

function DetailModal({ detail, onClose }) {
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
  const youtubeId = parseYouTubeId(item.signVideo);
  return (
    <Modal open onClose={onClose} title={item.word} size="lg">
      <div className="bisindo-detail">
        {(item.signImage || item.signVideo) && (
          <section className="bisindo-detail-media" aria-label={`Media gerakan ${item.word}`}>
            {item.signImage && (
              <figure>
                <img src={item.signImage} alt={`Gerakan BISINDO untuk ${item.word}`} />
                <figcaption>Gambar gerakan</figcaption>
              </figure>
            )}
            {item.signVideo && (
              <div className="bisindo-detail-video">
                {youtubeId ? (
                  <iframe
                    src={`https://www.youtube-nocookie.com/embed/${youtubeId}`}
                    title={`Video gerakan BISINDO untuk ${item.word}`}
                    loading="lazy"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                ) : (
                  <video controls playsInline preload="metadata" src={item.signVideo}>
                    Browser kamu belum mendukung pemutar video.
                  </video>
                )}
                <span>Video gerakan</span>
              </div>
            )}
          </section>
        )}
        <div className="bisindo-detail-section-heading">
          <strong>Ejaan alfabet BISINDO</strong>
          <span>{item.translation}</span>
        </div>
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
