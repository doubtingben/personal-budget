#!/usr/bin/env python3
"""
Simple HTTP server for Budget Visualization
Serves static files and handles API requests
"""

import http.server
import socketserver
import json
import urllib.parse
import os
from datetime import date
from api import BudgetAPI

PORT = int(os.environ.get('PORT', 8000))
api = BudgetAPI()


class BudgetHandler(http.server.SimpleHTTPRequestHandler):
    def do_GET(self):
        """Handle GET requests"""
        parsed_path = urllib.parse.urlparse(self.path)

        # API endpoints
        if parsed_path.path == '/api/settings':
            self.handle_get_settings()
        elif parsed_path.path == '/api/events':
            self.handle_get_events()
        elif parsed_path.path == '/api/labels':
            self.handle_get_labels()
        elif parsed_path.path == '/api/labels/with-counts':
            self.handle_get_labels_with_counts()
        elif parsed_path.path == '/api/timeline':
            self.handle_get_timeline(parsed_path.query)
        else:
            # Serve static files
            super().do_GET()

    def do_POST(self):
        """Handle POST requests"""
        content_length = int(self.headers['Content-Length'])
        post_data = self.rfile.read(content_length)
        data = json.loads(post_data.decode('utf-8'))

        if self.path == '/api/events':
            self.handle_add_event(data)
        elif self.path == '/api/settings':
            self.handle_update_settings(data)
        else:
            self.send_error(404)

    def do_PUT(self):
        """Handle PUT requests"""
        content_length = int(self.headers['Content-Length'])
        put_data = self.rfile.read(content_length)
        data = json.loads(put_data.decode('utf-8'))

        if self.path.startswith('/api/events/'):
            event_id = int(self.path.split('/')[-1])
            self.handle_update_event(event_id, data)
        elif self.path.startswith('/api/labels/'):
            label_name = urllib.parse.unquote(self.path.split('/')[-1])
            self.handle_rename_label(label_name, data)
        else:
            self.send_error(404)

    def do_DELETE(self):
        """Handle DELETE requests"""
        if self.path.startswith('/api/events/'):
            event_id = int(self.path.split('/')[-1])
            self.handle_delete_event(event_id)
        elif self.path.startswith('/api/labels/'):
            label_name = urllib.parse.unquote(self.path.split('/')[-1])
            self.handle_delete_label(label_name)
        else:
            self.send_error(404)

    def send_json_response(self, data, status=200):
        """Send JSON response"""
        self.send_response(status)
        self.send_header('Content-type', 'application/json')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.end_headers()
        self.wfile.write(json.dumps(data).encode('utf-8'))

    def handle_get_settings(self):
        """Get all settings"""
        settings = {
            'starting_balance': float(api.get_setting('starting_balance', '1000.00')),
            'current_date': api.get_setting('current_date', date.today().strftime('%Y-%m-%d'))
        }
        self.send_json_response(settings)

    def handle_update_settings(self, data):
        """Update settings"""
        for key, value in data.items():
            api.set_setting(key, str(value))
        self.send_json_response({'success': True})

    def handle_get_events(self):
        """Get all events"""
        events = api.get_all_events()
        self.send_json_response({'events': events})

    def handle_get_labels(self):
        """Get all labels"""
        labels = api.get_all_labels()
        self.send_json_response({'labels': labels})

    def handle_get_labels_with_counts(self):
        """Get all labels with their event counts"""
        labels = api.get_labels_with_counts()
        self.send_json_response({'labels': labels})

    def handle_rename_label(self, old_name, data):
        """Rename a label"""
        new_name = data.get('new_name')
        if not new_name:
            self.send_error(400, 'Missing new_name in request body')
            return
        api.rename_label(old_name, new_name)
        self.send_json_response({'success': True})

    def handle_delete_label(self, label_name):
        """Delete a label"""
        api.delete_label(label_name)
        self.send_json_response({'success': True})

    def handle_get_timeline(self, query_string):
        """Get balance timeline"""
        params = urllib.parse.parse_qs(query_string)

        start_date = params.get('start_date', ['2025-10-24'])[0]
        end_date = params.get('end_date', ['2025-12-24'])[0]
        starting_balance = float(params.get('starting_balance', ['1000.00'])[0])
        labels = params.get('labels', [])

        if labels and labels[0]:
            labels = labels[0].split(',')
        else:
            labels = None

        timeline_data = api.calculate_balance_timeline(start_date, end_date, starting_balance, labels)
        self.send_json_response(timeline_data)

    def handle_add_event(self, data):
        """Add new event"""
        event_id = api.add_event(
            description=data['description'],
            amount=float(data['amount']),
            event_date=data.get('event_date'),
            is_recurring=data.get('is_recurring', False),
            recurrence_pattern=data.get('recurrence_pattern'),
            recurrence_interval=data.get('recurrence_interval', 1),
            recurrence_start=data.get('recurrence_start'),
            recurrence_end=data.get('recurrence_end'),
            comment=data.get('comment'),
            labels=data.get('labels', [])
        )
        self.send_json_response({'success': True, 'event_id': event_id}, 201)

    def handle_update_event(self, event_id, data):
        """Update event"""
        update_data = {}

        if 'description' in data:
            update_data['description'] = data['description']
        if 'amount' in data:
            update_data['amount'] = float(data['amount'])
        if 'event_date' in data:
            update_data['event_date'] = data['event_date']
        if 'is_recurring' in data:
            update_data['is_recurring'] = 1 if data['is_recurring'] else 0
        if 'recurrence_pattern' in data:
            update_data['recurrence_pattern'] = data['recurrence_pattern']
        if 'recurrence_interval' in data:
            update_data['recurrence_interval'] = data['recurrence_interval']
        if 'recurrence_start' in data:
            update_data['recurrence_start'] = data['recurrence_start']
        if 'recurrence_end' in data:
            update_data['recurrence_end'] = data['recurrence_end']
        if 'comment' in data:
            update_data['comment'] = data['comment']
        if 'labels' in data:
            update_data['labels'] = data['labels']

        api.update_event(event_id, **update_data)
        self.send_json_response({'success': True})

    def handle_delete_event(self, event_id):
        """Delete event"""
        api.delete_event(event_id)
        self.send_json_response({'success': True})

    def do_OPTIONS(self):
        """Handle OPTIONS for CORS"""
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()


if __name__ == '__main__':
    HOST = "0.0.0.0"
    with socketserver.TCPServer((HOST, PORT), BudgetHandler) as httpd:
        actual_host, actual_port = httpd.server_address
        print(f"🚀 Budget Visualization Server")
        print(f"📍 Listening on: {actual_host}:{actual_port}")
        if actual_host == "0.0.0.0":
            print(f"   → Available on all network interfaces")
            print(f"   → Local: http://localhost:{actual_port}")
            print(f"   → Network: http://<your-ip>:{actual_port}")
        print(f"📊 Server is ready to accept connections")
        print("Press Ctrl+C to stop the server")
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\n✅ Server stopped")
