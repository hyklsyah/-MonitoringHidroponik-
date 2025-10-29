// Firebase config (sudah diisi dengan milik Anda)
const firebaseConfig = {
  apiKey: "AIzaSyASTd9dlNjxe8QZL2LJRatx8qUntt2D80g",
  authDomain: "asap-f023f.firebaseapp.com",
  databaseURL:
    "https://asap-f023f-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "asap-f023f",
  storageBucket: "asap-f023f.firebasestorage.app",
  messagingSenderId: "844762514053",
  appId: "1:844762514053:web:d6672b17d489d3c65b5fec",
  measurementId: "G-HNFC7Y1VEP",
};

// Initialize Firebase (gunakan compat mode untuk kompatibilitas)
firebase.initializeApp(firebaseConfig);
const db = firebase.database();

// --- 1. FUNGSI INISIALISASI DATABASE ---
function initializeDatabase() {
  db.ref()
    .once("value", (snapshot) => {
      const rootData = snapshot.val();
      if (!rootData || Object.keys(rootData).length === 0) {
        console.log("Database kosong. Memulai inisialisasi otomatis...");

        // Data default untuk /airQuality
        const defaultAirQuality = {
          timestamp: new Date().toISOString(),
          suhu: 25.0,
          kelembaban: 60.0,
          kadarAsap: 10.0,
          partikelDebu: {
            PM25: 20.0,
            PM10: 40.0,
          },
          status: "Baik",
          lokasi: {
            latitude: -6.2088,
            longitude: 106.8456,
            kota: "Jakarta",
          },
        };

        // Data default untuk /history (3 entry contoh: Baik, Eks-Sedang, Buruk)
        const defaultHistory = {
          entry1: {
            timestamp: new Date(Date.now() - 3600000).toISOString(),
            suhu: 24.5,
            kelembaban: 62.0,
            kadarAsap: 95.0,
            partikelDebu: {
              PM25: 18.0,
              PM10: 35.0,
            },
            status: "Baik",
          },
          entry2: {
            timestamp: new Date(Date.now() - 1800000).toISOString(),
            suhu: 25.0,
            kelembaban: 60.0,
            kadarAsap: 20.0,
            partikelDebu: {
              PM25: 45.0, // Nilai yang dulunya 'Sedang' sekarang dianggap 'Baik' jika < 65
              PM10: 80.0,
            },
            status: "Baik",
          },
          entry3: {
            timestamp: new Date().toISOString(),
            suhu: 25.0,
            kelembaban: 60.0,
            kadarAsap: 30.0, // Tidak Sehat karena Asap > 25
            partikelDebu: {
              PM25: 20.0,
              PM10: 40.0,
            },
            status: "Tidak Sehat",
          },
        };

        // Data default untuk /config (threshold) - DISESUAIKAN UNTUK KONSISTENSI
        const defaultConfig = {
          thresholds: {
            pm25_baik_max: 65, // Batas Max untuk kategori Baik (semua di bawah 65)
            pm10_baik_max: 150, // Batas Max untuk kategori Baik (semua di bawah 150)
            asap_buruk_min: 25, // Batas Min untuk kategori Buruk (semua di atas 25)
            suhu_max: 35,
          },
          sensor_id: "ESP32-001",
          last_update: new Date().toISOString(),
        };

        // Set data secara async
        Promise.all([
          db.ref("/airQuality").set(defaultAirQuality),
          db.ref("/history").set(defaultHistory),
          db.ref("/config").set(defaultConfig),
        ])
          .then(() => {
            console.log(
              "✅ Inisialisasi database berhasil! Data default telah dibuat."
            );
            alert(
              "Database berhasil diinisialisasi otomatis! Data akan muncul di website dalam hitungan detik."
            );
          })
          .catch((error) => {
            console.error("Error inisialisasi:", error);
            alert(
              "Error inisialisasi: " +
                error.message +
                ". Cek console untuk detail."
            );
          });
      } else {
        console.log("Database sudah ada data. Skip inisialisasi.");
      }
    })
    .catch((error) => {
      console.error("Error cek database:", error);
      alert("Error koneksi database: " + error.message);
    });
}

