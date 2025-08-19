from marshmallow import Schema, fields, validate

class LocationSchema(Schema):
    name = fields.String(required=True, validate=validate.Length(min=1))
    latitude = fields.Float(required=True)
    longitude = fields.Float(required=True)
    altitude = fields.Float(required=False, allow_none=True)
    description = fields.String(required=False, allow_none=True)

# MongoDBのドキュメント例に対応
example_data = {
    "name": "名古屋市役所",
    "latitude": 35.1815,
    "longitude": 136.9066,
    "altitude": 12.3,
    "description": "名古屋市の行政機関です。"
}