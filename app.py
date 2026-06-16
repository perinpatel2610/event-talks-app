import os
import json
import urllib.request
import xml.etree.ElementTree as ET
from datetime import datetime
from flask import Flask, render_template, jsonify, request
from bs4 import BeautifulSoup

app = Flask(__name__)

CACHE_FILE = os.path.join(os.path.dirname(__file__), 'notes_cache.json')
CACHE_EXPIRY_SECONDS = 3600  # Cache for 1 hour by default

def fetch_and_parse_feed():
    """Fetches the Google BigQuery release notes Atom feed and parses it."""
    url = "https://docs.cloud.google.com/feeds/bigquery-release-notes.xml"
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
    }
    
    req = urllib.request.Request(url, headers=headers)
    with urllib.request.urlopen(req) as response:
        xml_data = response.read()
        
    root = ET.fromstring(xml_data)
    ns = {'atom': 'http://www.w3.org/2005/Atom'}
    
    parsed_notes = []
    
    for entry in root.findall('atom:entry', ns):
        title = entry.find('atom:title', ns).text  # Usually the date, e.g., "June 15, 2026"
        entry_id = entry.find('atom:id', ns).text
        updated = entry.find('atom:updated', ns).text  # ISO timestamp
        
        link_elem = entry.find("atom:link[@rel='alternate']", ns)
        link = link_elem.attrib['href'] if link_elem is not None else "https://cloud.google.com/bigquery/docs/release-notes"
        
        content_elem = entry.find('atom:content', ns)
        content_html = content_elem.text if content_elem is not None else ""
        
        # Parse the HTML content and split it by h3 headers (which specify categories)
        soup = BeautifulSoup(content_html, 'html.parser')
        
        current_category = "General"
        current_content = []
        items = []
        
        # We loop through elements inside content HTML to extract separate entries by <h3> category headings
        for child in soup.contents:
            if child.name == 'h3':
                if current_content:
                    items.append({
                        'category': current_category,
                        'description': "".join(str(c) for c in current_content).strip()
                    })
                    current_content = []
                current_category = child.get_text().strip()
            elif child.name in ['p', 'ul', 'ol', 'div', 'pre', 'code', 'table']:
                current_content.append(child)
            elif child.name is None:  # Text node
                text = str(child).strip()
                if text:
                    # Wrap loose text in a paragraph tag
                    p_tag = soup.new_tag("p")
                    p_tag.string = text
                    current_content.append(p_tag)
                    
        # Append the final item if content exists
        if current_content:
            items.append({
                'category': current_category,
                'description': "".join(str(c) for c in current_content).strip()
            })
            
        # If no items were parsed but content_html is not empty, save it as General
        if not items and content_html.strip():
            items.append({
                'category': 'General',
                'description': content_html.strip()
            })
            
        # Add to the main parsed list
        for idx, item in enumerate(items):
            item_id = f"{entry_id}_{idx}"
            
            # Clean HTML description to open all links in a new tab
            desc_soup = BeautifulSoup(item['description'], 'html.parser')
            for a_tag in desc_soup.find_all('a'):
                a_tag['target'] = '_blank'
                a_tag['rel'] = 'noopener noreferrer'
                
            parsed_notes.append({
                'id': item_id,
                'date': title,
                'updated': updated,
                'link': link,
                'category': item['category'],
                'description': str(desc_soup)
            })
            
    return parsed_notes

def get_cached_notes(force_refresh=False):
    """Retrieves notes from cache, or fetches them if expired/missing."""
    now = datetime.now().timestamp()
    
    if not force_refresh and os.path.exists(CACHE_FILE):
        try:
            with open(CACHE_FILE, 'r', encoding='utf-8') as f:
                cached_data = json.load(f)
                
            # Check if cache has not expired
            if now - cached_data.get('timestamp', 0) < CACHE_EXPIRY_SECONDS:
                return cached_data.get('notes', []), False
        except Exception as e:
            # If cache read fails, we will just fetch fresh data
            app.logger.warning(f"Failed to read cache: {e}")
            
    # Fetch fresh data
    try:
        notes = fetch_and_parse_feed()
        
        # Save to cache
        cache_data = {
            'timestamp': now,
            'notes': notes
        }
        with open(CACHE_FILE, 'w', encoding='utf-8') as f:
            json.dump(cache_data, f, ensure_ascii=False, indent=2)
            
        return notes, True
    except Exception as e:
        # If fetch fails but we have an expired cache, return the expired cache
        if os.path.exists(CACHE_FILE):
            try:
                with open(CACHE_FILE, 'r', encoding='utf-8') as f:
                    cached_data = json.load(f)
                app.logger.error(f"Failed to fetch new feed. Using expired cache. Error: {e}")
                return cached_data.get('notes', []), False
            except Exception:
                pass
        raise e

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/notes')
def api_notes():
    force_refresh = request.args.get('refresh', 'false').lower() == 'true'
    try:
        notes, fetched_fresh = get_cached_notes(force_refresh=force_refresh)
        
        # Calculate stats for the response
        categories = {}
        for note in notes:
            cat = note['category']
            categories[cat] = categories.get(cat, 0) + 1
            
        stats = {
            'total_items': len(notes),
            'categories': categories,
            'last_fetched': datetime.now().isoformat() if fetched_fresh else None
        }
        
        if os.path.exists(CACHE_FILE):
            stats['cache_time'] = datetime.fromtimestamp(os.path.getmtime(CACHE_FILE)).isoformat()
            
        return jsonify({
            'status': 'success',
            'notes': notes,
            'stats': stats,
            'refreshed': fetched_fresh
        })
    except Exception as e:
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 500

if __name__ == '__main__':
    # Running on localhost, port 5000
    app.run(debug=True, host='127.0.0.1', port=5000)
