/**
 * Katalog kursus BISINDO — satu sumber kebenaran untuk seed dan reset konten.
 *
 * Materi video berasal dari seri "Belajar bahasa Isyarat BISINDO #1-#10" oleh
 * Okke Hidayah Kahfi di YouTube. Video di-embed lewat player resmi YouTube,
 * bukan diunduh ulang, sehingga atribusi dan statistik tetap pada pembuatnya.
 *
 * ── Kenapa `duration` dan `estimatedHours` kosong ────────────────────
 *
 * Durasi asli video tidak dapat diambil tanpa API key YouTube. Mengisinya
 * dengan tebakan berarti berbohong kepada pemelajar yang memakainya untuk
 * merencanakan waktu belajar. Player melaporkan durasi sebenarnya saat video
 * dimuat, dan UI menampilkan angka itu; sampai saat itu ia tidak menampilkan
 * apa pun.
 *
 * ── Kenapa kuisnya "mengeja", bukan "memperagakan" ───────────────────
 *
 * Model pengenal hanya menguasai 26 huruf abjad statis. Ia tidak dapat menilai
 * isyarat kata yang diajarkan video #2-#10. Perintah soal karena itu berbunyi
 * "Eja kata ini dengan abjad BISINDO" — aplikasi tidak boleh menjanjikan
 * penilaian yang tidak mampu dilakukannya.
 */

const CREDIT = "Materi video oleh Okke Hidayah Kahfi.";

const youtube = (id) => ({
  videoUrl: `https://www.youtube.com/watch?v=${id}`,
  thumbnail: `https://img.youtube.com/vi/${id}/maxresdefault.jpg`,
});

/**
 * Soal kamera selalu berbentuk sama; hanya kata targetnya yang berbeda.
 *
 * Kata dipilih dari topik kursusnya dengan panjang bercampur: sebagian pendek
 * agar cepat memberi rasa berhasil, satu-dua panjang sebagai tantangan. KKM 70
 * berarti tujuh dari sepuluh sudah lulus, jadi kata tersulit tidak menggagalkan
 * seluruh kuis.
 */
const spellQuestion = (target, index) => ({
  question: `Eja kata "${target}" dengan abjad BISINDO di depan kamera.`,
  questionType: "camera-spell",
  answerText: target,
  sortOrder: index + 1,
});

const quiz = (title, targets) => ({
  title,
  minPassingScore: 70,
  // Memeragakan huruf jauh lebih lambat daripada mengklik pilihan. Sepuluh
  // kata berkisar 40-60 huruf, yang realistis memakan 4-7 menit termasuk
  // mengulang huruf yang keliru.
  durationSeconds: 1800,
  questions: targets.map(spellQuestion),
});

