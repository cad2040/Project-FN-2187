const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');
const path = require('path');
const http = require('http');
const WebSocket = require('ws');
const winston = require('winston');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const compression = require('compression');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });
const port = process.env.PORT || 3000;

// Logger configuration
const logger = winston.createLogger({
    level: 'info',
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
    ),
    transports: [
        new winston.transports.File({ filename: 'error.log', level: 'error' }),
        new winston.transports.File({ filename: 'combined.log' })
    ]
});

if (process.env.NODE_ENV !== 'production') {
    logger.add(new winston.transports.Console({
        format: winston.format.simple()
    }));
}

// Security middleware
app.use(helmet());
app.use(compression());
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100 // limit each IP to 100 requests per windowMs
});
app.use('/api/', limiter);

// Database configuration
const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'USERNAME',
    password: process.env.DB_PASSWORD || 'PASSWORD',
    database: process.env.DB_NAME || 'BabyMonitor',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
};

// Database connection pool
const pool = mysql.createPool(dbConfig);

// WebSocket connection handling
const clients = new Set();

wss.on('connection', (ws) => {
    clients.add(ws);
    logger.info('New WebSocket connection established');

    ws.on('close', () => {
        clients.delete(ws);
        logger.info('WebSocket connection closed');
    });
});

// Broadcast function for real-time updates
function broadcast(data) {
    clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify(data));
        }
    });
}

