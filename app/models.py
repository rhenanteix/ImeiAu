import os
from datetime import datetime, timezone
from uuid import uuid4
from sqlalchemy import create_engine, String, Integer, JSON, DateTime, ForeignKey, UniqueConstraint, CheckConstraint, event
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, sessionmaker

DATABASE_URL = os.getenv('DATABASE_URL', 'sqlite:///./tradein.db')
engine = create_engine(DATABASE_URL, connect_args={'check_same_thread': False} if DATABASE_URL.startswith('sqlite') else {})
if DATABASE_URL.startswith('sqlite'):
    @event.listens_for(engine, 'connect')
    def enable_foreign_keys(connection, _):
        connection.execute('PRAGMA foreign_keys=ON')
SessionLocal = sessionmaker(engine)
class Base(DeclarativeBase): pass
class Store(Base):
    __tablename__ = 'stores'
    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    name: Mapped[str] = mapped_column(String(120))
    domain: Mapped[str] = mapped_column(String(255), unique=True)
    platform: Mapped[str] = mapped_column(String(30))
    api_keys: Mapped[dict] = mapped_column(JSON, default=dict) # secret references only
    mode_preference: Mapped[str] = mapped_column(String(30))
    __table_args__ = (CheckConstraint("mode_preference IN ('instant_coupon','post_inspection')"),)
class Device(Base):
    __tablename__ = 'devices'
    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    brand: Mapped[str] = mapped_column(String(60))
    model: Mapped[str] = mapped_column(String(100))
    storage: Mapped[str] = mapped_column(String(30))
    base_price: Mapped[int] = mapped_column(Integer) # BRL cents
    __table_args__ = (UniqueConstraint('brand','model','storage'), CheckConstraint('base_price >= 0'))
class ConditionRule(Base):
    __tablename__ = 'condition_rules'
    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    criteria_name: Mapped[str] = mapped_column(String(50), unique=True)
    deduction_percentage: Mapped[int] = mapped_column(Integer)
    __table_args__ = (CheckConstraint('deduction_percentage BETWEEN 0 AND 100'),)
class TradeInRequest(Base):
    __tablename__ = 'tradein_requests'
    id: Mapped[str] = mapped_column(String(64), primary_key=True, default=lambda: str(uuid4()))
    store_id: Mapped[str] = mapped_column(ForeignKey('stores.id'), index=True)
    device_id: Mapped[str] = mapped_column(ForeignKey('devices.id'))
    customer_data: Mapped[dict] = mapped_column(JSON)
    condition: Mapped[dict] = mapped_column(JSON)
    estimated_value: Mapped[int] = mapped_column(Integer)
    mode: Mapped[str] = mapped_column(String(30))
    status: Mapped[str] = mapped_column(String(30), default='pending_shipping')
    coupon_code: Mapped[str | None] = mapped_column(String(80), unique=True)
    shipping_code: Mapped[str] = mapped_column(String(80), unique=True)
    idempotency_key: Mapped[str] = mapped_column(String(100))
    payload_hash: Mapped[str] = mapped_column(String(64))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    __table_args__ = (UniqueConstraint('store_id','idempotency_key'), CheckConstraint("status IN ('pending_shipping','shipped','inspecting','approved','rejected')"), CheckConstraint('estimated_value >= 0'))
class Lead(Base):
    __tablename__ = 'leads'
    id: Mapped[str] = mapped_column(String(64), primary_key=True, default=lambda: str(uuid4()))
    name: Mapped[str] = mapped_column(String(120))
    store_name: Mapped[str] = mapped_column(String(120))
    whatsapp: Mapped[str] = mapped_column(String(25))
    email: Mapped[str] = mapped_column(String(255), unique=True)
    platform: Mapped[str] = mapped_column(String(30))
