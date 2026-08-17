import BisindoTranslator from "../../components/landing/BisindoTranslator";
import { CameraIcon, GridIcon, MicIcon } from "../../components/ui/Icons";

/** Translator dua arah yang dapat dibuka langsung dari portal pengguna. */
export default function Translator() {
  return (
    <div className="user-translator-page space-y-6">
      <header className="user-translator-page-header">
        <div>
          <p className="user-translator-eyebrow">Latihan interaktif</p>
          <h1 id="user-translator-title">Penerjemah BISINDO</h1>
          <p>
            Ketik atau ucapkan kalimat untuk melihat ejaan BISINDO, atau
            tunjukkan gerakan ke kamera untuk mengubahnya menjadi teks.
          </p>
        </div>
        <div className="user-translator-capabilities" aria-label="Mode penerjemah tersedia">
          <span><GridIcon size={17} /> Teks ke BISINDO</span>
          <span><MicIcon size={17} /> Suara ke BISINDO</span>
          <span><CameraIcon size={17} /> Kamera ke teks</span>
        </div>
      </header>

      <BisindoTranslator embedded defaultMode="text" />
    </div>
  );
}
