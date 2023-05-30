const fs = require('fs');
const axios = require('axios');
const cheerio = require('cheerio');
const { Worker, isMainThread, parentPort, workerData } = require('worker_threads');

const websitesFile = 'proxy_websites.txt';
const proxyWebsites = fs.readFileSync(websitesFile, 'utf-8').split('\n');
const concurrency = 10;
const testUrl = 'https://www.google.com'; // Replace with a URL to make a test request

async function verifyProxy(proxy) {
  const { ip, port } = proxy;

  try {
    const response = await axios.get(testUrl, {
      proxy: {
        host: ip,
        port: port
      },
      timeout: 3000 // Set an appropriate timeout value
    });

    if (response.status === 200) {
      return true; // Proxy is valid
    }
  } catch (error) {
    // Ignore error and continue to next proxy
  }

  return false; // Proxy is invalid
}

async function scrapeProxies(url) {
  try {
    const response = await axios.get(url);
    const proxies = [];

    // Use cheerio to parse the HTML and extract proxy information
    const $ = cheerio.load(response.data);
    $('table tr').each((index, element) => {
      const ipAddress = $(element).find('td:nth-child(1)').text();
      const port = $(element).find('td:nth-child(2)').text();
      const proxy = { ip: ipAddress, port: port };
      proxies.push(proxy);
    });

    return proxies;
  } catch (error) {
    console.error('An error occurred while scraping proxies:', error);
    return []; // Return an empty array if an error occurs during scraping
  }
}

async function verifyProxiesConcurrently(proxies) {
  const verifiedProxies = [];

  for (const proxy of proxies) {
    const isValid = await verifyProxy(proxy);
    if (isValid) {
      verifiedProxies.push(proxy);
    }
  }

  return verifiedProxies;
}

async function scrapeAndVerifyProxies(proxyWebsites) {
  const allProxies = [];

  for (const url of proxyWebsites) {
    const proxies = await scrapeProxies(url);
    allProxies.push(...proxies);
  }

  const proxyChunks = [];
  for (let i = 0; i < allProxies.length; i += concurrency) {
    proxyChunks.push(allProxies.slice(i, i + concurrency));
  }

  const verifiedProxies = [];

  for (const chunk of proxyChunks) {
    const verifiedChunk = await verifyProxiesConcurrently(chunk);
    verifiedProxies.push(...verifiedChunk);
  }

  return verifiedProxies;
}

function exportProxiesToTxt(proxies, filename) {
  const writeStream = fs.createWriteStream(filename);

  for (const proxy of proxies) {
    writeStream.write(`${proxy.ip}:${proxy.port}\n`);
  }

  writeStream.end();
}

async function runProxyScraper() {
  try {
    const scrapedProxies = await scrapeAndVerifyProxies(proxyWebsites);
    exportProxiesToTxt(scrapedProxies, 'proxies.txt');
    console.log('Proxies exported successfully!');
  } catch (error) {
    console.error('An error occurred:', error);
  }
}

if (isMainThread) {
  runProxyScraper();
} else {
  const proxies = workerData.proxies;
  const testUrl = workerData.testUrl;

  async function verifyProxiesInWorker(proxies) {
    const verifiedProxies = [];

    for (const proxy of proxies) {
      const isValid = await verifyProxy(proxy);
      if (isValid) {
        verifiedProxies.push(proxy);
      }
    }

    parentPort.postMessage(verifiedProxies);
  }

  verifyProxiesInWorker(proxies);
}
