import PublicPage from "./PublicPage";

const sections = [
  ["1. Informasi yang Kami Gunakan","Untuk menjalankan fitur pembelajaran SignLearn, aplikasi dapat menggunakan beberapa jenis informasi.",[
    ["Informasi Akun","Nama atau username, alamat email, dan informasi autentikasi akun."],
    ["Informasi Pembelajaran","Course atau lesson yang telah dipelajari, hasil kuis, progress pembelajaran, dan badge atau pencapaian yang diperoleh."],
    ["Informasi Teknis","Informasi teknis yang diperlukan agar aplikasi dapat berjalan dengan baik, seperti jenis perangkat atau browser."]
  ]],
  ["2. Bagaimana Informasi Digunakan","Informasi pengguna digunakan untuk membuat dan mengelola akun, menyediakan materi pembelajaran, menyimpan progress, menampilkan hasil aktivitas dan kuis, menyediakan fitur pembelajaran, menjaga keamanan, dan membantu meningkatkan pengalaman penggunaan SignLearn.",[]],
  ["3. Privasi Anak","SignLearn Kids dirancang untuk anak usia 6–12 tahun dan melibatkan keluarga dalam proses pembelajaran. Kami memahami bahwa informasi anak perlu diperlakukan dengan perhatian khusus. Karena itu, SignLearn berupaya membatasi penggunaan informasi pada hal-hal yang diperlukan untuk menjalankan pengalaman pembelajaran. Orang tua atau anggota keluarga dianjurkan untuk mendampingi anak saat menggunakan SignLearn.",[]],
  ["4. Penggunaan Informasi Pembelajaran","Informasi seperti progress, lesson yang telah diselesaikan, dan hasil kuis digunakan untuk mendukung proses pembelajaran di dalam aplikasi. Informasi tersebut membantu pengguna melihat perjalanan belajar dan melanjutkan pembelajaran dari aktivitas yang telah dilakukan sebelumnya.",[]],
  ["5. Keamanan Informasi","SignLearn berupaya menerapkan langkah-langkah yang sesuai untuk membantu melindungi informasi pengguna dari akses atau penggunaan yang tidak sah. Namun, tidak ada sistem digital yang dapat menjamin keamanan secara mutlak. Pengguna juga diharapkan menjaga keamanan informasi akun mereka.",[]],
  ["6. Pembagian Informasi","SignLearn tidak menjadikan informasi pribadi pengguna sebagai produk untuk diperjualbelikan. Informasi digunakan sesuai dengan tujuan penyediaan dan pengoperasian layanan SignLearn.",[]],
  ["7. Hak Pengguna","Pengguna dapat menghubungi tim SignLearn apabila ingin mengetahui informasi yang berkaitan dengan akun, memperbarui informasi akun, mengajukan permintaan penghapusan akun atau informasi sesuai mekanisme yang tersedia, atau menyampaikan pertanyaan mengenai privasi.",[]],
  ["8. Perubahan Kebijakan Privasi","Kebijakan Privasi ini dapat diperbarui apabila terdapat perubahan pada aplikasi, fitur, atau cara SignLearn menggunakan informasi pengguna. Perubahan akan ditampilkan pada halaman ini bersama dengan tanggal pembaruan terbaru.",[]],
  ["9. Hubungi Kami","Jika Anda memiliki pertanyaan mengenai Kebijakan Privasi SignLearn Kids, silakan hubungi tim SignLearn melalui informasi kontak yang tersedia pada aplikasi.",[]]
];

export default function PrivacyPolicy() {
  return (
    <PublicPage eyebrow="Informasi" title="Kebijakan Privasi" intro="SignLearn Kids menghargai privasi pengguna dan berupaya menjaga informasi yang digunakan selama proses pembelajaran.">
      <p className="text-sm opacity-70 mb-10">Terakhir diperbarui: Agustus 2026</p>
      <article className="space-y-10">
        {sections.map(([h,intro,subs])=><section key={h}><h2 className="text-2xl font-bold">{h}</h2><p className="mt-3 leading-7">{intro}</p>{subs.length>0&&<div className="mt-5 space-y-4">{subs.map(([sh,sp])=><div key={sh}><h3 className="font-bold">{sh}</h3><p className="mt-1 leading-7">{sp}</p></div>)}</div>}</section>)}
      </article>
    </PublicPage>
  );
}
