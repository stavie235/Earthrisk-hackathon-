//check type of parameter
const validateType = (x, type) =>
{
	switch(type)
	{
		// catches null or undefined
		case "null": 
			return x == null;

		// check for integers. doesnt cast floats!
		// accepts strings with integers
		case "integer":
			//Number("") = 0 !
			if (x === "") return false;
			return Number.isInteger(Number(x));

		case "number":
			if (x === "") return false;
			const tempnum = Number(x);
			return (typeof tempnum === "number") && (!Number.isNaN(tempnum));

		//wrong type
		default:
			return typeof x === type;
	}
}

// Validate a timestamp
const validateTimestamp = (ts) =>
{
 	const isoString = ts.replace(" ", "T");
  	const date = new Date(ts);
  	if (isNaN(date.getTime())) return false;
	else return true;
}

module.exports = { validateType, validateTimestamp };