// Error handling middleware
app.use((err, req, res, next) => {
    logger.error(err.stack);
    res.status(500).json({
        error: 'Internal Server Error',
        message: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
});

// API Routes with improved error handling and validation

// Get all sensors
app.get('/api/sensors', async (req, res) => {
    try {
        const [rows] = await pool.query(`
            SELECT s.*, r.Reading as lastReading, r.Inserted as lastReadingTime
            FROM Sensors s
            LEFT JOIN SensorReadings r ON s.Id = r.Sensor_Id
            WHERE r.Inserted = (
                SELECT MAX(Inserted)
                FROM SensorReadings
                WHERE Sensor_Id = s.Id
            )
            OR r.Inserted IS NULL
        `);
        res.json(rows);
    } catch (error) {
        logger.error('Error fetching sensors:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Add new sensor with validation
app.post('/api/sensors', async (req, res) => {
    const { name, location, type, minTemp, maxTemp } = req.body;
    
    // Input validation
    if (!name || !location || !type || !minTemp || !maxTemp) {
        return res.status(400).json({ error: 'Missing required fields' });
    }
    
    if (minTemp >= maxTemp) {
        return res.status(400).json({ error: 'Minimum temperature must be less than maximum temperature' });
    }

    try {
        const [result] = await pool.query(
            'INSERT INTO Sensors (Sensor, Location, Min_Temperature, Max_Temperature) VALUES (?, ?, ?, ?)',
            [name, location, minTemp, maxTemp]
        );
        
        // Broadcast new sensor to all connected clients
        broadcast({ type: 'sensor_added', data: { id: result.insertId, name, location, type, minTemp, maxTemp } });
        
        res.json({ id: result.insertId, message: 'Sensor added successfully' });
    } catch (error) {
        logger.error('Error adding sensor:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Get all rooms with improved query
app.get('/api/rooms', async (req, res) => {
    try {
        const [rows] = await pool.query(`
            SELECT r.*, 
                   GROUP_CONCAT(s.Sensor) as sensors,
                   COUNT(DISTINCT sr.Id) as reading_count,
                   AVG(sr.Reading) as avg_temperature
            FROM DimEvents r
            LEFT JOIN Sensors s ON s.Location = r.Event
            LEFT JOIN SensorReadings sr ON s.Id = sr.Sensor_Id
            WHERE r.Category = 'ROOM'
            GROUP BY r.Id
        `);
        
        const rooms = rows.map(row => ({
            ...row,
            sensors: row.sensors ? row.sensors.split(',') : [],
            avg_temperature: row.avg_temperature ? parseFloat(row.avg_temperature).toFixed(1) : null
        }));
        
        res.json(rooms);
    } catch (error) {
        logger.error('Error fetching rooms:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Add new room with validation
app.post('/api/rooms', async (req, res) => {
    const { name, minTemp, maxTemp } = req.body;
    
    // Input validation
    if (!name || !minTemp || !maxTemp) {
        return res.status(400).json({ error: 'Missing required fields' });
    }
    
    if (minTemp >= maxTemp) {
        return res.status(400).json({ error: 'Minimum temperature must be less than maximum temperature' });
    }

    try {
        const [result] = await pool.query(
            'INSERT INTO DimEvents (Event, Category) VALUES (?, ?)',
            [name, 'ROOM']
        );
        
        // Broadcast new room to all connected clients
        broadcast({ type: 'room_added', data: { id: result.insertId, name, minTemp, maxTemp } });
        
        res.json({ id: result.insertId, message: 'Room added successfully' });
    } catch (error) {
        logger.error('Error adding room:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Get temperature readings with improved query and caching
const readingsCache = new Map();
const CACHE_DURATION = 60000; // 1 minute

app.get('/api/readings', async (req, res) => {
    try {
        const cacheKey = 'readings';
        const cachedData = readingsCache.get(cacheKey);
        const now = Date.now();

        if (cachedData && (now - cachedData.timestamp) < CACHE_DURATION) {
            return res.json(cachedData.data);
        }

        const [rooms] = await pool.query('SELECT DISTINCT Event FROM DimEvents WHERE Category = "ROOM"');
        const readings = await Promise.all(rooms.map(async (room) => {
            const [sensors] = await pool.query(
                'SELECT Id FROM Sensors WHERE Location = ?',
                [room.Event]
            );
            const sensorIds = sensors.map(s => s.Id);
            
            if (sensorIds.length === 0) {
                return {
                    name: room.Event,
                    readings: []
                };
            }

            const [readings] = await pool.query(`
                SELECT Reading as temperature, Inserted as timestamp
                FROM SensorReadings
                WHERE Sensor_Id IN (?)
                AND Inserted >= DATE_SUB(NOW(), INTERVAL 24 HOUR)
                ORDER BY Inserted ASC
            `, [sensorIds]);

            return {
                name: room.Event,
                readings
            };
        }));

        // Update cache
        readingsCache.set(cacheKey, {
            data: readings,
            timestamp: now
        });

        res.json(readings);
    } catch (error) {
        logger.error('Error fetching readings:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Get settings with improved error handling
app.get('/api/settings', async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM MetricPlots WHERE Metric = "settings"');
        if (rows.length > 0) {
            res.json(JSON.parse(rows[0].URL));
        } else {
            const defaultSettings = {
                updateInterval: 60,
                tempUnit: 'C',
                dbHost: dbConfig.host,
                dbName: dbConfig.database,
                dbUser: dbConfig.user
            };
            res.json(defaultSettings);
        }
    } catch (error) {
        logger.error('Error fetching settings:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Update settings with validation
app.put('/api/settings', async (req, res) => {
    try {
        const settings = req.body;
        
        // Validate settings
        if (settings.updateInterval && (settings.updateInterval < 30 || settings.updateInterval > 3600)) {
            return res.status(400).json({ error: 'Update interval must be between 30 and 3600 seconds' });
        }

        await pool.query(
            'INSERT INTO MetricPlots (Metric, URL) VALUES (?, ?) ON DUPLICATE KEY UPDATE URL = ?',
            ['settings', JSON.stringify(settings), JSON.stringify(settings)]
        );
        
        // Broadcast settings update
        broadcast({ type: 'settings_updated', data: settings });
        
        res.json({ message: 'Settings updated successfully' });
    } catch (error) {
        logger.error('Error updating settings:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Update database settings with connection testing
app.put('/api/settings/db', async (req, res) => {
    try {
        const { dbHost, dbName, dbUser, dbPass } = req.body;
        
        // Validate required fields
        if (!dbHost || !dbName || !dbUser) {
            return res.status(400).json({ error: 'Missing required database fields' });
        }

        const newPool = mysql.createPool({
            host: dbHost,
            user: dbUser,
            password: dbPass,
            database: dbName,
            waitForConnections: true,
            connectionLimit: 10,
            queueLimit: 0
        });

        // Test the connection
        await newPool.query('SELECT 1');
        
        // Update the pool if connection successful
        await pool.end();
        Object.assign(pool, newPool);
        
        // Broadcast database settings update
        broadcast({ type: 'db_settings_updated', data: { dbHost, dbName, dbUser } });
        
        res.json({ message: 'Database settings updated successfully' });
    } catch (error) {
        logger.error('Error updating database settings:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Start server
server.listen(port, () => {
    logger.info(`Server running at http://localhost:${port}`);
}); 