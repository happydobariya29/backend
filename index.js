const express = require('express');
const mysql = require('mysql');
const bodyParser = require('body-parser');
const moment = require('moment-timezone');
require('dotenv').config();

const app = express();
const port = 3001;

// Middleware to parse JSON bodies
app.use(bodyParser.json());

app.get('/', (req, res) => {
    res.status(200).send('Welcome to the API!');
});

// MySQL connection configuration
const dbConfig = mysql.createConnection({
    host: process.env.MYSQL_HOST,
    user: process.env.MYSQL_USER,
    password: process.env.MYSQL_PASSWORD,
    database: process.env.MYSQL_DATABASE
});

//Api for userdetails
app.get('/userdetails', (req, res) => {
    const { contactNumber } = req.body;
    if (!contactNumber) {
        return res.status(400).json({ error: 'Please Enter contact number' ,status: "false"});
    }
    const query = 'SELECT * FROM adminportal.user WHERE contactNumber = ?';

    dbConfig.query(query, [contactNumber], (err, results) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }

        // Check if user exists
        if (results.length === 0) {
            return res.status(404).json({ error: 'User not found', status: "false" });
        }

        const user = results[0];

        // User authenticated successfully
        res.status(200).json({ message: 'User Details', status: "true", user: { userId: user.userId, firstName: user.firstName, lastName: user.lastName, contactNumber: user.contactNumber, email: user.email, age: user.age, education: user.education, address: user.address, countryId: user.countryId, stateId: user.stateId, cityId: user.cityId, createdDate: user.createdDate, updatedDate: user.updatedDate, otp: user.otp, userType: user.userType } });
    });
});

//Api for authentication
app.post('/authentication', (req, res) => {
    const { contactNumber } = req.body;

    if (!contactNumber) {
        return res.status(400).json({ error: 'Please enter a contact number', status: "false" });
    }

    const query = 'SELECT 1 FROM adminportal.user WHERE contactNumber = ? LIMIT 1';
    dbConfig.query(query, [contactNumber], (err, results) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }

        // Check if user exists
        if (results.length === 0) {
            return res.status(404).json({ error: 'User not found', status: "false" });
        }

        // User exists
        res.status(200).json({ message: 'Valid contact number', status: "true" });
    });
});

