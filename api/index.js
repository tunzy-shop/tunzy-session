import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import cors from 'cors';
import crypto from 'crypto';  // <-- Make sure this line is present!
import makeWASocket from 'baileys';
import { useMultiFileAuthState } from 'baileys';
import pino from 'pino';
import fs from 'fs-extra';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = process.env.PORT || 3000;

// Sessions directory
const sessionsDir = process.env.RENDER 
    ? '/opt/render/project/src/sessions' 
    : path.join(__dirname, '../sessions');

fs.ensureDirSync(sessionsDir);

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

// Generate session ID
function generateSessionId() {
    return `tunzymd2_${crypto.randomBytes(16).toString('hex')}`;
}

// Pairing endpoint
app.post('/api/pair', async (req, res) => {
    try {
        const { phoneNumber } = req.body;
        
        if (!phoneNumber) {
            return res.status(400).json({ 
                success: false, 
                message: 'Phone number required' 
            });
        }

        const cleanNumber = phoneNumber.replace(/\D/g, '');
        const sessionId = generateSessionId();
        const sessionDir = path.join(sessionsDir, sessionId);
        
        await fs.ensureDir(sessionDir);
        
        const { state, saveCreds } = await useMultiFileAuthState(sessionDir);
        
        const sock = makeWASocket.default({
            auth: state,
            logger: pino({ level: 'silent' }),
            browser: ['TUNZY-MD2', 'Safari', '3.0']
        });

        setTimeout(async () => {
            try {
                const code = await sock.requestPairingCode(cleanNumber);
                
                res.json({
                    success: true,
                    pairingCode: code,
                    sessionId: sessionId
                });

                // Send session to DM when connected
                sock.ev.on('connection.update', async (update) => {
                    const { connection } = update;
                    if (connection === 'open') {
                        const userJid = cleanNumber + '@s.whatsapp.net';
                        await sock.sendMessage(userJid, {
                            text: `✅ *TUNZY-MD2 Session*\n\n*Session ID:*\n\`\`\`${sessionId}\`\`\`\n\n📺 *YouTube:* Tunzy Shop`
                        });
                    }
                });
                
            } catch (error) {
                console.error('Pairing error:', error);
            }
        }, 2000);

        sock.ev.on('creds.update', saveCreds);

    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Server error' 
        });
    }
});

// QR endpoint
app.post('/api/qr', async (req, res) => {
    try {
        const sessionId = generateSessionId();
        const sessionDir = path.join(sessionsDir, sessionId);
        
        await fs.ensureDir(sessionDir);
        
        const { state, saveCreds } = await useMultiFileAuthState(sessionDir);
        
        const sock = makeWASocket.default({
            auth: state,
            logger: pino({ level: 'silent' }),
            browser: ['TUNZY-MD2', 'Safari', '3.0'],
            printQRInTerminal: true
        });

        sock.ev.on('connection.update', (update) => {
            const { qr } = update;
            if (qr) {
                res.json({
                    success: true,
                    qr: qr,
                    sessionId: sessionId
                });
            }
        });

        sock.ev.on('creds.update', saveCreds);

    } catch (error) {
        console.error('QR error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'QR generation failed' 
        });
    }
});

// Health check
app.get('/health', (req, res) => {
    res.json({ status: 'OK', time: new Date().toISOString() });
});

// Serve frontend
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../public', 'index.html'));
});

app.listen(port, '0.0.0.0', () => {
    console.log(`┏━━━━━━━━━━━━━━━━━━━━━━━━┓`);
    console.log(`┃  TUNZY SESSION v1.0    ┃`);
    console.log(`┃  Port: ${port}                 ┃`);
    console.log(`┃  YouTube: Tunzy Shop   ┃`);
    console.log(`┗━━━━━━━━━━━━━━━━━━━━━━━━┛`);
});
