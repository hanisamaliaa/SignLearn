const GROUPS = [
  { title: "Belajar", links: ["Materi", "Permainan", "Penerjemah", "Progres"] },
  { title: "Dukungan", links: ["Panduan Orang Tua", "Pusat Bantuan", "Hubungi Kami", "Tentang BISINDO"], id: "footer-support" },
  { title: "Informasi", links: ["Kebijakan Privasi", "Ketentuan Penggunaan", "Pernyataan Aksesibilitas"] },
];
export default function LandingFooter() {
  return <footer className="kids-footer"><div className="kids-container kids-footer-grid"><div><a href="#main-content" className="kids-brand text-white" aria-label="SignLearn Kids, kembali ke atas"><span className="kids-brand-mark" aria-hidden="true">SL</span><span>SignLearn <strong>Kids</strong></span></a><p className="mt-5 max-w-sm">Platform belajar BISINDO yang menyenangkan, aman, dan inklusif untuk anak.</p></div>{GROUPS.map((group) => <nav key={group.title} id={group.id} aria-label={group.title}><h2>{group.title}</h2><ul>{group.links.map((link) => <li key={link}><a href={link === "Materi" ? "#topik" : link === "Progres" ? "#progres" : "#main-content"}>{link}</a></li>)}</ul></nav>)}</div><div className="kids-container kids-footer-bottom">© 2026 SignLearn Kids. Belajar dan berkomunikasi untuk semua.</div></footer>;
}
