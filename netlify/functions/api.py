import json
import os
import sys
from pathlib import Path

# Add the project root to Python path
project_root = Path(__file__).parent.parent.parent
sys.path.insert(0, str(project_root))

from api import app

def handler(event, context):
    """Netlify Functions handler for Flask app"""
    try:
        # Convert Netlify event to Flask-compatible format
        from werkzeug.serving import WSGIRequestHandler
        from werkzeug.test import Client
        from werkzeug.wrappers import Response
        
        # Create test client
        client = Client(app, Response)
        
        # Extract request details
        method = event.get('httpMethod', 'GET')
        path = event.get('path', '/')
        headers = event.get('headers', {})
        body = event.get('body', '')
        query_params = event.get('queryStringParameters') or {}
        
        # Make request to Flask app
        response = client.open(
            path=path,
            method=method,
            headers=list(headers.items()),
            data=body,
            query_string=query_params
        )
        
        # Convert Flask response to Netlify format
        return {
            'statusCode': response.status_code,
            'headers': dict(response.headers),
            'body': response.get_data(as_text=True)
        }
        
    except Exception as e:
        return {
            'statusCode': 500,
            'body': json.dumps({'error': str(e)})
        }
