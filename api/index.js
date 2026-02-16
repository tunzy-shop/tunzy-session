import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import cors from 'cors';
import crypto from 'crypto';  // Important: crypto is now imported
import makeWASocket from 'baileys';
import { useMultiFileAuthState } from 'baileys';
import pino from 'pino';
import fs from 'fs-extra';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = process.env.PORT || 3000;

// Sessions directory (persistent on Render)
const sessionsDir = process.env.RENDER 
    ? '/opt/render/project/src/sessions' 
    : path.join(__dirname, '../sessions');

fs.ensureDirSync(sessionsDir);

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

// Generate unique session ID
function generateSessionId() {
    return `tunzymd2_${crypto.randomBytes(16).toString('hex')}`;
}

// ==================== PAIRING CODE ENDPOINT ====================
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
        
        if (cleanNumber.length < 10 || cleanNumber.length > 15) {
            return res.status(400).json({ 
                success: false, 
                message: 'Invalid phone number format' 
            });
        }

        const sessionId = generateSessionId();
        const sessionDir = path.join(sessionsDir, sessionId);
        
        await fs.ensureDir(sessionDir);
        
        console.log(`📱 New pairing request: ${cleanNumber}`);
        console.log(`🔑 Session ID: ${sessionId}`);
        
        const { state, saveCreds } = await useMultiFileAuthState(sessionDir);
        
        const sock = makeWASocket.default({
            auth: state,
            logger: pino({ level: 'silent' }),
            browser: ['TUNZY-MD2', 'Safari', '3.0'],
            syncFullHistory: false
        });

        // Request pairing code after socket is ready
        setTimeout(async () => {
            try {
                const code = await sock.requestPairingCode(cleanNumber);
                
                console.log(`✅ Pairing code generated: ${code}`);
                
                // Send response back to client
                res.json({
                    success: true,
                    pairingCode: code,
                    sessionId: sessionId
                });

                // When connection opens, send session ID to user's DM
                sock.ev.on('connection.update', async (update) => {
                    const { connection } = update;
                    if (connection === 'open') {
                        console.log('✅ WhatsApp connected, sending session to DM...');
                        
                        const userJid = cleanNumber + '@s.whatsapp.net';
                        try {
                            await sock.sendMessage(userJid, {
                                text: `✅ *TUNZY-MD2 Session Generated!*\n\n` +
                                      `*Session ID:*\n` +
                                      `\`\`\`${sessionId}\`\`\`\n\n` +
                                      `📺 *YouTube:* Tunzy Shop\n` +
                                      `📢 *Join Channel:* https://whatsapp.com/channel/yourchannelid`
                            });
                            console.log('✅ Session sent to DM');
                        } catch (dmError) {
                            console.log('Failed to send DM:', dmError);
                        }
                    }
                });
                
            } catch (error) {
                console.error('❌ Pairing error:', error);
                if (!res.headersSent) {
                    res.status(500).json({ 
                        success: false, 
                        message: 'Failed to generate pairing code. Make sure the number is valid.' 
                    });
                }
            }
        }, 2000);

        // Save credentials when updated
        sock.ev.on('creds.update', saveCreds);

    } catch (error) {
        console.error('❌ Server error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Internal server error' 
        });
    }
});

// ==================== QR CODE ENDPOINT ====================
app.post('/api/qr', async (req, res) => {
    try {
        const sessionId = generateSessionId();
        const sessionDir = path.join(sessionsDir, sessionId);
        
        await fs.ensureDir(sessionDir);
        
        console.log(`📱 New QR request, Session: ${sessionId}`);
        
        const { state, saveCreds } = await useMultiFileAuthState(sessionDir);
        
        const sock = makeWASocket.default({
            auth: state,
            logger: pino({ level: 'silent' }),
            browser: ['TUNZY-MD2', 'Safari', '3.0'],
            printQRInTerminal: true,
            syncFullHistory: false
        });

        // Listen for QR code
        sock.ev.on('connection.update', (update) => {
            const { qr, connection } = update;
            
            if (qr) {
                console.log('✅ QR code generated');
                res.json({
                    success: true,
                    qr: qr,
                    sessionId: sessionId
                });
            }
            
            if (connection === 'open') {
                console.log('✅ QR connected successfully');
            }
        });

        // Save credentials
        sock.ev.on('creds.update', saveCreds);

    } catch (error) {
        console.error('❌ QR error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to generate QR code' 
        });
    }
});

// ==================== HEALTH CHECK ====================
app.get('/health', (req, res) => {
    res.json({ 
        status: 'OK', 
        time: new Date().toISOString(),
        sessions: fs.readdirSync(sessionsDir).length 
    });
});

// ==================== SERVE FRONTEND ====================
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../public', 'index.html'));
});

// ==================== START SERVER ====================
app.listen(port, '0.0.0.0', () => {
    console.log('┏━━━━━━━━━━━━━━━━━━━━━━━━┓');
    console.log('┃  TUNZY SESSION v1.0    ┃');
    console.log(`┃  Port: ${port}                 ┃`);
    console.log('┃  YouTube: Tunzy Shop   ┃');
    console.log('┗━━━━━━━━━━━━━━━━━━━━━━━━┛');
    console.log(`📁 Sessions stored in: ${sessionsDir}`);
});
