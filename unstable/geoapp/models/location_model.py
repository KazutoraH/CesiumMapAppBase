from flask import current_app as app
from pymongo import MongoClient
import os

# MongoDB接続の初期化
client = MongoClient(os.getenv("MONGO_URI"))
db = client["geoapp_db"]
locations_collection = db["locations"]

def insert_location(data):
    result = locations_collection.insert_one(data)
    return str(result.inserted_id)