export const COURSE_CATALOGUE = [
  {
    title: "Abjad BISINDO",
    titleEn: "BISINDO Alphabet",
    category: "Dasar",
    level: "Pemula",
    description:
      "Mengenal isyarat 26 huruf abjad BISINDO dan cara mengejanya. " +
      "Video ini memakai varian Yogyakarta; BISINDO memiliki variasi antardaerah, " +
      "sehingga isyarat di kotamu bisa sedikit berbeda. " + CREDIT,
    sortOrder: 1,
    ...youtube("Hx8IU6CfMIM"),
    lesson: {
      title: "Abjad A sampai Z",
      description:
        "Peragaan seluruh huruf abjad BISINDO dari A hingga Z, satu per satu.",
    },
    quiz: quiz("Kuis Abjad BISINDO", [
      "EJA",
      "KATA",
      "NAMA",
      "HURUF",
      "ABJAD",
      "TANGAN",
      "ISYARAT",
      "BISINDO",
      "ALFABET",
      "BELAJAR",
    ]),
  },
  {
    title: "Kata Sapa",
    titleEn: "Greetings",
    category: "Dasar",
    level: "Pemula",
    description:
      "Isyarat sapaan yang paling sering dipakai sehari-hari, seperti salam " +
      "dan menanyakan kabar. " + CREDIT,
    sortOrder: 2,
    ...youtube("xnxydJPDD1M"),
    lesson: {
      title: "Sapaan Sehari-hari",
      description: "Kumpulan isyarat sapaan dasar dalam percakapan BISINDO.",
    },
    quiz: quiz("Kuis Kata Sapa", [
      "HALO",
      "PAGI",
      "SORE",
      "MAAF",
      "SIANG",
      "MALAM",
      "PERMISI",
      "APA KABAR",
      "SAMPAI JUMPA",
      "TERIMA KASIH",
    ]),
  },
  {
    title: "Kata Sifat",
    titleEn: "Adjectives",
    category: "Kosakata",
    level: "Menengah",
    description:
      "Isyarat kata sifat untuk menggambarkan keadaan, perasaan, dan ciri " +
      "sesuatu. " + CREDIT,
    sortOrder: 3,
    ...youtube("lio9OmhZa5I"),
    lesson: {
      title: "Kosakata Kata Sifat",
      description: "Peragaan isyarat kata sifat yang umum dipakai.",
    },
    quiz: quiz("Kuis Kata Sifat", [
      "BAIK",
      "BURUK",
      "BESAR",
      "KECIL",
      "CEPAT",
      "SEDIH",
      "TINGGI",
      "PENDEK",
      "LAMBAT",
      "SENANG",
    ]),
  },
  {
    title: "Keluarga",
    titleEn: "Family",
    category: "Kosakata",
    level: "Pemula",
    description:
      "Isyarat anggota keluarga, dari orang tua hingga saudara dan kerabat. " + CREDIT,
    sortOrder: 4,
    ...youtube("4icuKB1w5Z0"),
    lesson: {
      title: "Kosakata Keluarga",
      description: "Peragaan isyarat untuk menyebut anggota keluarga.",
    },
    quiz: quiz("Kuis Keluarga", [
      "IBU",
      "ANAK",
      "ADIK",
      "AYAH",
      "BIBI",
      "KAKAK",
      "NENEK",
      "KAKEK",
      "PAMAN",
      "KELUARGA",
    ]),
  },
  {
    title: "Transportasi",
    titleEn: "Transportation",
    category: "Kosakata",
    level: "Menengah",
    description:
      "Isyarat berbagai alat transportasi darat, laut, dan udara. " + CREDIT,
    sortOrder: 5,
    ...youtube("lor4YdtK8tU"),
    lesson: {
      title: "Kosakata Transportasi",
      description: "Peragaan isyarat untuk kendaraan dan alat transportasi.",
    },
    quiz: quiz("Kuis Transportasi", [
      "BUS",
      "MOBIL",
      "MOTOR",
      "TAKSI",
      "BECAK",
      "KAPAL",
      "SEPEDA",
      "KERETA",
      "PESAWAT",
      "TRANSPORTASI",
    ]),
  },
  {
    title: "Profesi",
    titleEn: "Occupations",
    category: "Kosakata",
    level: "Menengah",
    description:
      "Isyarat nama-nama pekerjaan dan profesi yang umum ditemui. " + CREDIT,
    sortOrder: 6,
    ...youtube("MIIh0EVnbJI"),
    lesson: {
      title: "Kosakata Profesi Kerja",
      description: "Peragaan isyarat untuk menyebut berbagai profesi.",
    },
    quiz: quiz("Kuis Profesi", [
      "KOKI",
      "GURU",
      "PILOT",
      "DOKTER",
      "PETANI",
      "POLISI",
      "PERAWAT",
      "NELAYAN",
      "PROFESI",
      "PENJAHIT",
    ]),
  },
  {
    title: "Hari",
    titleEn: "Days",
    category: "Dasar",
    level: "Pemula",
    description:
      "Isyarat nama-nama hari dalam seminggu beserta keterangan waktu " +
      "yang menyertainya. " + CREDIT,
    sortOrder: 7,
    ...youtube("Cls9oklykKo"),
    lesson: {
      title: "Nama Hari",
      description: "Peragaan isyarat tujuh hari dalam seminggu.",
    },
    quiz: quiz("Kuis Hari", [
      "RABU",
      "HARI",
      "BESOK",
      "SENIN",
      "KAMIS",
      "JUMAT",
      "SABTU",
      "SELASA",
      "MINGGU",
      "KEMARIN",
    ]),
  },
  {
    title: "Angka",
    titleEn: "Numbers",
    category: "Dasar",
    level: "Pemula",
    description:
      "Isyarat angka dalam BISINDO dan cara menyusunnya menjadi bilangan. " + CREDIT,
    sortOrder: 8,
    ...youtube("5UN60jB4eKg"),
    lesson: {
      title: "Isyarat Angka",
      description: "Peragaan isyarat angka dari nol hingga bilangan besar.",
    },
    quiz: quiz("Kuis Angka", [
      "DUA",
      "SATU",
      "TIGA",
      "LIMA",
      "ENAM",
      "EMPAT",
      "TUJUH",
      "DELAPAN",
      "SEPULUH",
      "SEMBILAN",
    ]),
  },
  {
    title: "Olahraga",
    titleEn: "Sports",
    category: "Kosakata",
    level: "Menengah",
    description:
      "Isyarat cabang olahraga dan kegiatan fisik sehari-hari. " + CREDIT,
    sortOrder: 9,
    ...youtube("mssWGGRUMiw"),
    lesson: {
      title: "Kosakata Olahraga",
      description: "Peragaan isyarat untuk berbagai cabang olahraga.",
    },
    quiz: quiz("Kuis Olahraga", [
      "BOLA",
      "LARI",
      "VOLI",
      "SENAM",
      "SILAT",
      "CATUR",
      "RENANG",
      "BASKET",
      "OLAHRAGA",
      "BULU TANGKIS",
    ]),
  },
  {
    title: "Buah-buahan",
    titleEn: "Fruits",
    category: "Kosakata",
    level: "Pemula",
    description:
      "Isyarat nama-nama buah yang sering dijumpai sehari-hari. " + CREDIT,
    sortOrder: 10,
    ...youtube("Qhx0_ctwd_4"),
    lesson: {
      title: "Kosakata Buah-buahan",
      description: "Peragaan isyarat untuk menyebut berbagai jenis buah.",
    },
    quiz: quiz("Kuis Buah-buahan", [
      "APEL",
      "JERUK",
      "SALAK",
      "MELON",
      "NANAS",
      "PISANG",
      "MANGGA",
      "ANGGUR",
      "PEPAYA",
      "DURIAN",
    ]),
  },
];

