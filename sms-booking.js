const { v4: uuidv4 } = require('uuid'); // Make sure uuid is installed: npm install uuid

// Parse SMS commands for booking
function parseSMSCommand(smsText) {
    const parts = smsText.trim().split(/\s+/);
    if (parts.length < 3) return null;

    const command = parts[0].toUpperCase();
    if (command === 'BOOK' && parts.length >= 4) {
        return {
            type: 'machinery',
            item: parts[1].toLowerCase(),
            date: parts[2],
            location: parts[3]
        };
    }
    if (command === 'LABOR' && parts.length >= 4) {
        return {
            type: 'labour',
            skill: parts[1].toLowerCase(),
            quantity: parseInt(parts[2]),
            date: parts[3]
        };
    }
    return null;
}

function handleSMSBooking(smsText, phoneNumber) {
    const parsed = parseSMSCommand(smsText);
    if (!parsed) {
        return { success: false, message: 'Invalid SMS format. Please check the SMS guide.' };
    }

    const bookingId = 'SMS' + uuidv4().slice(0, 8);
    let message = '';
    if (parsed.type === 'machinery') {
        message = `✅ Booking confirmed! ${parsed.item.charAt(0).toUpperCase() + parsed.item.slice(1)} booked for ${parsed.date} at ${parsed.location}. Booking ID: ${bookingId}`;
    } else if (parsed.type === 'labour') {
        message = `✅ ${parsed.quantity} labourers for ${parsed.skill} booked for ${parsed.date}. Booking ID: ${bookingId}`;
    }

    // Optionally, save booking to DB/localStorage here

    return { success: true, message, bookingId };
}

module.exports = { handleSMSBooking };
