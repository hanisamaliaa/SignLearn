import PublicPage from "./PublicPage";

export default function ParentGuide() {
  return (
    <PublicPage
      eyebrow="Dukungan"
      title="Panduan Orang Tua"
      intro="Dukung anak belajar dan mempraktikkan BISINDO bersama keluarga. SignLearn Kids membantu anak usia 6–12 tahun mempelajari dan mempraktikkan BISINDO melalui pembelajaran visual, aktivitas interaktif, dan materi yang dekat dengan kehidupan sehari-hari."
    >
      <div className="grid gap-12">
        <section><h2 className="text-2xl font-bold">Mengenal SignLearn</h2>
          <p className="mt-3 leading-7">SignLearn Kids adalah platform pembelajaran BISINDO yang dirancang untuk membantu anak belajar secara bertahap dan terstruktur. Anak dapat mengenal tanda melalui materi visual, memahami konteks penggunaannya, berlatih, mengerjakan kuis, dan mempraktikkannya bersama keluarga.</p>
          <p className="mt-3 leading-7">Pembelajaran SignLearn berfokus pada penggunaan BISINDO dalam situasi yang dekat dengan kehidupan anak, seperti memperkenalkan diri, berbicara tentang keluarga dan perasaan, serta menyampaikan kebutuhan sehari-hari.</p>
        </section>
        <section><h2 className="text-2xl font-bold">Mulai Belajar Bersama Anak</h2>
          <div className="mt-5 grid md:grid-cols-2 gap-5">
            {[
              ["1. Kenali materi yang sedang dipelajari","Lihat kategori atau lesson yang sedang dipelajari anak agar Anda mengetahui tanda dan topik yang sedang mereka pelajari."],
              ["2. Ikuti proses belajar anak","Luangkan waktu untuk melihat materi bersama. Jika memungkinkan, coba pelajari tanda yang sama agar anak memiliki kesempatan untuk belajar bersama Anda."],
              ["3. Praktikkan bersama","Setelah belajar, coba gunakan tanda yang dipelajari dalam percakapan atau aktivitas sederhana di rumah."],
              ["4. Berikan apresiasi","Hargai usaha anak ketika mereka mencoba, berlatih, atau berhasil menggunakan tanda baru. Proses belajar tidak harus selalu sempurna."]
            ].map(([h,p])=><article key={h} className="rounded-2xl border p-6"><h3 className="text-lg font-bold">{h}</h3><p className="mt-2 leading-7">{p}</p></article>)}
          </div>
        </section>
        <section><h2 className="text-2xl font-bold">Belajar BISINDO Bersama</h2>
          <p className="mt-3 leading-7">Anda tidak harus sudah bisa BISINDO untuk mendampingi anak. Belajarlah bersama dengan melihat materi yang sama, mencoba tanda yang dipelajari, dan menggunakannya secara bertahap dalam aktivitas sehari-hari.</p>
          <p className="mt-3 leading-7">Jika anak sudah lebih dulu mengetahui suatu tanda, beri kesempatan kepada mereka untuk menunjukkan apa yang telah mereka pelajari. Belajar bersama dapat menjadi kesempatan bagi anak dan keluarga untuk saling berkomunikasi.</p>
        </section>
        <section><h2 className="text-2xl font-bold">Hubungkan dengan Kehidupan Sehari-hari</h2>
          <div className="mt-5 grid sm:grid-cols-2 gap-5">
            {[
              ["Perkenalan","Halo • Nama • Saya • Kamu • Teman","Gunakan saat menyapa, memperkenalkan nama, atau bertemu teman."],
              ["Keluarga","Ayah • Ibu • Kakak • Adik • Keluarga","Gunakan ketika berbicara tentang anggota keluarga di rumah."],
              ["Emosi","Senang • Sedih • Marah • Takut • Lelah","Bantu anak menyampaikan apa yang sedang mereka rasakan."],
              ["Kebutuhan Sehari-hari","Makan • Minum • Tidur • Toilet • Tolong • Sakit","Gunakan untuk membantu anak menyampaikan kebutuhan mereka."]
            ].map(([h,s,p])=><article key={h} className="rounded-2xl border p-6"><h3 className="text-lg font-bold">{h}</h3><p className="mt-2 font-semibold">{s}</p><p className="mt-2 leading-7">{p}</p></article>)}
          </div>
        </section>
        <section><h2 className="text-2xl font-bold">Tips Mendampingi Anak</h2>
          <div className="mt-5 grid gap-4">
            {[
              ["Belajar secara bertahap","Tidak perlu mengejar banyak materi sekaligus. Berikan waktu bagi anak untuk memahami dan mempraktikkan tanda."],
              ["Dengarkan dan amati","Perhatikan cara anak memahami dan menggunakan tanda, terutama ketika mereka mencoba menyampaikan kebutuhan atau perasaan."],
              ["Belajar bersama","Jadikan proses belajar sebagai aktivitas bersama, bukan hanya tugas yang harus diselesaikan anak."],
              ["Gunakan dalam aktivitas sehari-hari","Berikan kesempatan kepada anak untuk menggunakan tanda yang telah dipelajari dalam situasi yang sesuai."],
              ["Apresiasi usaha anak","Berikan dukungan ketika anak mencoba dan belajar dari kesalahan, bukan hanya ketika mereka mendapatkan jawaban yang benar."]
            ].map(([h,p])=><div key={h}><h3 className="font-bold">{h}</h3><p className="mt-1 leading-7">{p}</p></div>)}
          </div>
        </section>
        <section><h2 className="text-2xl font-bold">Lihat Perkembangan Belajar Anak</h2>
          <p className="mt-3 leading-7">SignLearn menyediakan progress belajar untuk membantu melihat perjalanan anak selama menggunakan aplikasi. Gunakan progress sebagai gambaran tentang materi yang telah dipelajari dan perkembangan belajar anak, bukan sebagai tekanan untuk menyelesaikan materi secepat mungkin.</p>
        </section>
        <section className="rounded-3xl border p-8"><h2 className="text-2xl font-bold">Belajar Bersama, Berkomunikasi Lebih Dekat</h2><p className="mt-3 leading-7">Mulai kenalkan BISINDO melalui aktivitas yang sederhana dan dekat dengan kehidupan sehari-hari.</p></section>
      </div>
    </PublicPage>
  );
}
