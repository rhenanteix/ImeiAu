import os
import tempfile
from uuid import uuid4
os.environ['DATABASE_URL'] = 'sqlite:///' + tempfile.mktemp(suffix='.db')
os.environ['ADMIN_TOKEN'] = 'test-admin'
import pytest
from fastapi.testclient import TestClient
from app.main import app

@pytest.fixture
def client():
    with TestClient(app) as client: yield client

def payload(store='demo', mode='instant_coupon'):
    return {'store_id':store,'device_id':'iphone13-128','condition':{'powers_on':True,'screen_intact':True,'battery_ok':True},'mode':mode,'consent':True,'customer':{'name':'Cliente de teste','email':'teste@example.com','phone':'11999999999','cpf':'52998224725','address':{'postal_code':'01001000','street':'Rua de teste','number':'123','city':'São Paulo','neighborhood':'Centro','state':'SP'}}}
def create(client, body=None, key=None):
    return client.post('/api/v1/tradein/create', json=body or payload(),headers={'Idempotency-Key':key or str(uuid4())})
def test_catalog_and_landing(client):
    assert client.get('/').status_code==200
    assert client.get('/widget.js').status_code==200
    assert client.get('/api/v1/devices?store_id=demo').json()['brands']['Apple']['iPhone 13'][0]['storage']=='128GB'
    assert client.get('/api/v1/devices?store_id=unknown').status_code==404

def test_quote_deductions(client):
    body={k:v for k,v in payload().items() if k in ('store_id','device_id','condition')}
    assert client.post('/api/v1/quotes/calculate',json=body).json()['estimated_value']==180000
    body['condition']['screen_intact']=False
    body['condition']['battery_ok']=False
    assert client.post('/api/v1/quotes/calculate',json=body).json()['estimated_value']==117000
    body['condition']['powers_on']=False
    assert client.post('/api/v1/quotes/calculate',json=body).json()['estimated_value']==9000

def test_instant_and_idempotency(client):
    key=str(uuid4()); body=payload()
    first=create(client,body,key); assert first.status_code==201
    assert first.json()['coupon_code'].startswith('DEMO-')
    assert first.json()['shipping_code'].startswith('DEMO-POST-')
    assert create(client,body,key).json()==first.json()
    body['customer']['name']='Outro nome'
    assert create(client,body,key).status_code==409

def test_inspection_lifecycle(client):
    response=create(client,payload('demo-inspection','post_inspection'))
    assert response.status_code==201
    data=response.json(); assert data['coupon_code'] is None
    url='/api/v1/tradein/'+data['id']+'/status'
    assert client.patch(url,json={'status':'approved'}).status_code==401
    headers={'Authorization':'Bearer test-admin'}
    assert client.patch(url,json={'status':'approved'},headers=headers).status_code==409
    for status in ('shipped','inspecting','approved'):
        response=client.patch(url,json={'status':status},headers=headers)
        assert response.status_code==200
    assert response.json()['coupon_code'].startswith('DEMO-')
    assert client.patch(url,json={'status':'approved'},headers=headers).json()==response.json()

def test_mode_and_tampering(client):
    assert create(client,payload('demo-inspection')).status_code==422
    body=payload();body['estimated_value']=999999
    assert create(client,body).status_code==422
    body=payload();body['customer']['cpf']='11111111111'
    assert create(client,body).status_code==422
    body=payload();body['condition']['powers_on']='yes'
    assert create(client,body).status_code==422
    body=payload();body['device_id']='missing'
    assert create(client,body).status_code==404

def test_rejection_revokes_mock_coupon(client):
    data=create(client).json();url='/api/v1/tradein/'+data['id']+'/status'
    for status in ('shipped','inspecting','rejected'):
        response=client.patch(url,json={'status':status},headers={'Authorization':'Bearer test-admin'})
    assert response.json()['coupon_code'] is None
    assert client.patch(url,json={'status':'approved'},headers={'Authorization':'Bearer test-admin'}).status_code==409

def test_lead(client):
    body={'name':'Lojista teste','store_name':'Loja teste','email':'loja@example.com','whatsapp':'11999999999','platform':'Shopify','consent':True}
    assert client.post('/api/v1/leads',json=body).status_code==201
    assert client.post('/api/v1/leads',json=body).status_code==201
    body['consent']=False
    assert client.post('/api/v1/leads',json=body).status_code==422
