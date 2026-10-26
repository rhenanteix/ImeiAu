import hashlib
import json
import os
import secrets
import smtplib
from contextlib import asynccontextmanager
from email.message import EmailMessage
from pathlib import Path
from typing import Literal
from uuid import uuid4
from fastapi import FastAPI, Depends, HTTPException, Header
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, ConfigDict, Field, StrictBool, field_validator
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session
from .models import Base, engine, SessionLocal, Store, Device, ConditionRule, TradeInRequest, Lead

Mode = Literal['instant_coupon', 'post_inspection']

LEAD_RECIPIENTS = ['contato@ribeiraconnect.com.br', 'rhenancontato@gmail.com']

def smtp_config():
    return {
        'host': os.getenv('SMTP_HOST', ''),
        'port': int(os.getenv('SMTP_PORT', '587') or '587'),
        'user': os.getenv('SMTP_USER', ''),
        'password': os.getenv('SMTP_PASSWORD', ''),
        'from': os.getenv('SMTP_FROM', 'contato@ribeiraconnect.com.br'),
    }

def send_lead_email(data):
    cfg = smtp_config()
    if not cfg['host'] or not cfg['user'] or not cfg['password']:
        return False
    message = EmailMessage()
    message['Subject'] = f'[IMEIAU] Novo lead — {data["store_name"]}'
    message['From'] = cfg['from']
    body = [
        'Novo lead pelo formulário da landing IMEIAU',
        '',
        f'Nome: {data["name"]}',
        f'Loja: {data["store_name"]}',
        f'WhatsApp: {data["whatsapp"]}',
        f'E-mail: {data["email"]}',
        f'Plataforma: {data["platform"]}',
        f'Consentimento: sim',
    ]
    message.set_content('\n'.join(body))
    last_error = None
    for recipient in LEAD_RECIPIENTS:
        message['To'] = recipient
        try:
            with smtplib.SMTP(cfg['host'], cfg['port'], timeout=15) as smtp:
                smtp.starttls()
                smtp.login(cfg['user'], cfg['password'])
                smtp.send_message(message)
            return True
        except Exception as exc:
            last_error = exc
            continue
    return False
class Input(BaseModel):
    model_config = ConfigDict(extra='forbid', str_strip_whitespace=True)
class Condition(Input):
    powers_on: StrictBool
    screen_intact: StrictBool
    battery_ok: StrictBool
class QuoteInput(Input):
    store_id: str = Field(min_length=1, max_length=64)
    device_id: str = Field(min_length=1, max_length=64)
    condition: Condition
class Address(Input):
    postal_code: str = Field(pattern=r'^\d{8}$')
    street: str = Field(min_length=3, max_length=150)
    number: str = Field(min_length=1, max_length=15)
    complement: str = Field(default='', max_length=100)
    neighborhood: str = Field(min_length=2, max_length=100)
    city: str = Field(min_length=2, max_length=100)
    state: str = Field(pattern=r'^[A-Z]{2}$')
class Customer(Input):
    name: str = Field(min_length=3, max_length=120)
    email: str = Field(max_length=255, pattern=r'^[^\s@]+@[^\s@]+\.[^\s@]+$')
    phone: str = Field(pattern=r'^\d{10,13}$')
    cpf: str = Field(pattern=r'^\d{11}$')
    address: Address
    @field_validator('cpf')
    @classmethod
    def valid_cpf(cls, value):
        if len(set(value)) == 1:
            raise ValueError('CPF inválido')
        for size in (9, 10):
            digit = (sum(int(value[i]) * (size + 1 - i) for i in range(size)) * 10 % 11) % 10
            if digit != int(value[size]): raise ValueError('CPF inválido')
        return value
class CreateInput(QuoteInput):
    mode: Mode
    customer: Customer
    consent: Literal[True]
class LeadInput(Input):
    name: str = Field(min_length=3, max_length=120)
    store_name: str = Field(min_length=2, max_length=120)
    whatsapp: str = Field(pattern=r'^\d{10,13}$')
    email: str = Field(max_length=255, pattern=r'^[^\s@]+@[^\s@]+\.[^\s@]+$')
    platform: Literal['Shopify','Nuvemshop','WooCommerce','Outra']
    consent: Literal[True]
class StatusInput(Input):
    status: Literal['shipped','inspecting','approved','rejected']

def db():
    with SessionLocal() as session: yield session

def seed():
    Base.metadata.create_all(engine)
    with SessionLocal() as session:
        if not session.get(Store, 'demo'):
            session.add_all([
                Store(id='demo', name='Loja demonstração', domain='localhost', platform='Shopify', mode_preference='instant_coupon'),
                Store(id='demo-inspection', name='Loja inspeção', domain='inspection.localhost', platform='Nuvemshop', mode_preference='post_inspection')])
        for id, brand, model, storage, price in [('iphone13-128','Apple','iPhone 13','128GB',180000),('iphone13-256','Apple','iPhone 13','256GB',205000),('iphone14-128','Apple','iPhone 14','128GB',230000),('s23-128','Samsung','Galaxy S23','128GB',165000)]:
            if not session.get(Device,id): session.add(Device(id=id,brand=brand,model=model,storage=storage,base_price=price))
        for name, deduction in [('powers_on',60),('screen_intact',25),('battery_ok',10)]:
            if not session.get(ConditionRule,name): session.add(ConditionRule(id=name,criteria_name=name,deduction_percentage=deduction))
        session.commit()
