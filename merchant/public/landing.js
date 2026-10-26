document.querySelector('#lead-form').addEventListener('submit', async event => {
  event.preventDefault();
  const form=event.currentTarget, button=form.querySelector('button'), status=document.querySelector('#lead-status');
  const body=Object.fromEntries(new FormData(form));
  body.whatsapp=body.whatsapp.replace(/\D/g,''); body.consent=form.elements.consent.checked;
  button.disabled=true; status.textContent='Enviando…';
  try {
    const response=await fetch('/api/v1/leads',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
    const data=await response.json();
    if(!response.ok) throw new Error('Confira os dados, incluindo WhatsApp com DDD, e tente novamente.');
    status.textContent=data.message; form.reset();
  } catch(error){status.textContent=error.message || 'Não foi possível enviar. Tente novamente.';}
  finally {button.disabled=false;}
});
