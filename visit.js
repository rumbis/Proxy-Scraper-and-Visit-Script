const https = require('https');
const fs = require('fs');
const tunnel = require('tunnel');

// Read proxies from a text file
const proxiesFile = 'proxies.txt';
const proxies = fs.readFileSync(proxiesFile, 'utf-8').split('\n').filter(proxy => proxy.trim() !== '');

// List of user agents
const userAgents = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:89.0) Gecko/20100101 Firefox/89.0',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 11_4_0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
];

// Read websites from a text file
const websitesFile = 'websitevisit.txt';
const websites = fs.readFileSync(websitesFile, 'utf-8').split('\n').filter(website => website.trim() !== '');

// Function to select a random item from an array
function getRandomItem(array) {
  return array[Math.floor(Math.random() * array.length)];
}

// Function to visit a website with a random proxy, user agent, and referrer
function visitWebsite(url) {
  const randomProxy = getRandomItem(proxies);
  const [proxyHost, proxyPort, username, password] = randomProxy.split(':');
  const randomUserAgent = getRandomItem(userAgents);
  const randomReferrer = getRandomReferrer();

  const agent = tunnel.httpsOverHttp({
    proxy: {
      host: proxyHost,
      port: proxyPort,
      proxyAuth: `${username}:${password}`
    }
  });

  const options = {
    host: url, // Update this line to include the hostname only
    path: '/',
    method: 'GET',
    headers: {
      'User-Agent': randomUserAgent,
      'Referer': randomReferrer
    },
    agent: agent
  };

  const req = https.request(options, (res) => {
    console.log(`Visited ${url} ref ${randomReferrer} ${proxyHost}:${proxyPort} ${getShortUserAgent(randomUserAgent)} `);

  });

  req.on('error', (error) => {
    console.error(`An error occurred while visiting ${url}:`, error);
  });

  req.end();
}

// Function to generate a random delay between visits
function getRandomDelay() {
  return Math.floor(Math.random() * 5000) + 1000; // Random delay between 1 and 6 seconds
}

// Function to generate a random visit count between minCount and maxCount
function getRandomVisitCount(minCount, maxCount) {
  return Math.floor(Math.random() * (maxCount - minCount + 1)) + minCount;
}

// Function to generate a random referrer from search engines or social media platforms
function getRandomReferrer() {
  const searchEngines = [
    'https://www.google.com/',
    'https://www.bing.com/',
    'https://www.yahoo.com/',
    'https://duckduckgo.com/'
  ];

  const socialMediaPlatforms = [
    'https://www.facebook.com/',
    'https://www.twitter.com/',
    'https://www.instagram.com/',
    'https://www.linkedin.com/'
  ];

  const referrers = [...searchEngines, ...socialMediaPlatforms];
  return getRandomItem(referrers);
}

// Function to get a short version of the user agent OS
function getShortUserAgent(userAgent) {
  if (userAgent.includes('Windows NT')) {
    return 'Windows';
  } else if (userAgent.includes('Macintosh; Intel Mac OS X')) {
    return 'Mac';
  } else {
    return 'Other';
  }
}

// Loop for visiting multiple websites with random visits
websites.forEach(async (website) => {
  const minVisitCount = 3;
  const maxVisitCount = 5;
  const visitCount = getRandomVisitCount(minVisitCount, maxVisitCount);
  for (let i = 0; i < visitCount; i++) {
    visitWebsite(website);
    await delay(getRandomDelay());
  }
});

// Function to delay execution using Promises
function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
