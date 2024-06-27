const express = require('express');
const mysql = require('mysql');
const bodyParser = require('body-parser');
const moment = require('moment-timezone');
require('dotenv').config();
require('./events');
const app = express();

// Middleware to parse JSON bodies
app.use(bodyParser.json());

// MySQL connection configuration
const dbConfig = mysql.createConnection({
    host: process.env.MYSQL_HOST,
    user: process.env.MYSQL_USER,
    password: process.env.MYSQL_PASSWORD,
    database: process.env.MYSQL_DATABASE
});

//Api for events details
app.get('/eventdetails', (req, res) => {
    const { eventId } = req.body;
    if (!eventId) {
        return res.status(400).json({ error: 'Please enter event ID', status: "false" });
    }
    const query = 'SELECT * FROM adminportal.events WHERE eventId = ?';

    dbConfig.query(query, [eventId], (err, results) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }

        // Check if event exists
        if (results.length === 0) {
            return res.status(404).json({ error: 'Event not found', status: "false" });
        }

        const event = results[0];

        // Event found successfully
        res.status(200).json({ 
            message: 'Event Details', 
            status: "true", 
            event: { 
                eventId: event.eventId, 
                name: event.name, 
                type: event.type, 
                dateTime: event.dateTime, 
                description: event.description, 
                status: event.status, 
                createdTime: event.createdTime, 
                updatedTime: event.updatedTime 
            } 
        });
    });
});

// API for adding an event
app.post('/addevent', (req, res) => {
    const { name, type, dateTime, description, status } = req.body;

    // Validate inputs
    if (!name || !type || !dateTime || !description || !status) {
        return res.status(400).json({ error: 'All fields are required', status: "false" });
    }

    // Get current timestamp in Indian Standard Time (IST)
    const createdDate = moment().tz('Asia/Kolkata').format('YYYY-MM-DD HH:mm:ss');

    // SQL query to insert a new event with createdTime
    const query = `
        INSERT INTO adminportal.events
        (name, type, dateTime, description, status, createdDate)
        VALUES (?, ?, ?, ?, ?, ?)
    `;
    const values = [name, type, dateTime, description, status, createdDate];

    dbConfig.query(query, values, (err, results) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }

        // Successfully added new event
        res.status(201).json({ message: 'Event added successfully', status:"true", eventId: results.insertId });
    });
});

// Endpoint to update an existing event's details
app.put('/editevent/:eventId', (req, res) => {
    const { eventId } = req.params;
    const { name, type, dateTime, description, status } = req.body;

    // Validate inputs
    if (!name || !type || !dateTime || !description || !status) {
        return res.status(400).json({ error: 'All fields are required', status: "false" });
    }

    // Format current timestamp for IST (Indian Standard Time)
    const indianDateTime = moment().tz('Asia/Kolkata').format('YYYY-MM-DD HH:mm:ss');

    // SQL query to update an event's details including updatedTime
    const updateQuery = `
        UPDATE adminportal.events
        SET name = ?, type = ?, dateTime = ?, description = ?, status = ?, updatedDate = ?
        WHERE eventId = ?;
    `;
    const values = [name, type, dateTime, description, status, indianDateTime, eventId];

    dbConfig.query(updateQuery, values, (err, updateResults) => {
        if (err) {
            if (err.code === 'ER_DUP_ENTRY') {
                return res.status(400).json({ error: 'An event with this name already exists', status: "false" });
            }
            return res.status(500).json({ error: err.message });
        }

        // Check if any row was affected
        if (updateResults.affectedRows === 0) {
            return res.status(404).json({ error: 'Event not found', status: "false" });
        }

        // Fetch the updated event details
        const fetchQuery = 'SELECT * FROM adminportal.events WHERE eventId = ?';
        dbConfig.query(fetchQuery, [eventId], (err, fetchResults) => {
            if (err) {
                return res.status(500).json({ error: err.message });
            }

            if (fetchResults.length === 0) {
                return res.status(404).json({ error: 'Event not found', status: "false" });
            }

            const updatedEvent = fetchResults[0];

            // Successfully updated the event
            res.status(200).json({ message: 'Event updated successfully', status: "true", event: updatedEvent });
        });
    });
});

// Endpoint to soft delete an event
app.put('/deleteevent/:eventId', (req, res) => {
    const { eventId } = req.params;

    // SQL query to update the event's status to 2 (soft delete)
    const query = `
        UPDATE adminportal.events
        SET status = 2
        WHERE eventId = ?;
    `;
    const values = [eventId];

    dbConfig.query(query, values, (err, results) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }

        // Check if any row was affected
        if (results.affectedRows === 0) {
            return res.status(404).json({ error: 'Event not found', status: "false" });
        }

        // Successfully soft deleted the event
        res.status(200).json({ message: 'Event deleted successfully', status: "true" });
    });
});

//Api for change status
app.put('/toggleeventstatus/:eventId', (req, res) => {
    const { eventId } = req.params;

    // SQL query to fetch the current status of the event
    const selectQuery = 'SELECT status FROM events WHERE eventId = ?';
    const updateQuery = 'UPDATE events SET status = ? WHERE eventId = ?';

    dbConfig.query(selectQuery, [eventId], (err, results) => {
        if (err) {
            return res.status(500).json({ error: err.message, status: "false" });
        }

        // Check if event exists
        if (results.length === 0) {
            return res.status(404).json({ error: 'Event not found', status: "false" });
        }

        const currentStatus = results[0].status;
        const newStatus = currentStatus === 1 ? 0 : 1;

        // Update the status
        dbConfig.query(updateQuery, [newStatus, eventId], (err, updateResults) => {
            if (err) {
                return res.status(500).json({ error: err.message });
            }

            // Successfully toggled the event status
            res.status(200).json({ message: 'Event status updated successfully', status: "true" });
        });
    });
});

//Events list
app.get('/events', (req, res) => {
    // SQL query to fetch all events sorted by createdDate in descending order
    const selectQuery = 'SELECT * FROM events WHERE status != 2 ORDER BY createdDate DESC';

    dbConfig.query(selectQuery, (err, results) => {
        if (err) {
            return res.status(500).json({ error: err.message, status: "false" });
        }

        // Check if there are events
        if (results.length === 0) {
            return res.status(404).json({ error: 'No events found', status: "false" });
        }

        // Return the list of events
        res.status(200).json({status:"true", events: results });
    });
});