// --- 2. LISTENER REAL-TIME DATA (LOGIKA STATUS HANYA BAIK/BURUK) ---
const airQualityRef = db.ref("/airQuality");
airQualityRef.on("value", (snapshot) => {
  const data = snapshot.val();
  if (data) {
    // Update values
    document.getElementById("suhu").textContent = data.suhu
      ? data.suhu.toFixed(1)
      : "--";
    document.getElementById("kelembaban").textContent = data.kelembaban
      ? data.kelembaban.toFixed(1)
      : "--";
    document.getElementById("kadarAsap").textContent = data.kadarAsap
      ? data.kadarAsap.toFixed(1)
      : "--";
    document.getElementById("pm25").textContent = data.partikelDebu?.PM25
      ? data.partikelDebu.PM25.toFixed(1)
      : "--";
    document.getElementById("pm10").textContent = data.partikelDebu?.PM10
      ? data.partikelDebu.PM10.toFixed(1)
      : "--";

    // --- LOGIKA PENENTUAN STATUS UDARA (HANYA BAIK atau TIDAK SEHAT) ---
    const pm25 = data.partikelDebu?.PM25 || 0;
    const pm10 = data.partikelDebu?.PM10 || 0;
    const kadarAsap = data.kadarAsap || 0;

    const statusEl = document.getElementById("status");
    const statusDescEl = document.getElementById("statusDesc");

    // DEFINISI AMBANG BATAS "TIDAK SEHAT" (BURUK)
    const AMBANG_ASAP_BURUK = 25.0; // ppm
    const AMBANG_PM25_BURUK = 65.0; // mikrogram/m3
    const AMBANG_PM10_BURUK = 150.0; // mikrogram/m3

    let status = "Baik";
    let colorClass = "status-baik";
    let desc = "Kualitas udara aman dan sehat.";

    // Cek kondisi "Tidak Sehat" (Buruk) - Prioritas tertinggi
    if (
      kadarAsap > AMBANG_ASAP_BURUK ||
      pm25 > AMBANG_PM25_BURUK ||
      pm10 > AMBANG_PM10_BURUK
    ) {
      status = "Tidak Sehat";
      colorClass = "status-tidak-sehat";
      desc = "Kualitas udara buruk!";
    }
    // Tidak ada 'else if' untuk "Sedang". Jika tidak Buruk, maka status adalah "Baik".
    // --- AKHIR LOGIKA PENENTUAN STATUS UDARA ---

    statusEl.textContent = status;
    statusEl.className = `status-badge ${colorClass}`;
    statusDescEl.textContent = desc;

    // Update timestamp
    document.getElementById(
      "timestamp"
    ).textContent = `Terakhir update: ${new Date().toLocaleString("id-ID")}`;
  } else {
    console.log("Belum ada data real-time. Tunggu inisialisasi.");
  }
});

// Error handling untuk listener
airQualityRef.on("error", (error) => {
  console.error("Firebase error:", error);
  document.getElementById("timestamp").textContent =
    "Error: Tidak bisa konek ke database.";
});

// --- 3. FUNGSI UNTUK MENGUPDATE CHART (DARI DATA /HISTORY) ---
const historyRef = db.ref("/history");

function updateChartWithHistory() {
  // Ambil data dari /history dan /config (untuk thresholds)
  Promise.all([
    historyRef.once("value"),
    db.ref("/config/thresholds").once("value"),
  ])
    .then(([historySnapshot, configSnapshot]) => {
      const historyData = historySnapshot.val();
      const thresholds = configSnapshot.val() || {};

      if (!historyData) {
        console.log("Data history kosong. Tidak bisa buat chart.");
        return;
      }

      // Ubah data dari objek menjadi array dan urutkan berdasarkan timestamp
      const sortedHistory = Object.values(historyData)
        .filter((item) => item && item.timestamp)
        .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

      // Siapkan array untuk Label (Waktu) dan Data (PM2.5)
      const labels = [];
      const pm25Data = [];

      const options = {
        hour: "2-digit",
        minute: "2-digit",
        day: "2-digit",
        month: "2-digit",
      };

      sortedHistory.forEach((item) => {
        // Format timestamp
        const date = new Date(item.timestamp);
        const formattedLabel = `${date
          .toLocaleString("id-ID", options)
          .replace(",", "")}`;

        labels.push(formattedLabel);
        pm25Data.push(item.partikelDebu?.PM25 || 0);
      });

      // Perbarui Line Chart
      myLineChart.data.labels = labels;
      myLineChart.data.datasets[0].label = "Kadar PM2.5";
      myLineChart.data.datasets[0].data = pm25Data;

      // Hapus setting callback currency dan ubah maxTicksLimit
      myLineChart.options.scales.yAxes[0].ticks.callback = function (
        value,
        index,
        values
      ) {
        return number_format(value);
      };
      myLineChart.options.scales.yAxes[0].ticks.maxTicksLimit = 10;

      // Opsi: Tambahkan garis batas/thresholds (Membutuhkan Chart.js Annotation Plugin)
      if (thresholds.pm25_baik_max && Chart.Annotation) {
        myLineChart.options.annotation = {
          annotations: [
            {
              type: "line",
              mode: "horizontal",
              scaleID: "y-axis-0",
              value: thresholds.pm25_baik_max, // Batas Baik/Buruk (65)
              borderColor: "red",
              borderWidth: 1,
              label: {
                enabled: true,
                content: "Batas Tidak Sehat (65)",
              },
            },
          ],
        };
      } else {
        // Hapus annotation jika plugin tidak ada
        if (myLineChart.options.annotation) {
          delete myLineChart.options.annotation;
        }
      }

      // Perbarui chart
      myLineChart.update();
      console.log(
        "✅ Line Chart berhasil diperbarui dengan data PM2.5 History."
      );
    })
    .catch((error) => {
      console.error("Error mengambil data history untuk chart:", error);
    });
}

