const API_URL = "https://script.google.com/macros/s/AKfycbyAPZQeJMWEm73SsZutxWk9QtCjG27dfkdqKZ6vUHrBNJXLtcFy4kqyNkT2IdpdL7BAeQ/exec";
let globalSlug = "";

document.addEventListener("DOMContentLoaded", async () => {
    const urlParams = new URLSearchParams(window.location.search);
    const slug = urlParams.get("u");
    const guestName = urlParams.get("to") || "Tamu Undangan";
    globalSlug = slug;

    if (!slug) {
        document.getElementById("loading-screen").innerHTML = "<p>URL Undangan tidak valid.</p>";
        return;
    }

    try {
        const response = await fetch(`${API_URL}?u=${encodeURIComponent(slug)}`);
        const result = await response.json();

        if (result.status !== "success") {
            document.getElementById("loading-screen").innerHTML = `<p>${result.message || 'Undangan tidak ditemukan.'}</p>`;
            return;
        }

        const data = result.data;

        // Load CSS Tema
        document.getElementById("theme-style").href = `themes/${data.theme}/style.css`;

        // Load HTML Tema
        const templateResponse = await fetch(`themes/${data.theme}/template.html`);
        let templateHtml = await templateResponse.text();

        // Inject Data Utama
        templateHtml = templateHtml
            .replace(/{{groom}}/g, data.groom)
            .replace(/{{bride}}/g, data.bride)
            .replace(/{{date}}/g, formatDate(data.date))
            .replace(/{{guestName}}/g, guestName)
            .replace(/{{mapUrl}}/g, data.mapUrl)
            .replace(/{{musicUrl}}/g, data.musicUrl)
            .replace(/{{bankName}}/g, data.bankName || '-')
            .replace(/{{bankNo}}/g, data.bankNo || '-')
            .replace(/{{bankOwner}}/g, data.bankOwner || '-');

        document.getElementById("app-root").innerHTML = templateHtml;
        document.getElementById("loading-screen").style.display = "none";

        // Inisialisasi Fitur Tambahan
        initCountdown(data.date);
        initMusic(data.musicUrl);
        renderRSVPList(data.rsvpList);
        setupRSVPForm();

    } catch (error) {
        console.error(error);
        document.getElementById("loading-screen").innerHTML = "<p>Gagal memuat data undangan.</p>";
    }
});

// 1. Fitur Format Tanggal
function formatDate(isoString) {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return isoString;
    return d.toLocaleDateString("id-ID", { day: 'numeric', month: 'long', year: 'numeric' });
}

// 2. Fitur Countdown Timer
function initCountdown(targetDateStr) {
    const targetDate = new Date(targetDateStr).getTime();
    if (isNaN(targetDate)) return;

    const timer = setInterval(() => {
        const now = new Date().getTime();
        const diff = targetDate - now;

        if (diff < 0) {
            clearInterval(timer);
            if(document.getElementById("countdown")) {
                document.getElementById("countdown").innerHTML = "Acara Telah Berlangsung";
            }
            return;
        }

        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);

        if(document.getElementById("days")) document.getElementById("days").innerText = days;
        if(document.getElementById("hours")) document.getElementById("hours").innerText = hours;
        if(document.getElementById("minutes")) document.getElementById("minutes").innerText = minutes;
        if(document.getElementById("seconds")) document.getElementById("seconds").innerText = seconds;
    }, 1000);
}

// 3. Fitur Musik Player
function initMusic(musicUrl) {
    if (!musicUrl) return;
    const audio = new Audio(musicUrl);
    audio.loop = true;

    const btn = document.getElementById("music-btn");
    if (btn) {
        btn.addEventListener("click", () => {
            if (audio.paused) {
                audio.play();
                btn.innerText = "🎵 Jeda Musik";
            } else {
                audio.pause();
                btn.innerText = "🎵 Putar Musik";
            }
        });
    }
}

// 4. Render Daftar Ucapan
function renderRSVPList(rsvpList) {
    const container = document.getElementById("rsvp-list");
    if (!container) return;

    if (!rsvpList || rsvpList.length === 0) {
        container.innerHTML = "<p style='color:#777;'>Belum ada ucapan. Jadilah yang pertama!</p>";
        return;
    }

    container.innerHTML = rsvpList.map(item => `
        <div style="background:#fff; padding:12px; margin-bottom:10px; border-radius:6px; text-align:left; border-left:4px solid #5a4033;">
            <strong>${escapeHtml(item.name)}</strong> <small style="color:#888;">(${item.attendance})</small>
            <p style="margin:5px 0 0 0; color:#444;">${escapeHtml(item.message)}</p>
        </div>
    `).join("");
}

// 5. Kirim Form RSVP ke Apps Script
function setupRSVPForm() {
    const form = document.getElementById("rsvp-form");
    if (!form) return;

    form.addEventListener("submit", async (e) => {
        e.preventDefault();
        const btn = form.querySelector("button");
        btn.disabled = true;
        btn.innerText = "Mengirim...";

        const payload = {
            slug: globalSlug,
            name: document.getElementById("rsvp-name").value,
            attendance: document.getElementById("rsvp-attendance").value,
            message: document.getElementById("rsvp-message").value
        };

        try {
            const res = await fetch(API_URL, {
                method: "POST",
                body: JSON.stringify(payload)
            });
            const result = await res.json();

            if (result.status === "success") {
                alert("Terima kasih! Ucapan Anda telah terkirim.");
                form.reset();
                // Reload data ucapan
                const response = await fetch(`${API_URL}?u=${encodeURIComponent(globalSlug)}`);
                const latest = await response.json();
                if(latest.data) renderRSVPList(latest.data.rsvpList);
            } else {
                alert("Gagal mengirim ucapan.");
            }
        } catch (err) {
            console.error(err);
            alert("Terjadi kesalahan.");
        } finally {
            btn.disabled = false;
            btn.innerText = "Kirim Ucapan";
        }
    });
}

function escapeHtml(text) {
    return text.replace(/[&<>"']/g, (m) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' })[m]);
}
