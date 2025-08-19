# geoapp/extensions/mongo.py
from pymongo import MongoClient
from flask import current_app

mongo_client = None

def init_mongo(app):
    global mongo_client
    mongo_client = MongoClient(app.config["MONGO_URI"])
    