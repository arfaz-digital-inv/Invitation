const API_URL = "https://script.google.com/macros/s/AKfycbyAPZQeJMWEm73SsZutxWk9QtCjG27dfkdqKZ6vUHrBNJXLtcFy4kqyNkT2IdpdL7BAeQ/exec";
let globalSlug = "";
let currentSlideIndex = 0;
let totalGallerySlides = 0;

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

        // 1. Pasang Style CSS Tema
        document.getElementById("theme-style").href = `themes/${data.theme}/style.css`;

        // 2. Fetch Template HTML Tema
        const templateResponse = await fetch(`themes/${data.theme}/template.html`);
        let templateHtml = await templateResponse.text();

        // Placeholder default
        const defaultGroomImg = "https://via.placeholder.com/300x300/181818/d4af37?text=Pria";
        const defaultBrideImg = "https://via.placeholder.com/300x300/181818/d4af37?text=Wanita";

        // 3. Inject Data Utama, Foto, dan Silsilah Orang Tua ke HTML Template
        templateHtml = templateHtml
            .replace(/{{groom}}/g, data.groom || '')
            .replace(/{{bride}}/g, data.bride || '')
            .replace(/{{date}}/g, formatDate(data.date))
            .replace(/{{guestName}}/g, guestName)
            .replace(/{{mapUrl}}/g, data.mapUrl || '#')
            .replace(/{{bankName}}/g, data.bankName || '-')
            .replace(/{{bankNo}}/g, data.bankNo || '-')
            .replace(/{{bankOwner}}/g, data.bankOwner || '-')
            .replace(/{{groomImg}}/g, data.groomImg || defaultGroomImg)
            .replace(/{{brideImg}}/g, data.brideImg || defaultBrideImg)
            .replace(/{{storyTitle}}/g, data.storyTitle || 'Kisah Cinta Kami')
            .replace(/{{storyText}}/g, data.storyText || 'Terima kasih telah menjadi bagian dari perjalanan cinta kami.')
            .replace(/{{groomParents}}/g, data.groomParents || '')
            .replace(/{{brideParents}}/g, data.brideParents || '')
            .replace(/{{akadTime}}/g, data.akadTime || '')
            .replace(/{{akadPlace}}/g, data.akadPlace || '')
            .replace(/{{resepsiTime}}/g, data.resepsiTime || '')
            .replace(/{{resepsiPlace}}/g, data.resepsiPlace || '')
            .replace(/{{eventAddress}}/g, data.eventAddress || '');

        document.getElementById("app-root").innerHTML = templateHtml;
        document.getElementById("loading-screen").style.display = "none";

        // 4. Inisialisasi Galeri Foto (Sesuai Tema)
        renderGallery(data.galleryImgs, data.theme);

        // 5. Inisialisasi Fitur Tambahan
        initCountdown(data.date);
        renderRSVPList(data.rsvpList);
        setupRSVPForm();

        // 6. Setup Tombol Buka Undangan & Autoplay Musik
        setupCoverAndMusic(data.musicUrl);

    } catch (error) {
        console.error(error);
        document.getElementById("loading-screen").innerHTML = "<p>Gagal memuat data undangan.</p>";
    }
});

function formatDate(isoString) {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return isoString || '';
    return d.toLocaleDateString("id-ID", { day: 'numeric', month: 'long', year: 'numeric' });
}

function renderGallery(galleryImgs, themeName) {
    const container = document.getElementById("gallery-container");
    if (!container) return;

    if (!galleryImgs || galleryImgs.length === 0 || galleryImgs[0] === '') {
        container.innerHTML = "<p style='color:#777; font-size:0.9rem;'>Belum ada foto di galeri.</p>";
        return;
    }

    // 1. TEMA JAWA KERATON: Slider Otomatis 2 Foto Berpasangan Tanpa Tombol Manual
    if (themeName === "jawa-keraton-01") {
        const pairs = [];
        for (let i = 0; i < galleryImgs.length; i += 2) {
            pairs.push(galleryImgs.slice(i, i + 2));
        }
        totalGallerySlides = pairs.length;
        currentSlideIndex = 0;

        let slidesHtml = pairs.map((pair, index) => `
            <div class="gallery-slide ${index === 0 ? 'active' : ''}" style="display: ${index === 0 ? 'flex' : 'none'}; justify-content: center; gap: 15px; width: 100%;">
                ${pair.map(imgUrl => `
                    <div style="flex: 1; max-width: 250px; aspect-ratio: 1/1; overflow: hidden; border-radius: 10px; border: 1px solid #d4af37; box-shadow: 0 4px 12px rgba(0,0,0,0.6);">
                        <img src="${escapeHtml(imgUrl)}" style="width: 100%; height: 100%; object-fit: cover; display: block;">
                    </div>
                `).join('')}
            </div>
        `).join('');

        // Wadah Murni Foto Tanpa Tombol Panah
        container.innerHTML = `
            <div style="position: relative; max-width: 520px; margin: 0 auto; display: flex; align-items: center; justify-content: center; min-height: 250px;">
                ${slidesHtml}
            </div>
        `;

        // Pindah Slide Otomatis Setiap 3.5 Detik
        if (totalGallerySlides > 1) {
            if (window.galleryInterval) clearInterval(window.galleryInterval);
            window.galleryInterval = setInterval(() => {
                autoNextGallerySlide();
            }, 3500);
        }

    } else {
        // 2. TEMA LAIN (Japandi, Rustic, dll): Render Galeri Model Grid Standar
        container.innerHTML = galleryImgs.map(imgUrl => `
            <div style="overflow:hidden; border-radius:8px; box-shadow:0 2px 8px rgba(0,0,0,0.3);">
                <img src="${escapeHtml(imgUrl)}" style="width:100%; height:100%; object-fit:cover; aspect-ratio:1/1; display:block; transition:transform 0.3s;" onmouseover="this.style.transform='scale(1.05)'" onmouseout="this.style.transform='scale(1)'">
            </div>
        `).join("");
    }
}

