from flask import Blueprint
from geoapp.routes.r_location import r_location

main_routes = Blueprint("main", __name__)
main_routes.register_blueprint(r_location)