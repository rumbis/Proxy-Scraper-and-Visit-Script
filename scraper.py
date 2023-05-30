import requests
from bs4 import BeautifulSoup
import concurrent.futures

websites_file = 'proxy_websites.txt'
with open(websites_file, 'r') as file:
    proxy_websites = file.read().splitlines()
concurrency = 10
test_url = 'https://www.google.com'  # Replace with a URL to make a test request

def verify_proxy(proxy):
    ip = proxy['ip']
    port = proxy['port']

    try:
        response = requests.get(test_url, proxies={'http': f'{ip}:{port}', 'https': f'{ip}:{port}'}, timeout=3)

        if response.status_code == 200:
            return True  # Proxy is valid

    except requests.exceptions.RequestException:
        pass  # Ignore error and continue to next proxy

    return False  # Proxy is invalid

def scrape_proxies(url):
    try:
        response = requests.get(url)
        response.raise_for_status()  # Raise an exception for non-2xx status codes
        soup = BeautifulSoup(response.text, 'html.parser')
        proxy_tags = soup.select('table tr')

        proxies = []
        for tag in proxy_tags:
            ip_address = tag.select_one('td:nth-child(1)')
            port = tag.select_one('td:nth-child(2)')

            if ip_address and port:
                ip = ip_address.get_text()
                port = port.get_text()
                proxy = {'ip': ip, 'port': port}
                proxies.append(proxy)

        return proxies

    except requests.RequestException as e:
        print(f"An error occurred while scraping proxies from {url}: {str(e)}")
        return []

def verify_proxies_concurrently(proxies):
    verified_proxies = []

    with concurrent.futures.ThreadPoolExecutor(max_workers=concurrency) as executor:
        results = executor.map(verify_proxy, proxies)

        for proxy, is_valid in zip(proxies, results):
            if is_valid:
                verified_proxies.append(proxy)

    return verified_proxies

def scrape_and_verify_proxies(proxy_websites):
    all_proxies = []

    for url in proxy_websites:
        try:
            proxies = scrape_proxies(url)
            all_proxies.extend(proxies)
        except Exception as e:
            print(f"An error occurred while scraping proxies from {url}: {str(e)}")

    proxy_chunks = [all_proxies[i:i+concurrency] for i in range(0, len(all_proxies), concurrency)]

    verified_proxies = []

    with concurrent.futures.ThreadPoolExecutor() as executor:
        results = executor.map(verify_proxies_concurrently, proxy_chunks)

        for chunk in results:
            verified_proxies.extend(chunk)

    return verified_proxies

def export_proxies_to_txt(proxies, filename):
    with open(filename, 'w') as file:
        for proxy in proxies:
            file.write(f"{proxy['ip']}:{proxy['port']}\n")

    print('Proxies exported successfully!')

def run_proxy_scraper():
    try:
        scraped_proxies = scrape_and_verify_proxies(proxy_websites)
        export_proxies_to_txt(scraped_proxies, 'proxies.txt')
        print('Proxies exported successfully!')
    except Exception as e:
        print('An error occurred:', str(e))

if __name__ == '__main__':
    run_proxy_scraper()
