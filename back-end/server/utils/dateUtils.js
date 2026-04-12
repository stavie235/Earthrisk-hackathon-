// format timestamp
const formatTimestamp = (dateInput) => {
    if (!dateInput) return null;
    
    const d = new Date(dateInput);
    // Safety check: is it a valid date?
    if (isNaN(d.getTime())) return null;

    const year = d.getFullYear();
    // Month is 0-indexed (Jan=0), so we add 1. PadStart adds a leading '0' if needed.
    const month = String(d.getMonth() + 1).padStart(2, '0'); 
    const day = String(d.getDate()).padStart(2, '0');
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');

    return `${year}-${month}-${day} ${hours}:${minutes}`;
};

// turn date into YYYYMMDD
const formatToYYYYMMDD = (dateInput) => {
    if (!dateInput) return null;
    
    const d = new Date(dateInput);
    if (isNaN(d.getTime())) return null;

    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');

    return `${year}${month}${day}`;
};

//read URL date parameters in a format mySQL can understand

const parseUrlDate = (dateString) => {
    // Regex to check if strictly 8 digits
    if (!dateString || !/^\d{8}$/.test(dateString)) {
        return null;
    }

    const year = dateString.substring(0, 4);
    const month = dateString.substring(4, 6);
    const day = dateString.substring(6, 8);

    // Basic validity check (months 1-12, days 1-31)
    if (month < 1 || month > 12 || day < 1 || day > 31) {
        return null;
    }

    return `${year}-${month}-${day}`;
};

module.exports = { formatTimestamp, formatToYYYYMMDD, parseUrlDate };
