//cast parameter to requested type
const castType = (x, type) =>
{
	switch(type)
	{
		case "number":
			return Number(x);
		default:
			return null;
	}
}

const extractTimestamp = (str) => 
{
	//extract the first timestamp from a text
	//if no timestamps occur, return null
  	const matches = str.match(/\b\d{4}-\d{2}-\d{2} \d{2}:\d{2}\b/g);
  	return matches ? matches[0] : null;
}

module.exports = { castType, extractTimestamp };
