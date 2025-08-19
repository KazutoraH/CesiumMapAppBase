# geoapp/__init__.py
from flask import Flask
from geoapp.config import DevelopmentConfig
from geoapp.extensions.mongo import init_mongo
from geoapp.routes import main_routes

def create_app(config_class=DevelopmentConfig):
    app = Flask(__name__)
    app.config.from_object(config_class)

    init_mongo(app)  # MongoDB初期化

    app.register_blueprint(main_routes)
    return app
