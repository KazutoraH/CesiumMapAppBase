from flask import Blueprint, current_app, send_from_directory
import os
from geoapp.controllers.c_location import bp as location_bp

main_routes = Blueprint("main", __name__)
main_routes.register_blueprint(location_bp)

@main_routes.route("/")
def serve_vue():
    dist_dir = os.path.join(current_app.root_path, "static")
    return send_from_directory(dist_dir, "index.html")

@main_routes.route("/<path:path>")
def serve_vue_assets(path):
    dist_dir = os.path.join(current_app.root_path, "static")
    return send_from_directory(dist_dir, path)