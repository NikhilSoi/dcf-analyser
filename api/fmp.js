export default async function handler(req, res) {
  const { path, ...params } = req.query;
  const query = new URLSearchParams({
    ...params,
    apikey: "Ej79htMdNaKHnInR1Rc1Imk7O1ublSCB"
  }).toString();
  const url = `https://financialmodelingprep.com${path}?${query}`;
  const response = await fetch(url);
  const data = await response.json();
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.json(data);
}
