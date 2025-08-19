from flask import Blueprint, jsonify
from geoapp.controllers.c_location import create_location

r_location = Blueprint("r_location", __name__)

@r_location.route("/register/nagoya", methods=["POST"])
def register_location():
    inserted_id = create_location()
    return jsonify({"message": "Location registered", "id": inserted_id})