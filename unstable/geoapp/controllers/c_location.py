# geoapp/controllers/c_location.py
from flask import Blueprint, request, jsonify
from geoapp.extensions.mongo import mongo_client
from geoapp.models.m_location import LocationSchema

bp = Blueprint("locations", __name__, url_prefix="/api/locations")

@bp.route("", methods=["POST"])
def create_location():
    schema = LocationSchema()
    try:
        # フロントからのデータをバリデート
        data = schema.load(request.json)
    except Exception as e:
        return jsonify({"error": str(e)}), 400

    # MongoDBにデータを保存
    db = mongo_client.db  # geoapp_db に接続
    result = db["locations"].insert_one(data)
    
    return jsonify({"message": "Location created", "id": str(result.inserted_id)})
