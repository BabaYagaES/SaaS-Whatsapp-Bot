const express = require('express');
const fs = require('fs');
const path = require('path');
const { pool, generateId, toCamelCase, rowsToCamel } = require('../../config/database');
const { authenticate } = require('../../middlewares/auth.middleware');

const router = express.Router();

router.use(authenticate);

// GET /api/media
router.get('/', async (req, res) => {
    try {
        const [rows] = await pool.execute(
            'SELECT * FROM media WHERE user_id = ? ORDER BY created_at DESC',
            [req.user.id]
        );
        res.json({ media: rowsToCamel(rows) });
    } catch (err) {
        console.error('[Media] List error:', err);
        res.status(500).json({ error: { message: 'Error fetching gallery' } });
    }
});

// POST /api/media
router.post('/', async (req, res) => {
    try {
        const { name, mediaBase64, mediaMimeType, tags } = req.body;

        if (!name || !mediaBase64 || !mediaMimeType) {
            return res.status(400).json({ error: { message: 'Nombre y archivo son requeridos' } });
        }

        let mediaUrl = '';

        try {
            const uploadsDir = path.resolve(__dirname, '../../../../public/uploads');
            if (!fs.existsSync(uploadsDir)) {
                fs.mkdirSync(uploadsDir, { recursive: true });
            }
            
            const ext = mediaMimeType.includes('image') ? '.jpg' : 
                        mediaMimeType.includes('pdf') ? '.pdf' : 
                        mediaMimeType.includes('audio') ? '.mp3' : '.bin';
            
            const fileName = `gal-${Date.now()}-${generateId()}${ext}`;
            const filePath = path.join(uploadsDir, fileName);
            fs.writeFileSync(filePath, Buffer.from(mediaBase64, 'base64'));
            mediaUrl = `http://localhost:3001/uploads/${fileName}`;
        } catch (err) {
            console.error('[Media] Error saving file:', err);
            return res.status(500).json({ error: { message: 'Error al guardar el archivo' } });
        }

        const id = generateId();
        const fileType = mediaMimeType.split('/')[0]; // 'image', 'application', etc.

        await pool.execute(
            'INSERT INTO media (id, user_id, name, url, file_type, tags) VALUES (?, ?, ?, ?, ?, ?)',
            [id, req.user.id, name, mediaUrl, fileType, tags || '']
        );

        const [[row]] = await pool.execute('SELECT * FROM media WHERE id = ?', [id]);
        res.status(201).json({ item: toCamelCase(row) });
    } catch (err) {
        console.error('[Media] Create error:', err);
        res.status(500).json({ error: { message: 'Error al subir a la galería' } });
    }
});

// DELETE /api/media/:id
router.delete('/:id', async (req, res) => {
    try {
        const [existing] = await pool.execute(
            'SELECT id, url FROM media WHERE id = ? AND user_id = ?',
            [req.params.id, req.user.id]
        );
        if (existing.length === 0) {
            return res.status(404).json({ error: { message: 'Item not found' } });
        }

        // Optional: delete physical file
        try {
            const fileName = existing[0].url.split('/').pop();
            const filePath = path.resolve(__dirname, '../../../../public/uploads', fileName);
            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
            }
        } catch (e) {}

        await pool.execute('DELETE FROM media WHERE id = ?', [req.params.id]);
        res.json({ message: 'Item deleted' });
    } catch (err) {
        console.error('[Media] Delete error:', err);
        res.status(500).json({ error: { message: 'Error deleting item' } });
    }
});

module.exports = router;