// Fungsi Pindah Slide Otomatis
function autoNextGallerySlide() {
    const slides = document.querySelectorAll(".gallery-slide");
    if (!slides.length) return;

    slides[currentSlideIndex].style.display = "none";
    slides[currentSlideIndex].classList.remove("active");

    currentSlideIndex = (currentSlideIndex + 1) % totalGallerySlides;

    slides[currentSlideIndex].style.display = "flex";
    slides[currentSlideIndex].classList.add("active");
}

function setupCoverAndMusic(musicUrl) {
    const btnOpen = document.getElementById("btn-open-invitation");
    const coverCard = document.getElementById("cover-card");
    let audio = null;

    if (musicUrl) {
        audio = new Audio(musicUrl);
        audio.loop = true;
    }

    document.body.style.overflow = "hidden";

    if (btnOpen && coverCard) {
        btnOpen.addEventListener("click", () => {
            coverCard.style.transition = "opacity 0.8s ease, transform 0.8s ease";
            coverCard.style.opacity = "0";
            coverCard.style.transform = "translateY(-100%)";

            setTimeout(() => {
                coverCard.style.display = "none";
                document.body.style.overflow = "auto";
            }, 800);

            if (audio) {
                audio.play().catch(err => console.log("Autoplay diblokir browser:", err));
                const musicBtn = document.getElementById("music-btn");
                if (musicBtn) {
                    musicBtn.style.display = "block";
                    musicBtn.innerText = "🎵 Jeda Musik";
                }
            }
        });
    }

    const musicBtn = document.getElementById("music-btn");
    if (musicBtn && audio) {
        musicBtn.addEventListener("click", () => {
            if (audio.paused) {
                audio.play();
                musicBtn.innerText = "🎵 Jeda Musik";
            } else {
                audio.pause();
                musicBtn.innerText = "🎵 Putar Musik";
            }
        });
    }
}

function initCountdown(targetDateStr) {
    const targetDate = new Date(targetDateStr).getTime();
    if (isNaN(targetDate)) return;

    const timer = setInterval(() => {
        const now = new Date().getTime();
        const diff = targetDate - now;

        if (diff < 0) {
            clearInterval(timer);
            const cdBox = document.getElementById("countdown");
            if (cdBox) cdBox.innerHTML = "<h4>Acara Telah Berlangsung</h4>";
            return;
        }

        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);

        if (document.getElementById("days")) document.getElementById("days").innerText = days;
        if (document.getElementById("hours")) document.getElementById("hours").innerText = hours;
        if (document.getElementById("minutes")) document.getElementById("minutes").innerText = minutes;
        if (document.getElementById("seconds")) document.getElementById("seconds").innerText = seconds;
    }, 1000);
}

function renderRSVPList(rsvpList) {
    const container = document.getElementById("rsvp-list");
    if (!container) return;

    if (!rsvpList || rsvpList.length === 0) {
        container.innerHTML = "<p style='color:#777; font-size:0.9rem;'>Belum ada ucapan. Jadilah yang pertama memberikan doa!</p>";
        return;
    }

    container.innerHTML = rsvpList.map(item => `
        <div style="background:#181818; padding:14px; margin-bottom:12px; border-radius:8px; text-align:left; border-left:4px solid #d4af37; box-shadow:0 1px 4px rgba(0,0,0,0.5);">
            <div style="display:flex; justify-content:space-between; align-items:center;">
                <strong style="color:#f9e076;">${escapeHtml(item.name)}</strong>
                <small style="padding:2px 8px; background:#222; border-radius:10px; font-size:0.75rem; color:#d4af37; border:1px solid #d4af37;">${escapeHtml(item.attendance)}</small>
            </div>
            <p style="margin:8px 0 0 0; color:#ccc; font-size:0.9rem; line-height:1.4;">${escapeHtml(item.message)}</p>
        </div>
    `).join("");
}

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
                alert("Terima kasih! Ucapan Anda berhasil terkirim.");
                form.reset();
                const response = await fetch(`${API_URL}?u=${encodeURIComponent(globalSlug)}`);
                const latest = await response.json();
                if (latest.data) renderRSVPList(latest.data.rsvpList);
            } else {
                alert("Gagal mengirim ucapan.");
            }
        } catch (err) {
            console.error(err);
            alert("Terjadi kesalahan koneksi.");
        } finally {
            btn.disabled = false;
            btn.innerText = "Kirim Donga Pangestu";
        }
    });
}

function escapeHtml(text) {
    return String(text).replace(/[&<>"']/g, (m) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' })[m]);
}