@asynccontextmanager
async def lifespan(app):
    seed()
    yield
app = FastAPI(title='Volta • Trade-in API', version='0.1.0', lifespan=lifespan)
app.add_middleware(CORSMiddleware, allow_origins=os.getenv('ALLOWED_ORIGINS','http://localhost:8000,http://127.0.0.1:8000').split(','), allow_methods=['GET','POST','PATCH'], allow_headers=['Content-Type','Idempotency-Key'], allow_credentials=False)

def get_store(session, id):
    store = session.get(Store,id)
    if not store: raise HTTPException(404,'Loja não encontrada')
    return store

def calculate(session, data):
    store = get_store(session,data.store_id)
    device = session.get(Device,data.device_id)
    if not device: raise HTTPException(404,'Aparelho não encontrado')
    rules = session.scalars(select(ConditionRule)).all()
    deductions = [{'criteria': r.criteria_name, 'percentage': r.deduction_percentage} for r in rules if data.condition.model_dump().get(r.criteria_name) is False]
    percent = min(100,sum(r['percentage'] for r in deductions))
    return {'device_id':device.id,'base_price':device.base_price,'estimated_value':(device.base_price * (100-percent) + 50)//100,'currency':'BRL','deductions':deductions,'allowed_modes':['instant_coupon','post_inspection'] if store.mode_preference == 'instant_coupon' else ['post_inspection'], 'preferred_mode':store.mode_preference}

@app.get('/api/v1/devices')
def devices(store_id: str, session: Session = Depends(db)):
    store = get_store(session,store_id)
    tree = {}
    for d in session.scalars(select(Device).order_by(Device.brand,Device.model,Device.storage)):
        tree.setdefault(d.brand,{}).setdefault(d.model,[]).append({'id':d.id,'storage':d.storage})
    return {'brands':tree,'mode_preference':store.mode_preference}
@app.post('/api/v1/quotes/calculate')
def quote(data: QuoteInput, session: Session = Depends(db)):
    return calculate(session,data)

def result(row):
    return {'id':row.id,'status':row.status,'mode':row.mode,'estimated_value':row.estimated_value,'currency':'BRL','coupon_code':row.coupon_code,'shipping_code':row.shipping_code,'simulated':True}

@app.post('/api/v1/tradein/create', status_code=201)
def create(data: CreateInput, idempotency_key: str = Header(min_length=8,max_length=100), session: Session = Depends(db)):
    digest = hashlib.sha256(json.dumps(data.model_dump(),sort_keys=True).encode()).hexdigest()
    def existing():
        row = session.scalar(select(TradeInRequest).where(TradeInRequest.store_id==data.store_id,TradeInRequest.idempotency_key==idempotency_key))
        if row and row.payload_hash != digest: raise HTTPException(409,'Chave já utilizada com outros dados')
        return row
    row = existing()
    if row: return result(row)
    quotation = calculate(session,data)
    if data.mode not in quotation['allowed_modes']: raise HTTPException(422,'Modalidade não permitida pela loja')
    if quotation['estimated_value'] <= 0: raise HTTPException(422,'Aparelho sem valor elegível')
    token = uuid4().hex.upper()
    row = TradeInRequest(id=str(uuid4()),store_id=data.store_id,device_id=data.device_id,customer_data=data.customer.model_dump(),condition=data.condition.model_dump(),estimated_value=quotation['estimated_value'],mode=data.mode,coupon_code=f'DEMO-{token[:12]}' if data.mode=='instant_coupon' else None,shipping_code=f'DEMO-POST-{token}',idempotency_key=idempotency_key,payload_hash=digest)
    session.add(row)
    try: session.commit()
    except IntegrityError:
        session.rollback()
        row = existing()
        if not row: raise HTTPException(409,'Conflito ao registrar solicitação')
    return result(row)

@app.patch('/api/v1/tradein/{request_id}/status')
def update_status(request_id: str, data: StatusInput, authorization: str = Header(default=''), session: Session = Depends(db)):
    token = os.getenv('ADMIN_TOKEN','')
    if not token or not secrets.compare_digest(authorization, f'Bearer {token}'): raise HTTPException(401,'Autenticação administrativa necessária')
    row = session.get(TradeInRequest,request_id)
    if not row: raise HTTPException(404,'Solicitação não encontrada')
    transitions = {'pending_shipping':['shipped'],'shipped':['inspecting'],'inspecting':['approved','rejected'],'approved':[],'rejected':[]}
    if data.status != row.status:
        if data.status not in transitions[row.status]: raise HTTPException(409,'Transição de status inválida')
        row.status=data.status
        if data.status=='approved' and not row.coupon_code: row.coupon_code=f'DEMO-{uuid4().hex[:12].upper()}'
        if data.status=='rejected': row.coupon_code=None
        session.commit()
    return result(row)

@app.post('/api/v1/leads', status_code=201)
def lead(data: LeadInput, session: Session = Depends(db)):
    session.add(Lead(**data.model_dump(exclude={'consent'})))
    try: session.commit()
    except IntegrityError: session.rollback()
    payload = data.model_dump(exclude={'consent'})
    try:
        send_lead_email(payload)
    except Exception:
        pass
    return {'message':'Você está na lista! Entraremos em contato sobre o piloto.'}

app.mount('/',StaticFiles(directory=Path(__file__).resolve().parent.parent/'static',html=True),name='site')