/**
 * Menulis seluruh katalog dalam satu transaksi.
 *
 * Kursus tanpa pelajarannya lebih buruk daripada tidak ada kursus sama sekali,
 * karena `total_lessons` akan berbohong dan UI menampilkan kursus kosong yang
 * tidak bisa dibuka.
 */
export async function insertCatalogue(client) {
  for (const course of COURSE_CATALOGUE) {
    const { rows: courseRows } = await client.query(
      `INSERT INTO courses
         (title, title_en, category, level, description, thumbnail,
          estimated_hours, sort_order, total_lessons, is_locked)
       VALUES ($1, $2, $3, $4, $5, $6, 0, $7, 1, FALSE)
       RETURNING id`,
      [
        course.title, course.titleEn, course.category, course.level,
        course.description, course.thumbnail, course.sortOrder,
      ],
    );
    const courseId = courseRows[0].id;

    const { rows: lessonRows } = await client.query(
      `INSERT INTO lessons (course_id, title, description, video_url, sort_order, is_locked)
       VALUES ($1, $2, $3, $4, 1, FALSE)
       RETURNING id`,
      [courseId, course.lesson.title, course.lesson.description, course.videoUrl],
    );
    const lessonId = lessonRows[0].id;

    const { rows: quizRows } = await client.query(
      `INSERT INTO quizzes
         (course_id, lesson_id, title, total_questions, min_passing_score, duration_seconds)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id`,
      [
        courseId, lessonId, course.quiz.title, course.quiz.questions.length,
        course.quiz.minPassingScore, course.quiz.durationSeconds,
      ],
    );
    const quizId = quizRows[0].id;

    for (const question of course.quiz.questions) {
      await client.query(
        `INSERT INTO quiz_questions
           (quiz_id, question, question_type, options, correct_index, answer_text, sort_order)
         VALUES ($1, $2, $3, '[]'::jsonb, 0, $4, $5)`,
        [quizId, question.question, question.questionType, question.answerText, question.sortOrder],
      );
    }
  }
  return COURSE_CATALOGUE.length;
}
