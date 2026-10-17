# Serveur de développement : comme « python -m http.server », mais sans cache navigateur,
# pour que chaque modification (fanarts, styles…) s'affiche dès le rechargement.
import http.server, sys, os

class NoCache(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Cache-Control', 'no-store')
        super().end_headers()

os.chdir(os.path.dirname(os.path.abspath(__file__)))
http.server.ThreadingHTTPServer(('', int(sys.argv[1]) if len(sys.argv) > 1 else 5180), NoCache).serve_forever()
