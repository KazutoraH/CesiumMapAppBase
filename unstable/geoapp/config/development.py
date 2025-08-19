import os
class DevelopmentConfig:
    DEBUG = True
    TESTING = False
    MONGO_URI = os.getenv("MONGO_URI")
