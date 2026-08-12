import PublicPage from "./PublicPage";

export default function AboutBisindo() {
  return (
    <PublicPage eyebrow="Dukungan" title="Tentang BISINDO" intro="Mengenal Bahasa Isyarat Indonesia dan menghubungkannya dengan pembelajaran serta komunikasi sehari-hari.">
      <div className="grid gap-12">
        <section><h2 className="text-2xl font-bold">Mengenal Bahasa Isyarat Indonesia</h2><p className="mt-3 leading-7">BISINDO atau Bahasa Isyarat Indonesia digunakan dalam komunikasi sehari-hari oleh komunitas Tuli di Indonesia.</p><p className="mt-3 leading-7">Melalui SignLearn, anak dapat mengenal BISINDO melalui materi visual yang terstruktur dan mempraktikkannya dalam situasi yang dekat dengan kehidupan sehari-hari.</p></section>
        <section><h2 className="text-2xl font-bold">Belajar Bahasa Isyarat dengan Konteks</h2><p className="mt-3 leading-7">Belajar BISINDO bukan hanya tentang mengingat sebuah tanda. Anak juga perlu memahami apa arti tanda tersebut, kapan tanda digunakan, dan bagaimana menggunakannya dalam komunikasi.</p>
          <div className="mt-6 grid sm:grid-cols-2 lg:grid-cols-3 gap-4">{[
            ["Watch","Melihat video atau animasi bahasa isyarat."],["Learn","Mempelajari arti dan konteks penggunaan tanda."],["Practice","Berlatih dengan menirukan atau mencocokkan tanda dengan gambar."],["Play","Mengikuti aktivitas interaktif untuk memperkuat pembelajaran."],["Quiz","Mengerjakan evaluasi singkat."],["Use It","Mempraktikkan tanda yang dipelajari bersama keluarga."]
          ].map(([h,p])=><article key={h} className="rounded-2xl border p-6"><h3 className="text-lg font-bold">{h}</h3><p className="mt-2 leading-7">{p}</p></article>)}</div>
        </section>
        <section><h2 className="text-2xl font-bold">BISINDO dalam Kehidupan Sehari-hari</h2>
          <div className="mt-5 grid sm:grid-cols-2 gap-5">{[
            ["Perkenalan","Halo • Nama • Saya • Kamu • Teman"],["Keluarga","Ayah • Ibu • Kakak • Adik • Keluarga"],["Emosi","Senang • Sedih • Marah • Takut • Lelah"],["Kebutuhan Sehari-hari","Makan • Minum • Tidur • Toilet • Tolong • Sakit"]
          ].map(([h,p])=><article key={h} className="rounded-2xl border p-6"><h3 className="text-lg font-bold">{h}</h3><p className="mt-2 leading-7">{p}</p></article>)}</div>
          <p className="mt-5 leading-7">Dengan mempelajari tanda dalam konteks yang familiar, anak memiliki kesempatan untuk menghubungkan pembelajaran dengan komunikasi sehari-hari.</p>
        </section>
        <section><h2 className="text-2xl font-bold">Belajar Bersama Keluarga</h2><p className="mt-3 leading-7">Bahasa digunakan untuk berkomunikasi dengan orang lain. Karena itu, proses belajar tidak harus dilakukan sendiri. Anak dapat mempraktikkan tanda yang dipelajari bersama orang tua atau anggota keluarga.</p><p className="mt-3 leading-7">Orang tua juga dapat ikut belajar dan menggunakan tanda tersebut dalam aktivitas sehari-hari.</p></section>
        <section><h2 className="text-2xl font-bold">Menghargai Komunitas Tuli</h2><p className="mt-3 leading-7">BISINDO merupakan bagian dari komunikasi komunitas Tuli di Indonesia. Belajar BISINDO berarti juga belajar menggunakan bahasa isyarat dengan memahami konteks penggunaannya dan menghargai komunitas yang menggunakannya.</p><p className="mt-3 leading-7">SignLearn berkomitmen untuk mengembangkan materi pembelajaran yang sesuai dengan konteks BISINDO. Ketepatan tanda, ekspresi, konteks penggunaan, dan representasi komunitas Tuli perlu divalidasi oleh pengajar atau komunitas Tuli.</p></section>
        <section className="rounded-3xl border p-8"><h2 className="text-2xl font-bold">Mengapa SignLearn Menggunakan BISINDO?</h2><p className="mt-3 leading-7">SignLearn berfokus pada membantu anak dan keluarga belajar serta mempraktikkan BISINDO dalam kehidupan sehari-hari. Melalui pembelajaran yang visual, terstruktur, dan dapat dilakukan bersama keluarga, SignLearn ingin membantu menciptakan pengalaman belajar komunikasi yang lebih inklusif.</p></section>
      </div>
    </PublicPage>
  );
}