//Api for add user
app.post('/adduser', (req, res) => {
    const { firstName, lastName, contactNumber, email, age, education, address, countryId, stateId, cityId, userType } = req.body;

    // Validate inputs
    if (!firstName || !lastName || !contactNumber || !email || !age || !education || !address || !countryId || !stateId || !cityId || !userType) {
        return res.status(400).json({ error: 'All fields are required' });
    }

    // Get current timestamp in Indian Standard Time (IST)
    const createdDate = moment().tz('Asia/Kolkata').format('YYYY-MM-DD HH:mm:ss');

    // SQL query to insert a new user with createdDate
    const query = `
        INSERT INTO adminportal.user 
        (firstName, lastName, contactNumber, email, age, education, address, countryId, stateId, cityId, createdDate, userType) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    const values = [firstName, lastName, contactNumber, email, age, education, address, countryId, stateId, cityId, createdDate, userType];

    dbConfig.query(query, values, (err, results) => {
        if (err) {
            if (err.code === 'ER_DUP_ENTRY') {
                return res.status(400).json({ error: 'This contact number is already exists', status: "false" });
            }
            return res.status(500).json({ error: err.message });
        }

        // Successfully added new user
        res.status(201).json({ message: 'User added successfully', status:"true", userId: results.insertId });
    });
});


// Endpoint to update an existing user's details
app.put('/edituser/:userId', (req, res) => {
    const { userId } = req.params;
    const { firstName, lastName, contactNumber, email, age, education, address, countryId, stateId, cityId } = req.body;

    // Validate inputs
    if (!firstName || !lastName || !contactNumber || !email || !age || !education || !address || !countryId || !stateId || !cityId) {
        return res.status(400).json({ error: 'All fields are required', status: "false" });
    }

    // Format current timestamp for IST (Indian Standard Time)
    const indianDateTime = moment().tz('Asia/Kolkata').format('YYYY-MM-DD HH:mm:ss');

    // SQL query to update a user's details including updatedDate
    const updateQuery = `
        UPDATE adminportal.user
        SET firstName = ?, lastName = ?, contactNumber = ?, email = ?, age = ?, education = ?, address = ?, countryId = ?, stateId = ?, cityId = ?, updatedDate = ?
        WHERE userId = ?;
    `;
    const values = [firstName, lastName, contactNumber, email, age, education, address, countryId, stateId, cityId, indianDateTime, userId];

    dbConfig.query(updateQuery, values, (err, updateResults) => {
        if (err) {
            if (err.code === 'ER_DUP_ENTRY') {
                return res.status(400).json({ error: 'This contact number already exists', status: "false" });
            }
            return res.status(500).json({ error: err.message });
        }

        // Check if any row was affected
        if (updateResults.affectedRows === 0) {
            return res.status(404).json({ error: 'User not found', status: "false" });
        }

        // Fetch the updated user details
        const fetchQuery = 'SELECT * FROM adminportal.user WHERE userId = ?';
        dbConfig.query(fetchQuery, [userId], (err, fetchResults) => {
            if (err) {
                return res.status(500).json({ error: err.message });
            }

            if (fetchResults.length === 0) {
                return res.status(404).json({ error: 'User not found', status: "false" });
            }

            const updatedUser = fetchResults[0];

            // Successfully updated the user
            res.status(200).json({ message: 'User updated successfully', status: "true", user: updatedUser });
        });
    });
});



// Endpoint to soft delete a user
app.put('/deleteuser/:userId', (req, res) => {
    const { userId } = req.params;

    // SQL query to update the user's status to 2 (soft delete)
    const query = `
        UPDATE adminportal.user
        SET status = 2
        WHERE userId = ?;
    `;
    const values = [userId];

    dbConfig.query(query, values, (err, results) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }

        // Check if any row was affected
        if (results.affectedRows === 0) {
            return res.status(404).json({ error: 'User not found', status: "false" });
        }

        // Successfully soft deleted the user
        res.status(200).json({ message: 'User deleted successfully', status: "true" });
    });
});

//Api for change status
app.put('/toggleuserstatus/:userId', (req, res) => {
    const { userId } = req.params;

    // SQL query to fetch the current status of the user
    const selectQuery = 'SELECT status FROM user WHERE userId = ?';
    const updateQuery = 'UPDATE user SET status = ? WHERE userId = ?';

    dbConfig.query(selectQuery, [userId], (err, results) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }

        // Check if user exists
        if (results.length === 0) {
            return res.status(404).json({ error: 'User not found', status: "false" });
        }

        const currentStatus = results[0].status;
        const newStatus = currentStatus === 1 ? 0 : 1;

        // Update the status
        dbConfig.query(updateQuery, [newStatus, userId], (err, updateResults) => {
            if (err) {
                return res.status(500).json({ error: err.message });
            }

            // Successfully toggled the user status
            res.status(200).json({ message: 'User status updated successfully', status: "true" });
        });
    });
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


// API for adding an announcement
app.post('/addannouncement', (req, res) => {
    const { announcementTitle, announcementType, announcementDateTime, announcementDescription } = req.body;

    // Validate inputs
    if (!announcementTitle || !announcementType || !announcementDateTime || !announcementDescription) {
        return res.status(400).json({ error: 'All fields are required', status: "false" });
    }

    // Get current timestamp in Indian Standard Time (IST)
    const createdDate = moment().tz('Asia/Kolkata').format('YYYY-MM-DD HH:mm:ss');

    // SQL query to insert a new announcement with createdDate
    const query = `
        INSERT INTO announcements
        (announcementTitle, announcementType, announcementDateTime, announcementDescription, createdDate)
        VALUES (?, ?, ?, ?, ?)
    `;
    const values = [announcementTitle, announcementType, announcementDateTime, announcementDescription,createdDate];

    dbConfig.query(query, values, (err, results) => {
        if (err) {
            return res.status(500).json({ error: err.message, status: "false" });
        }

        // Successfully added new announcement
        res.status(201).json({ message: 'Announcement added successfully', status: "true", announcementId: results.insertId });
    });
});


// API for announcement details
app.get('/announcementdetails', (req, res) => {
    const { announcementId } = req.body;
    if (!announcementId) {
        return res.status(400).json({ error: 'Please enter announcement ID', status: "false" });
    }
    const query = 'SELECT * FROM announcements WHERE announcementId = ?';

    dbConfig.query(query, [announcementId], (err, results) => {
        if (err) {
            return res.status(500).json({ error: err.message, status: "false" });
        }

        // Check if announcement exists
        if (results.length === 0) {
            return res.status(404).json({ error: 'Announcement not found', status: "false" });
        }

        const announcement = results[0];

        // Announcement found successfully
        res.status(200).json({ 
            message: 'Announcement Details', 
            status: "true", 
            announcement: { 
                announcementId: announcement.announcementId, 
                announcementTitle: announcement.announcementTitle, 
                announcementType: announcement.announcementType, 
                announcementDateTime: announcement.announcementDateTime, 
                announcementDescription: announcement.announcementDescription, 
                status: announcement.status, 
                createdDate: announcement.createdDate,
                updatedDate: announcement.updatedDate
            } 
        });
    });
});

// Endpoint to update an existing announcement's details
app.put('/editannouncement/:announcementId', (req, res) => {
    const { announcementId } = req.params;
    const { announcementTitle, announcementType, announcementDateTime, announcementDescription} = req.body;

    // Validate inputs
    if (!announcementTitle || !announcementType || !announcementDateTime || !announcementDescription) {
        return res.status(400).json({ error: 'All fields are required', status: "false" });
    }

    // Format current timestamp for IST (Indian Standard Time)
    const indianDateTime = moment().tz('Asia/Kolkata').format('YYYY-MM-DD HH:mm:ss');

    // SQL query to update an announcement's details including updatedDate
    const updateQuery = `
        UPDATE announcements
        SET announcementTitle = ?, announcementType = ?, announcementDateTime = ?, announcementDescription = ?, updatedDate = ?
        WHERE announcementId = ?;
    `;
    const values = [announcementTitle, announcementType, announcementDateTime, announcementDescription, indianDateTime, announcementId];

    dbConfig.query(updateQuery, values, (err, updateResults) => {
        if (err) {
            if (err.code === 'ER_DUP_ENTRY') {
                return res.status(400).json({ error: 'An announcement with this title already exists', status: "false" });
            }
            return res.status(500).json({ error: err.message, status: "false" });
        }

        // Check if any row was affected
        if (updateResults.affectedRows === 0) {
            return res.status(404).json({ error: 'Announcement not found', status: "false" });
        }

        // Fetch the updated announcement details
        const fetchQuery = 'SELECT * FROM announcements WHERE announcementId = ?';
        dbConfig.query(fetchQuery, [announcementId], (err, fetchResults) => {
            if (err) {
                return res.status(500).json({ error: err.message, status: "false" });
            }

            if (fetchResults.length === 0) {
                return res.status(404).json({ error: 'Announcement not found', status: "false" });
            }

            const updatedAnnouncement = fetchResults[0];

            // Successfully updated the announcement
            res.status(200).json({ message: 'Announcement updated successfully', status: "true", announcement: updatedAnnouncement });
        });
    });
});


// Endpoint to soft delete an announcement
app.put('/deleteannouncement/:announcementId', (req, res) => {
    const { announcementId } = req.params;

    // SQL query to update the announcement's status to 2 (soft delete)
    const query = `
        UPDATE announcements
        SET status = 2
        WHERE announcementId = ?;
    `;
    const values = [announcementId];

    dbConfig.query(query, values, (err, results) => {
        if (err) {
            return res.status(500).json({ error: err.message, status: "false" });
        }

        // Check if any row was affected
        if (results.affectedRows === 0) {
            return res.status(404).json({ error: 'Announcement not found', status: "false" });
        }

        // Successfully soft deleted the announcement
        res.status(200).json({ message: 'Announcement deleted successfully', status: "true" });
    });
});


// API to toggle the status of an announcement
app.put('/toggleannouncementstatus/:announcementId', (req, res) => {
    const { announcementId } = req.params;

    // SQL query to fetch the current status of the announcement
    const selectQuery = 'SELECT status FROM announcements WHERE announcementId = ?';
    const updateQuery = 'UPDATE announcements SET status = ? WHERE announcementId = ?';

    dbConfig.query(selectQuery, [announcementId], (err, results) => {
        if (err) {
            return res.status(500).json({ error: err.message, status: "false" });
        }

        // Check if announcement exists
        if (results.length === 0) {
            return res.status(404).json({ error: 'Announcement not found', status: "false" });
        }

        const currentStatus = results[0].status;
        const newStatus = currentStatus === 1 ? 0 : 1;

        // Update the status
        dbConfig.query(updateQuery, [newStatus, announcementId], (err, updateResults) => {
            if (err) {
                return res.status(500).json({ error: err.message });
            }

            // Successfully toggled the announcement status
            res.status(200).json({ message: 'Announcement status updated successfully', status: "true" });
        });
    });
});

// Announcements list
app.get('/announcements', (req, res) => {
    // SQL query to fetch all announcements sorted by createdDate in descending order
    const selectQuery = 'SELECT * FROM announcements WHERE status != 2 ORDER BY createdDate DESC';

    dbConfig.query(selectQuery, (err, results) => {
        if (err) {
            return res.status(500).json({ error: err.message, status: "false" });
        }

        // Check if there are announcements
        if (results.length === 0) {
            return res.status(404).json({ error: 'No announcements found', status: "false" });
        }

        // Return the list of announcements
        res.status(200).json({ status: "true", announcements: results });
    });
});


// API for adding a magazine
app.post('/addmagazine', (req, res) => {
    const { title, description, magazine } = req.body;

    // Validate inputs
    if (!title || !description || !magazine) {
        return res.status(400).json({ error: 'All fields are required', status: "false" });
    }

    // Get current timestamp in Indian Standard Time (IST)
    const createdDate = moment().tz('Asia/Kolkata').format('YYYY-MM-DD HH:mm:ss');

    // SQL query to insert a new magazine with createdDate
    const query = `
        INSERT INTO magazine
        (title, description, magazine,createdDate)
        VALUES (?, ?, ?, ?)
    `;
    const values = [title, description, magazine, createdDate];

    dbConfig.query(query, values, (err, results) => {
        if (err) {
            return res.status(500).json({ error: err.message, status: "false" });
        }

        // Successfully added new magazine
        res.status(201).json({ message: 'Magazine added successfully', status: "true", magazineId: results.insertId });
    });
});

// Magazines list
app.get('/magazines', (req, res) => {
    // SQL query to fetch all magazines sorted by createdDate in descending order
    const selectQuery = 'SELECT * FROM magazine WHERE status != 2 ORDER BY createdDate DESC';

    dbConfig.query(selectQuery, (err, results) => {
        if (err) {
            return res.status(500).json({ error: err.message, status: "false" });
        }

        // Check if there are magazines
        if (results.length === 0) {
            return res.status(404).json({ error: 'No magazines found', status: "false" });
        }

        // Return the list of magazines
        res.status(200).json({ status: "true", magazines: results });
    });
});

// API to toggle the status of a magazine
app.put('/togglemagazinestatus/:magazineId', (req, res) => {
    const { magazineId } = req.params;

    // SQL query to fetch the current status of the magazine
    const selectQuery = 'SELECT status FROM magazine WHERE magazineId = ?';
    const updateQuery = 'UPDATE magazine SET status = ? WHERE magazineId = ?';

    dbConfig.query(selectQuery, [magazineId], (err, results) => {
        if (err) {
            return res.status(500).json({ error: err.message, status: "false" });
        }

        // Check if magazine exists
        if (results.length === 0) {
            return res.status(404).json({ error: 'Magazine not found', status: "false" });
        }

        const currentStatus = results[0].status;
        const newStatus = currentStatus === 1 ? 0 : 1;

        // Update the status
        dbConfig.query(updateQuery, [newStatus, magazineId], (err, updateResults) => {
            if (err) {
                return res.status(500).json({ error: err.message });
            }

            // Successfully toggled the magazine status
            res.status(200).json({ message: 'Magazine status updated successfully', status: "true" });
        });
    });
});

// Endpoint to soft delete a magazine
app.put('/deletemagazine/:magazineId', (req, res) => {
    const { magazineId } = req.params;

    // SQL query to update the magazine's status to 2 (soft delete)
    const query = `
        UPDATE magazine
        SET status = 2
        WHERE magazineId = ?;
    `;
    const values = [magazineId];

    dbConfig.query(query, values, (err, results) => {
        if (err) {
            return res.status(500).json({ error: err.message, status: "false" });
        }

        // Check if any row was affected
        if (results.affectedRows === 0) {
            return res.status(404).json({ error: 'Magazine not found', status: "false" });
        }

        // Successfully soft deleted the magazine
        res.status(200).json({ message: 'Magazine deleted successfully', status: "true" });
    });
});

// Endpoint to update an existing magazine's details
app.put('/editmagazine/:magazineId', (req, res) => {
    const { magazineId } = req.params;
    const { title, description, magazine } = req.body;

    // Validate inputs
    if (!title || !description || !magazine ) {
        return res.status(400).json({ error: 'All fields are required', status: "false" });
    }

    // Format current timestamp for IST (Indian Standard Time)
    const indianDateTime = moment().tz('Asia/Kolkata').format('YYYY-MM-DD HH:mm:ss');

    // SQL query to update a magazine's details including updatedDate
    const updateQuery = `
        UPDATE magazine
        SET title = ?, description = ?, magazine = ?, updatedDate = ?
        WHERE magazineId = ?;
    `;
    const values = [title, description, magazine, indianDateTime, magazineId];

    dbConfig.query(updateQuery, values, (err, updateResults) => {
        if (err) {
            if (err.code === 'ER_DUP_ENTRY') {
                return res.status(400).json({ error: 'A magazine with this title already exists', status: "false" });
            }
            return res.status(500).json({ error: err.message, status: "false" });
        }

        // Check if any row was affected
        if (updateResults.affectedRows === 0) {
            return res.status(404).json({ error: 'Magazine not found', status: "false" });
        }

        // Fetch the updated magazine details
        const fetchQuery = 'SELECT * FROM magazine WHERE magazineId = ?';
        dbConfig.query(fetchQuery, [magazineId], (err, fetchResults) => {
            if (err) {
                return res.status(500).json({ error: err.message, status: "false" });
            }

            if (fetchResults.length === 0) {
                return res.status(404).json({ error: 'Magazine not found', status: "false" });
            }

            const updatedMagazine = fetchResults[0];

            // Successfully updated the magazine
            res.status(200).json({ message: 'Magazine updated successfully', status: "true", magazine: updatedMagazine });
        });
    });
});

// API for magazine details
app.get('/magazinedetails', (req, res) => {
    const { magazineId } = req.body;
    if (!magazineId) {
        return res.status(400).json({ error: 'Please enter magazine ID', status: "false" });
    }
    const query = 'SELECT * FROM magazine WHERE magazineId = ?';

    dbConfig.query(query, [magazineId], (err, results) => {
        if (err) {
            return res.status(500).json({ error: err.message, status: "false" });
        }

        // Check if magazine exists
        if (results.length === 0) {
            return res.status(404).json({ error: 'Magazine not found', status: "false" });
        }

        const magazine = results[0];

        // Magazine found successfully
        res.status(200).json({ 
            message: 'Magazine Details', 
            status: "true", 
            magazine: { 
                magazineId: magazine.magazineId, 
                title: magazine.title, 
                description: magazine.description, 
                magazine: magazine.magazine, 
                status: magazine.status, 
                createdDate: magazine.createdDate,
                updatedDate: magazine.updatedDate
            } 
        });
    });
});


// API for adding an ad
app.post('/addads', (req, res) => {
    const { title, type } = req.body;

    // Validate inputs
    if (!title || !type) {
        return res.status(400).json({ error: 'All fields are required', status: "false" });
    }

    // Get current timestamp in Indian Standard Time (IST)
    const createdDate = moment().tz('Asia/Kolkata').format('YYYY-MM-DD HH:mm:ss');
    const updatedDate = createdDate; // Initialize updatedDate with the same value as createdDate

    // SQL query to insert a new ad with createdDate and updatedDate
    const query = `
        INSERT INTO ads
        (title, type, createdDate, updatedDate)
        VALUES (?, ?, ?, ?)
    `;
    const values = [title, type, createdDate, updatedDate];

    dbConfig.query(query, values, (err, results) => {
        if (err) {
            return res.status(500).json({ error: err.message, status: "false" });
        }

        // Successfully added new ad
        res.status(201).json({ message: 'Ad added successfully', status: "true", adsId: results.insertId });
    });
});

// API for ad details
app.get('/adsdetails', (req, res) => {
    const { adsId } = req.body;
    if (!adsId) {
        return res.status(400).json({ error: 'Please enter ad ID', status: "false" });
    }
    const query = 'SELECT * FROM ads WHERE adsId = ?';

    dbConfig.query(query, [adsId], (err, results) => {
        if (err) {
            return res.status(500).json({ error: err.message, status: "false" });
        }

        // Check if ad exists
        if (results.length === 0) {
            return res.status(404).json({ error: 'Ad not found', status: "false" });
        }

        const ad = results[0];

        // Ad found successfully
        res.status(200).json({ 
            message: 'Ad Details', 
            status: "true", 
            ad: { 
                adsId: ad.adsId, 
                title: ad.title, 
                type: ad.type, 
                status: ad.status, 
                createdDate: ad.createdDate,
                updatedDate: ad.updatedDate
            } 
        });
    });
});

// Endpoint to update an existing ad's details
app.put('/editads/:adsId', (req, res) => {
    const { adsId } = req.params;
    const { title, type } = req.body;

    // Validate inputs
    if (!title || !type) {
        return res.status(400).json({ error: 'All fields are required', status: "false" });
    }

    // Format current timestamp for IST (Indian Standard Time)
    const indianDateTime = moment().tz('Asia/Kolkata').format('YYYY-MM-DD HH:mm:ss');

    // SQL query to update an ad's details including updatedDate
    const updateQuery = `
        UPDATE ads
        SET title = ?, type = ?, updatedDate = ?
        WHERE adsId = ?;
    `;
    const values = [title, type, indianDateTime, adsId];

    dbConfig.query(updateQuery, values, (err, updateResults) => {
        if (err) {
            if (err.code === 'ER_DUP_ENTRY') {
                return res.status(400).json({ error: 'An ad with this title already exists', status: "false" });
            }
            return res.status(500).json({ error: err.message, status: "false" });
        }

        // Check if any row was affected
        if (updateResults.affectedRows === 0) {
            return res.status(404).json({ error: 'Ad not found', status: "false" });
        }

        // Fetch the updated ad details
        const fetchQuery = 'SELECT * FROM ads WHERE adsId = ?';
        dbConfig.query(fetchQuery, [adsId], (err, fetchResults) => {
            if (err) {
                return res.status(500).json({ error: err.message, status: "false" });
            }

            if (fetchResults.length === 0) {
                return res.status(404).json({ error: 'Ad not found', status: "false" });
            }

            const updatedAd = fetchResults[0];

            // Successfully updated the ad
            res.status(200).json({ message: 'Ad updated successfully', status: "true", ad: updatedAd });
        });
    });
});

// Endpoint to soft delete an advertisement
app.put('/deletead/:adsId', (req, res) => {
    const { adsId } = req.params;

    // SQL query to update the advertisement's status to 2 (soft delete)
    const query = `
        UPDATE ads
        SET status = 2
        WHERE adsId = ?;
    `;
    const values = [adsId];

    dbConfig.query(query, values, (err, results) => {
        if (err) {
            return res.status(500).json({ error: err.message, status: "false" });
        }

        // Check if any row was affected
        if (results.affectedRows === 0) {
            return res.status(404).json({ error: 'Advertisement not found', status: "false" });
        }

        // Successfully soft deleted the advertisement
        res.status(200).json({ message: 'Advertisement deleted successfully', status: "true" });
    });
});

// API to toggle the status of an advertisement
app.put('/toggleadstatus/:adsId', (req, res) => {
    const { adsId } = req.params;

    // SQL query to fetch the current status of the advertisement
    const selectQuery = 'SELECT status FROM ads WHERE adsId = ?';
    const updateQuery = 'UPDATE ads SET status = ? WHERE adsId = ?';

    dbConfig.query(selectQuery, [adsId], (err, results) => {
        if (err) {
            return res.status(500).json({ error: err.message, status: "false" });
        }

        // Check if advertisement exists
        if (results.length === 0) {
            return res.status(404).json({ error: 'Advertisement not found', status: "false" });
        }

        const currentStatus = results[0].status;
        const newStatus = currentStatus === 1 ? 0 : 1;

        // Update the status
        dbConfig.query(updateQuery, [newStatus, adsId], (err, updateResults) => {
            if (err) {
                return res.status(500).json({ error: err.message, status: "false" });
            }

            // Successfully toggled the advertisement status
            res.status(200).json({ message: 'Advertisement status updated successfully', status: "true" });
        });
    });
});

// Ads list
app.get('/ads', (req, res) => {
    // SQL query to fetch all ads sorted by createdDate in descending order
    const selectQuery = 'SELECT * FROM ads WHERE status != 2 ORDER BY createdDate DESC';

    dbConfig.query(selectQuery, (err, results) => {
        if (err) {
            return res.status(500).json({ error: err.message, status: "false" });
        }

        // Check if there are ads
        if (results.length === 0) {
            return res.status(404).json({ error: 'No advertisements found', status: "false" });
        }

        // Return the list of advertisements
        res.status(200).json({ status: "true", advertisements: results });
    });
});


app.listen(port, () => {
    console.log(`Server running on http://localhost:${port}`);
});