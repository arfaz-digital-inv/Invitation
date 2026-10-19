const API_URL = "https://script.google.com/macros/s/AKfycbyAPZQeJMWEm73SsZutxWk9QtCjG27dfkdqKZ6vUHrBNJXLtcFy4kqyNkT2IdpdL7BAeQ/exec";

document.addEventListener("DOMContentLoaded", async () => {
    const urlParams = new URLSearchParams(window.location.search);
    const slug = urlParams.get("u");
    const guestName = urlParams.get("to") || "Tamu Undangan";

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

        // Pasang CSS Tema
        document.getElementById("theme-style").href = `themes/${data.theme}/style.css`;

        // Fetch Template HTML Tema
        const templateResponse = await fetch(`themes/${data.theme}/template.html`);
        let templateHtml = await templateResponse.text();

        // Inject Data ke Template
        templateHtml = templateHtml
            .replace(/{{groom}}/g, data.groom)
            .replace(/{{bride}}/g, data.bride)
            .replace(/{{date}}/g, formatDate(data.date))
            .replace(/{{guestName}}/g, guestName)
            .replace(/{{mapUrl}}/g, data.mapUrl)
            .replace(/{{musicUrl}}/g, data.musicUrl);

        document.getElementById("app-root").innerHTML = templateHtml;
        document.getElementById("loading-screen").style.display = "none";

    } catch (error) {
        console.error(error);
        document.getElementById("loading-screen").innerHTML = "<p>Gagal memuat data undangan.</p>";
    }
});

function formatDate(isoString) {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return isoString;
    return d.toLocaleDateString("id-ID", { day: 'numeric', month: 'long', year: 'numeric' });
}
