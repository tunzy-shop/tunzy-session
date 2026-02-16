let currentMethod = 'pairing';

document.addEventListener('DOMContentLoaded', function() {
    showPairing();
    
    document.getElementById('generateBtn').addEventListener('click', generatePairing);
    document.getElementById('generateQRBtn').addEventListener('click', generateQR);
});

function showPairing() {
    currentMethod = 'pairing';
    document.getElementById('pairingTab').classList.add('active');
    document.getElementById('qrTab').classList.remove('active');
    document.getElementById('pairingForm').classList.remove('hidden');
    document.getElementById('qrForm').classList.add('hidden');
    document.getElementById('code-container').classList.add('hidden');
    document.getElementById('qr-result').classList.add('hidden');
}

function showQR() {
    currentMethod = 'qr';
    document.getElementById('qrTab').classList.add('active');
    document.getElementById('pairingTab').classList.remove('active');
    document.getElementById('qrForm').classList.remove('hidden');
    document.getElementById('pairingForm').classList.add('hidden');
    document.getElementById('code-container').classList.add('hidden');
    document.getElementById('qr-result').classList.add('hidden');
}

async function generatePairing() {
    const phone = document.getElementById('phone').value.trim();
    
    if (!phone) {
        showError('Enter phone number');
        return;
    }

    const generateBtn = document.getElementById('generateBtn');
    generateBtn.disabled = true;
    document.getElementById('loading').classList.remove('hidden');
    document.getElementById('code-container').classList.add('hidden');

    try {
        const res = await fetch('/api/pair', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ phoneNumber: phone })
        });

        const data = await res.json();

        if (data.success) {
            document.getElementById('loading').classList.add('hidden');
            document.getElementById('pairingCode').textContent = data.pairingCode;
            document.getElementById('code-container').classList.remove('hidden');
            navigator.clipboard.writeText(data.pairingCode);
        } else {
            showError(data.message || 'Failed');
        }
    } catch (err) {
        showError('Network error');
    }

    generateBtn.disabled = false;
}

async function generateQR() {
    document.getElementById('loading').classList.remove('hidden');
    document.getElementById('qrContainer').classList.add('hidden');
    document.getElementById('qr-result').classList.add('hidden');

    try {
        const res = await fetch('/api/qr', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'}
        });

        const data = await res.json();

        if (data.success) {
            document.getElementById('loading').classList.add('hidden');
            
            QRCode.toDataURL(data.qr, { width: 250 }, (err, url) => {
                const img = document.createElement('img');
                img.src = url;
                document.getElementById('qrcode').innerHTML = '';
                document.getElementById('qrcode').appendChild(img);
                document.getElementById('qr-result').classList.remove('hidden');
            });
        } else {
            showError(data.message || 'Failed');
        }
    } catch (err) {
        showError('Network error');
    }
}

function showError(msg) {
    document.getElementById('loading').classList.add('hidden');
    const error = document.getElementById('error');
    error.textContent = msg;
    error.classList.remove('hidden');
    setTimeout(() => error.classList.add('hidden'), 3000);
                                }