// Panggil inisialisasi dan update chart saat halaman load
window.addEventListener("load", () => {
  initializeDatabase();
  updateChartWithHistory();
});

// --- 4. KONFIGURASI CHART.JS ---
// Set new default font family and font color to mimic Bootstrap's default styling
(Chart.defaults.global.defaultFontFamily = "Nunito"),
  '-apple-system,system-ui,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Arial,sans-serif';
Chart.defaults.global.defaultFontColor = "#858796";

function number_format(number, decimals, dec_point, thousands_sep) {
  // Fungsi format angka
  number = (number + "").replace(",", "").replace(" ", "");
  var n = !isFinite(+number) ? 0 : +number,
    prec = !isFinite(+decimals) ? 0 : Math.abs(decimals),
    sep = typeof thousands_sep === "undefined" ? "," : thousands_sep,
    dec = typeof dec_point === "undefined" ? "." : dec_point,
    s = "",
    toFixedFix = function (n, prec) {
      var k = Math.pow(10, prec);
      return "" + Math.round(n * k) / k;
    };
  s = (prec ? toFixedFix(n, prec) : "" + Math.round(n)).split(".");
  if (s[0].length > 3) {
    s[0] = s[0].replace(/\B(?=(?:\d{3})+(?!\d))/g, sep);
  }
  if ((s[1] || "").length < prec) {
    s[1] = s[1] || "";
    s[1] += new Array(prec - s[1].length + 1).join("0");
  }
  return s.join(dec);
}

// Area Chart Example - DATA STATIS DIHAPUS
var ctx = document.getElementById("myAreaChart");
var myLineChart = new Chart(ctx, {
  type: "line",
  data: {
    labels: [], // Dikosongkan, akan diisi dari Firebase
    datasets: [
      {
        label: "Kadar PM2.5", // Label awal
        lineTension: 0.3,
        backgroundColor: "rgba(78, 115, 223, 0.05)",
        borderColor: "rgba(78, 115, 223, 1)",
        pointRadius: 3,
        pointBackgroundColor: "rgba(78, 115, 223, 1)",
        pointBorderColor: "rgba(78, 115, 223, 1)",
        pointHoverRadius: 3,
        pointHoverBackgroundColor: "rgba(78, 115, 223, 1)",
        pointHoverBorderColor: "rgba(78, 115, 223, 1)",
        pointHitRadius: 10,
        pointBorderWidth: 2,
        data: [], // Dikosongkan, akan diisi dari Firebase
      },
    ],
  },
  options: {
    maintainAspectRatio: false,
    layout: {
      padding: {
        left: 10,
        right: 25,
        top: 25,
        bottom: 0,
      },
    },
    scales: {
      xAxes: [
        {
          gridLines: {
            display: false,
            drawBorder: false,
          },
          ticks: {
            maxTicksLimit: 7,
          },
        },
      ],
      yAxes: [
        {
          ticks: {
            maxTicksLimit: 5,
            padding: 10,
            callback: function (value, index, values) {
              return number_format(value);
            },
          },
          gridLines: {
            color: "rgb(234, 236, 244)",
            zeroLineColor: "rgb(234, 236, 244)",
            drawBorder: false,
            borderDash: [2],
            zeroLineBorderDash: [2],
          },
        },
      ],
    },
    legend: {
      display: false,
    },
    tooltips: {
      backgroundColor: "rgb(255,255,255)",
      bodyFontColor: "#858796",
      titleMarginBottom: 10,
      titleFontColor: "#6e707e",
      titleFontSize: 14,
      borderColor: "#dddfeb",
      borderWidth: 1,
      xPadding: 15,
      yPadding: 15,
      displayColors: false,
      intersect: false,
      mode: "index",
      caretPadding: 10,
      callbacks: {
        label: function (tooltipItem, chart) {
          var datasetLabel =
            chart.datasets[tooltipItem.datasetIndex].label || "";
          return datasetLabel + ": " + number_format(tooltipItem.yLabel);
        },
      },
    },
  },
});
