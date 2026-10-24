from typing import Optional
from pydantic import BaseModel, Field
from datetime import datetime

class ProductBase(BaseModel):
    sku: str = Field(..., min_length=2, max_length=50)
    name: str = Field(..., min_length=2, max_length=255)
    description: Optional[str] = None
    category: str = Field(..., min_length=1, max_length=100)
    unit: str = Field(default="PCS", max_length=20)
    hsn_code: Optional[str] = None
    unit_selling_price: float = Field(..., ge=0.0)
    unit_cost: float = Field(..., ge=0.0)
    stock_quantity: int = Field(default=0, ge=0)
    reorder_threshold: int = Field(default=5, ge=0)
    is_active: bool = True

class ProductCreate(ProductBase):
    pass

class ProductUpdate(BaseModel):
    sku: Optional[str] = None
    name: Optional[str] = None
    description: Optional[str] = None
    category: Optional[str] = None
    unit: Optional[str] = None
    hsn_code: Optional[str] = None
    unit_selling_price: Optional[float] = Field(None, ge=0.0)
    unit_cost: Optional[float] = Field(None, ge=0.0)
    stock_quantity: Optional[int] = Field(None, ge=0)
    reorder_threshold: Optional[int] = Field(None, ge=0)
    is_active: Optional[bool] = None

class ProductResponse(ProductBase):
    id: int
    business_id: int
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True

class ProductListResponse(BaseModel):
    items: list[ProductResponse]
    total: int
    page: int
    page_size: int
    total_pages: int
