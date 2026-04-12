const { Parser } = require('json2csv');

const responseFormatter = (req, res, next) => {
    //custom formatting of data
    res.sendData = (data) => {
        const format = req.query.format || 'json';
        //if i have chosen  csv and return object is array of objects
        if (format === 'csv' && Array.isArray(data)) {
            try {
                const json2csvParser = new Parser({delimiter: ','});
                const csv = json2csvParser.parse(data);

                res.setHeader('Content-Disposition', 'inline; filename="data.csv"');
                res.setHeader('Content-Type', 'text/plain; charset=utf-8');

		        return res.send(csv);
            
            } catch (err) {
                // If CSV conversion fails call error hanydler
                return next(err);
            }
        }

        // json default answer
        res.header('Content-Type', 'application/json');
        return res.json(data);
    };
    next();
};

module.exports = responseFormatter;
