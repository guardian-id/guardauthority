const POWER_AUTOMATE_URL = "URL_HTTP_POST_FLOW_ANDA_DI_SINI";

const idInput = document.getElementById("paramId");
const nameInput = document.getElementById("paramName"); // DOM Baru untuk Nama
const btnConfirm = document.getElementById("btnConfirm");
const statusMsg = document.getElementById("statusMsg");
const otpInputs = document.querySelectorAll(".otp-input");

let REAL_ID = "";

document.addEventListener("DOMContentLoaded", () => {
    const urlParams = new URLSearchParams(window.location.search);
    const encryptedParam = urlParams.get('id');

    if (!encryptedParam) {
        handleInvalidInput("ID Tidak Ditemukan", "Gagal memuat ID. Pastikan link benar.");
        return;
    }

    try {
        // 1. Decode Base64 dari URL
        const decodedString = atob(encryptedParam); 
        const parts = decodedString.split('|');

        // Sekarang kita validasi apakah hasil split menghasilkan 3 bagian
        if (parts.length !== 3) {
            throw new Error("Format parameter tidak valid.");
        }

        const idParam = parts[0];
        const timestampParam = parts[1]; 
        const nameParam = parts[2]; // Ambil data Nama Pengaju

        // 2. Proteksi Sekali Pakai (Local Storage)
        const isAlreadyUsed = localStorage.getItem(`used_link_${idParam}`);
        if (isAlreadyUsed === "true") {
            handleInvalidInput("Link Sudah Digunakan", "Maaf, link konfirmasi ini hanya bisa digunakan 1 kali saja.");
            return;
        }

        // 3. Hitung Validasi Waktu (Maksimal 1 Hari / 24 Jam)
        const requestTime = new Date(timestampParam);
        const currentTime = new Date();
        
        const timeDifference = currentTime - requestTime;
        const oneDayInMilliseconds = 24 * 60 * 60 * 1000;

        if (timeDifference > oneDayInMilliseconds || timeDifference < 0) {
            handleInvalidInput("Link Expired", "Maaf, akses link ini sudah kedaluwarsa (Maksimal 1 Hari).");
            return;
        }

        // 4. Jika lolos semua validasi, tampilkan ID dan Nama
        REAL_ID = idParam;
        idInput.value = REAL_ID;
        nameInput.value = nameParam; // Tampilkan nama pengaju di layar

    } catch (error) {
        console.error("Decode Error:", error);
        handleInvalidInput("Invalid Link", "Link tidak valid atau telah dimodifikasi.");
    }
});

// LOGIKA INTERAKSI KOTAK OTP
otpInputs.forEach((input, index) => {
    input.addEventListener("input", (e) => {
        const value = e.target.value;
        e.target.value = value.replace(/[^0-9]/g, '');

        if (e.target.value.length === 1 && index < otpInputs.length - 1) {
            otpInputs[index + 1].focus();
        }
    });

    input.addEventListener("keydown", (e) => {
        if (e.key === "Backspace" && !e.target.value && index > 0) {
            otpInputs[index - 1].focus();
        }
    });
});

// Event Listener Klik Tombol Confirm
btnConfirm.addEventListener("click", async () => {
    let pinValue = "";
    otpInputs.forEach(input => {
        pinValue += input.value;
    });

    if (pinValue.length !== 6) {
        showStatus("Silakan lengkapi 6 digit PIN Anda!", "error");
        return;
    }

    btnConfirm.disabled = true;
    btnConfirm.innerText = "Processing...";

    const payload = {
        id: REAL_ID,
        pin: pinValue
        // Jika Power Automate butuh dikirimi balik nama-nya, Anda bisa tambahkan: name: nameInput.value
    };

    try {
        const response = await fetch(POWER_AUTOMATE_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });

        if (response.ok) {
            localStorage.setItem(`used_link_${REAL_ID}`, "true");
            showStatus("PIN Berhasil Dikonfirmasi! Terimakasih.", "success");
            
            otpInputs.forEach(input => {
                input.value = "";
                input.disabled = true;
            });
            btnConfirm.innerText = "Confirmed";
            idInput.value = "Link Sudah Digunakan";
            nameInput.value = "-"; // Bersihkan/samarkan kolom nama setelah selesai
            
        } else {
            throw new Error("Server merespon dengan error.");
        }
    } catch (error) {
        console.error("Error:", error);
        showStatus("Gagal mengirim konfirmasi. Silakan coba lagi.", "error");
        btnConfirm.disabled = false;
        btnConfirm.innerText = "Confirm PIN";
    }
});

function handleInvalidInput(inputPlaceholder, statusText) {
    idInput.value = inputPlaceholder;
    idInput.style.color = "#b91c1c";
    if(nameInput) nameInput.value = "-";
    otpInputs.forEach(input => input.disabled = true);
    btnConfirm.disabled = true;
    showStatus(statusText, "error");
}

function showStatus(message, type) {
    statusMsg.innerText = message;
    statusMsg.className = "status-message " + (type === "success" ? "status-success" : "status-error");
    statusMsg.style.display = "block";
}