# geoapp/schemas/location_schema.py

from pydantic import BaseModel, Field
from typing import Optional

class LocationSchema(BaseModel):
    name: str = Field(..., description="名称（例: 名古屋市役所）")
    lat: float = Field(..., ge=-90, le=90, description="緯度")
    lng: float = Field(..., ge=-180, le=180, description="経度")
    altitude: Optional[float] = Field(None, description="高さ（任意）")
    description: Optional[str] = Field(None, description="説明文（任意）")
