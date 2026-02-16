function showOptions() {
    document.getElementById('pairingForm').classList.add('hidden');
    document.getElementById('qrForm').classList.add('hidden');
    document.querySelector('.options').classList.remove('hidden');
}

function showPairing() {
    document.querySelector('.options').classList.add('hidden');
    document.getElementById('pairingForm').classList.remove('hidden');
    document.getElementById('qrForm').classList.add('hidden');
}

function showQR() {
    document.querySelector('.options').classList.add('hidden');
    document.getElementById('qrForm').classList.remove('hidden');
    document.getElementById('pairingForm').classList.add('hidden');
}

async function generatePairing() {
    const country = document.getElementById('countryCode').value;
    const phone = document.getElementById('phoneNumber').value;
    
    if (!phone) {
        showError('Enter phone number');
        return;
    }
    
    const fullNumber = country + phone;
    
    showLoading(true);
    
    try {
        const res = await fetch('/api/pair', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ phoneNumber: fullNumber })
        });
        
        const data = await res.json();
        
        if (data.success) {
            document.getElementById('pairingCode').textContent = data.pairingCode;
            document.getElementById('pairingResult').classList.remove('hidden');
            navigator.clipboard.writeText(data.pairingCode);
        } else {
            showError(data.message || 'Failed');
        }
    } catch (err) {
        showError('Network error');
    }
    
    showLoading(false);
}

async function generateQR() {
    showLoading(true);
    
    try {
        const res = await fetch('/api/qr', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'}
        });
        
        const data = await res.json();
        
        if (data.success) {
            QRCode.toDataURL(data.qr, { width: 250 }, (err, url) => {
                const img = document.createElement('img');
                img.src = url;
                document.getElementById('qrcode').innerHTML = '';
                document.getElementById('qrcode').appendChild(img);
                document.getElementById('qrResult').classList.remove('hidden');
            });
        } else {
            showError(data.message || 'Failed');
        }
    } catch (err) {
        showError('Network error');
    }
    
    showLoading(false);
}

function showLoading(show) {
    document.getElementById('loading').classList.toggle('hidden', !show);
}

function showError(msg) {
    const error = document.getElementById('error');
    error.textContent = msg;
    error.classList.remove('hidden');
    setTimeout(() => error.classList.add('hidden'), 3000);
}
