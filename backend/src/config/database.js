const mysql = require('mysql2/promise');
const crypto = require('crypto');

const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306'),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'rootpass',
    database: process.env.DB_NAME || 'saas_whatsapp',
    charset: 'utf8mb4',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
});

function generateId() {
    return crypto.randomUUID();
}

// Convert snake_case DB columns to camelCase for API responses
function toCamelCase(row) {
    if (!row) return null;
    const result = {};
    for (const [key, value] of Object.entries(row)) {
        const camel = key.replace(/_([a-z])/g, (_, l) => l.toUpperCase());
        result[camel] = value;
    }
    return result;
}

function rowsToCamel(rows) {
    return rows.map(toCamelCase);
}

async function initDatabase() {
    const conn = await pool.getConnection();
    try {
        // Ensure database uses utf8mb4 for emoji support
        await conn.query(`ALTER DATABASE \`${process.env.DB_NAME || 'saas_whatsapp'}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);

        await conn.query(`
            CREATE TABLE IF NOT EXISTS users (
                id VARCHAR(36) PRIMARY KEY,
                email VARCHAR(255) UNIQUE NOT NULL,
                password VARCHAR(255) NOT NULL,
                name VARCHAR(255),
                plan VARCHAR(50) DEFAULT 'FREE',
                avatar TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            )
        `);

        await conn.query(`
            CREATE TABLE IF NOT EXISTS whatsapp_sessions (
                id VARCHAR(36) PRIMARY KEY,
                user_id VARCHAR(36) NOT NULL,
                session_name VARCHAR(255) NOT NULL,
                status VARCHAR(50) DEFAULT 'DISCONNECTED',
                qr_code LONGTEXT,
                phone VARCHAR(50),
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            )
        `);

        await conn.query(`
            CREATE TABLE IF NOT EXISTS contacts (
                id VARCHAR(36) PRIMARY KEY,
                user_id VARCHAR(36) NOT NULL,
                phone VARCHAR(255) NOT NULL,
                name VARCHAR(255),
                tags TEXT,
                notes TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                UNIQUE KEY unique_user_phone (user_id, phone)
            )
        `);

        await conn.query(`
            CREATE TABLE IF NOT EXISTS messages (
                id VARCHAR(36) PRIMARY KEY,
                session_id VARCHAR(36) NOT NULL,
                contact_id VARCHAR(36),
                direction VARCHAR(20) NOT NULL,
                body TEXT NOT NULL,
                media_url TEXT,
                status VARCHAR(50) DEFAULT 'SENT',
                timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (session_id) REFERENCES whatsapp_sessions(id) ON DELETE CASCADE,
                FOREIGN KEY (contact_id) REFERENCES contacts(id) ON DELETE SET NULL,
                INDEX idx_session_id (session_id),
                INDEX idx_contact_id (contact_id)
            )
        `);

        await conn.query(`
            CREATE TABLE IF NOT EXISTS automations (
                id VARCHAR(36) PRIMARY KEY,
                user_id VARCHAR(36) NOT NULL,
                name VARCHAR(255) NOT NULL,
                \`trigger\` TEXT NOT NULL,
                response TEXT NOT NULL,
                match_type VARCHAR(50) DEFAULT 'CONTAINS',
                enabled BOOLEAN DEFAULT TRUE,
                priority INT DEFAULT 0,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            )
        `);

        // Ensure tables use utf8mb4 for emoji support
        // Check if migration is needed
        const [[tableInfo]] = await conn.query(
            `SELECT CCSA.character_set_name as charset
             FROM information_schema.TABLES T
             JOIN information_schema.COLLATION_CHARACTER_SET_APPLICABILITY CCSA
               ON T.table_collation = CCSA.collation_name
             WHERE T.table_schema = ? AND T.table_name = 'automations'`,
            [process.env.DB_NAME || 'saas_whatsapp']
        );
        if (tableInfo && tableInfo.charset !== 'utf8mb4') {
            console.log('[DB] Migrating tables to utf8mb4...');
            // Drop all tables in reverse dependency order and let them be recreated
            await conn.query('DROP TABLE IF EXISTS automations');
            await conn.query('DROP TABLE IF EXISTS messages');
            await conn.query('DROP TABLE IF EXISTS contacts');
            await conn.query('DROP TABLE IF EXISTS whatsapp_sessions');
            await conn.query('DROP TABLE IF EXISTS users');
            // Re-run all CREATE TABLE statements (they run above with IF NOT EXISTS)
            // Need to release and re-init
            conn.release();
            return initDatabase();
        }

        console.log('[DB] Tables initialized successfully (utf8mb4)');
    } finally {
        conn.release();
    }
}

module.exports = { pool, generateId, toCamelCase, rowsToCamel, initDatabase };
