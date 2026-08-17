import { useApp } from "../../context/app";
import BisindoTranslator from "../../components/landing/BisindoTranslator";

/** Translator dua arah yang dapat dibuka langsung dari portal pengguna. */
export default function Translator() {
  const { isPremium } = useApp();

  return (
    <div className="user-translator-page space-y-6">
      <header className="user-translator-page-header">
        <div>
          <p className="user-translator-eyebrow">Latihan interaktif</p>
          <h1 id="user-translator-title">
            Penerjemah BISINDO
            {isPremium && <span className="user-translator-premium-badge">⭐ Premium</span>}
          </h1>
          <p>
            Tulis, ucapkan, atau gunakan kamera untuk belajar BISINDO dengan cara yang seru.
          </p>
        </div>
      </header>

      <BisindoTranslator embedded defaultMode="text" />
    </div>
  );
}
