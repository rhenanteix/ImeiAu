(() => {
  const defaultApi = new URL(document.currentScript?.src || location.href).origin;
  const esc = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const money = cents => (cents / 100).toLocaleString('pt-BR', {style:'currency',currency:'BRL'});
  class TradeInWidget extends HTMLElement {
    constructor() { super(); this.attachShadow({mode:'open'}); this.step=1; this.values={}; this.condition={powers_on:true,screen_intact:true,battery_ok:true}; }
    connectedCallback() {
      if (this.initialized) return;
      this.initialized=true;
      this.api=this.getAttribute('api-url') || defaultApi;
      this.store=this.getAttribute('store-id') || 'demo';
      this.testMode=this.hasAttribute('test-mode');
      this.shadowRoot.innerHTML=`<style>
        :host{font:15px/1.5 system-ui,sans-serif;color:#153c32}*{box-sizing:border-box}button,input,select{font:inherit}button{cursor:pointer;border:0;border-radius:10px;padding:13px 18px;background:#c6f36a;color:#153c32;font-weight:700}button:disabled{opacity:.55;cursor:wait}dialog{border:0;border-radius:22px;padding:0;width:min(540px,calc(100vw - 24px));max-height:90dvh;color:#153c32;box-shadow:0 25px 100px #0004}dialog::backdrop{background:#102d26a8}header{padding:22px 26px;border-bottom:1px solid #e0e6df;display:flex;justify-content:space-between;align-items:center}header button{background:#edf2eb;padding:6px 12px}main{padding:26px}h2{font-size:26px;line-height:1.2;margin:12px 0}p{color:#61716a}label{display:block;margin:14px 0 5px;font-weight:600}input,select{width:100%;padding:12px;border:1px solid #a5b4aa;border-radius:8px;background:white;color:#153c32}input[type=checkbox],input[type=radio]{width:auto;margin-right:8px}footer{display:flex;gap:10px;margin-top:24px}footer button:last-child{flex:1}.secondary{background:#edf2eb}.eyebrow{font-size:12px;letter-spacing:.12em;text-transform:uppercase}.value{font-size:40px;font-weight:750;margin:14px 0}.notice{padding:14px;background:#f0f5e9;border-radius:10px}.error{color:#a32c2c;white-space:pre-line}code{display:block;overflow-wrap:anywhere;font-size:18px;margin:8px 0}small{display:block;color:#61716a}a{color:inherit}:focus-visible{outline:3px solid #37806a;outline-offset:3px}
      </style><button id="launch" type="button">${esc(this.getAttribute('label') || 'Simular meu trade-in ↗')}</button><dialog aria-label="Cotação de trade-in"><header><strong>IMEIAU / trade-in</strong><button type="button" aria-label="Fechar">×</button></header><main></main></dialog>`;
      this.dialog=this.shadowRoot.querySelector('dialog');
      this.shadowRoot.querySelector('#launch').onclick=()=>this.open();
      this.shadowRoot.querySelector('header button').onclick=()=>this.dialog.close();
    }
    async request(path, body, key) {
      const response=await fetch(this.api+path,{method:body?'POST':'GET',headers:body?{'Content-Type':'application/json',...(key?{'Idempotency-Key':key}:{})}:{},body:body?JSON.stringify(body):undefined});
      const data=await response.json();
      if(!response.ok) throw new Error(Array.isArray(data.detail)?data.detail.map(e=>`${e.loc.slice(1).join('.')}: ${e.msg}`).join('\n'):data.detail || 'Não foi possível concluir. Tente novamente.');
      return data;
    }
    async open() {
      if(this.step===5){this.step=1;this.values={};this.condition={powers_on:true,screen_intact:true,battery_ok:true};}
      this.dialog.showModal();
      if(!this.catalog) {
        this.shadowRoot.querySelector('main').textContent='Carregando aparelhos…';
        try { this.catalog=await this.request('/api/v1/devices?store_id='+encodeURIComponent(this.store)); if (!Object.keys(this.catalog.brands).length) { this.catalog=null; throw new Error('Esta loja ainda não tem aparelhos disponíveis para cotação.'); } this.brand=Object.keys(this.catalog.brands)[0]; this.model=Object.keys(this.catalog.brands[this.brand])[0]; this.device=this.catalog.brands[this.brand][this.model][0].id; }
        catch(e) { this.shadowRoot.querySelector('main').textContent=e.message; return; }
      }
      this.render();
    }
    payload() { return {store_id:this.store,device_id:this.device,condition:this.condition}; }
    render() {
      const main=this.shadowRoot.querySelector('main');
      const options=(items,selected)=>items.map(([v,t])=>`<option value="${esc(v)}" ${v===selected?'selected':''}>${esc(t)}</option>`).join('');
      let content='';
      if(this.step===1) content=`<h2>Seu usado tem valor.</h2><p>Qual aparelho você quer dar como parte do pagamento?</p><label for="brand">Marca</label><select id="brand">${options(Object.keys(this.catalog.brands).map(v=>[v,v]),this.brand)}</select><label for="model">Modelo</label><select id="model">${options(Object.keys(this.catalog.brands[this.brand]).map(v=>[v,v]),this.model)}</select><label for="device">Armazenamento</label><select id="device">${options(this.catalog.brands[this.brand][this.model].map(v=>[v.id,v.storage]),this.device)}</select>`;
      if(this.step===2) content=`<h2>Como está o aparelho?</h2><p>Uma avaliação honesta ajuda a evitar ajustes na inspeção.</p>${[['powers_on','O aparelho liga normalmente?'],['screen_intact','A tela está intacta e funcional?'],['battery_ok','A saúde da bateria está em 80% ou mais?']].map(([key,label])=>`<label for="${key}">${label}</label><select id="${key}"><option value="true" ${this.condition[key]?'selected':''}>Sim</option><option value="false" ${!this.condition[key]?'selected':''}>Não</option></select>`).join('')}`;
      if(this.step===3) content=`<h2>Mais valor para sua próxima compra.</h2><p>Estimativa do seu ${esc(this.model)}</p><div class="value">${money(this.quote.estimated_value)}</div><small>Sujeito à conferência do aparelho. Valores demonstrativos.</small>${this.quote.allowed_modes.map(mode=>`<label><input type="radio" name="mode" value="${mode}" ${this.mode===mode?'checked':''}>${mode==='instant_coupon'?'Cupom instantâneo':'Liberação pós-inspeção'}</label><small>${mode==='instant_coupon'?'Cupom emitido ao confirmar. O envio e a avaliação continuam obrigatórios.':'Envie o aparelho. O cupom é emitido após aprovação.'}</small>`).join('')}`;
      if(this.step===4) {
        const fields=[['name','Nome completo','text'],['email','E-mail','email'],['phone','WhatsApp (somente números)','tel'],['cpf','CPF (somente números)','text'],['postal_code','CEP (8 números)','text'],['street','Rua','text'],['number','Número','text'],['complement','Complemento (opcional)','text'],['neighborhood','Bairro','text'],['city','Cidade','text'],['state','UF (ex.: SP)','text']];
        content=`<h2>Para onde vai a autorização?</h2><p>Use apenas dados de teste nesta demonstração.</p>${fields.map(([key,label,type])=>`<label for="${key}">${label}</label><input id="${key}" name="${key}" type="${type}" value="${esc(this.values[key] || '')}" ${key==='complement'?'':'required'} maxlength="${key==='cpf'?14:key==='state'?2:key==='postal_code'?9:150}" ${['cpf','phone','postal_code'].includes(key)?'inputmode="numeric"':''}>`).join('')}<label for="imei">IMEI do aparelho (opcional nesta demonstração)</label><input id="imei" name="imei" inputmode="numeric" pattern="[0-9]{15}" maxlength="15" value="${esc(this.values.imei || '')}" aria-describedby="imei-help"><small id="imei-help">Encontre em Ajustes → Sobre ou digite *#06# no telefone. O formato é validado antes da consulta. A verificação de bloqueio é feita pelo serviço IMEI.info quando configurado; a conferência física acontece na inspeção.</small><button type="button" class="secondary" id="test-data">Preencher dados de teste</button><label><input type="checkbox" name="consent" required ${this.values.consent?'checked':''}>Autorizo o uso destes dados para processar o trade-in e a logística reversa.</label>`;
      }
      if(this.step===5) content=`<h2>Pronto para uma nova volta.</h2><p>Solicitação registrada. Guarde este resumo.</p><div class="notice"><strong>${money(this.result.estimated_value)}</strong><p>${this.result.coupon_code?'Seu cupom de demonstração':'Seu cupom será emitido após a inspeção e aprovação.'}</p>${this.result.coupon_code?`<code>${esc(this.result.coupon_code)}</code>`:''}<p>Autorização de postagem simulada</p><code>${esc(this.result.shipping_code)}</code></div><p>Não poste um aparelho com este código: ele não é válido nos Correios.</p><small>Protocolo: ${esc(this.result.id)}</small>`;
      if(this.step===5 && this.testMode) content=`<h2>Teste concluído!</h2><p>É assim que seu cliente chega ao fim do trade-in.</p><div class="notice"><strong>${money(this.result.estimated_value)}</strong><p>${this.mode==='instant_coupon'?'Na operação, o cupom seria emitido nesta etapa.':'Na operação, o crédito aguardaria a inspeção e aprovação.'}</p></div><p>Nenhuma solicitação, cupom ou autorização de postagem foi criada. Os dados de cliente não foram enviados.</p>`;
      main.innerHTML=`<div class="eyebrow">Etapa ${this.step} de 5 · ${this.testMode?'modo de teste':'demonstração'}</div><form>${content}<p class="error" role="alert"></p><footer>${this.step>1&&this.step<5?'<button type="button" class="secondary" id="back">Voltar</button>':''}<button type="submit">${this.step===5?'Concluir':this.step===4?'Confirmar trade-in':this.step===2?'Calcular cotação':'Continuar →'}</button></footer></form>`;
      const form=main.querySelector('form');
      main.querySelector('#test-data')?.addEventListener('click',()=>{this.values={...this.values,name:'Cliente demonstração',email:'teste@example.com',phone:'11999999999',cpf:'52998224725',postal_code:'01001000',street:'Rua de teste',number:'123',complement:'',neighborhood:'Centro',city:'São Paulo',state:'SP'};this.render();});
      form.oninput=()=>{ if(this.step===4) this.values={...Object.fromEntries(new FormData(form)),consent:form.elements.consent.checked}; };
      main.querySelector('#back')?.addEventListener('click',()=>{this.step--;this.render();});
      if(this.step===1) for(const key of ['brand','model','device']) main.querySelector('#'+key).onchange=e=>{
        this[key]=e.target.value;
        if(key==='brand') this.model=Object.keys(this.catalog.brands[this.brand])[0];
        if(key!=='device') this.device=this.catalog.brands[this.brand][this.model][0].id;
        this.render();
      };
      form.onsubmit=async e=>{
        e.preventDefault();const button=form.querySelector('button[type=submit]');button.disabled=true;
        try {
          if(this.step===5){this.dialog.close();return;}
          if(this.step===2){for(const key of Object.keys(this.condition))this.condition[key]=form.querySelector('#'+key).value==='true';this.quote=await this.request('/api/v1/quotes/calculate',this.payload());this.mode=this.quote.preferred_mode;}
          if(this.step===3)this.mode=new FormData(form).get('mode');
          if(this.step===4){
            const v={...Object.fromEntries(new FormData(form)),consent:form.elements.consent.checked};
            for(const k of ['cpf','phone','postal_code'])v[k]=String(v[k] || '').replace(/\D/g,'');
            v.state=String(v.state || '').trim().toUpperCase();
            this.values=v;
            const body={...this.payload(),mode:this.mode,consent:!!v.consent,...(v.imei?{imei:v.imei}:{}),customer:{name:v.name,email:v.email,phone:v.phone,cpf:v.cpf,address:Object.fromEntries(['postal_code','street','number','complement','neighborhood','city','state'].map(k=>[k,v[k] || '']))}};
            const signature=JSON.stringify(body);
            if(signature!==this.signature){this.key=crypto.randomUUID();this.signature=signature;}
            this.result=this.testMode ? {estimated_value:this.quote.estimated_value} : await this.request('/api/v1/tradein/create',body,this.key);
          }
          this.step++;this.render();this.shadowRoot.querySelector('main').scrollTop=0;
        } catch(error){main.querySelector('.error').textContent=error.message;} finally {button.disabled=false;}
      };
    }
  }
  if(!customElements.get('trade-in-widget'))customElements.define('trade-in-widget',TradeInWidget);
})();
