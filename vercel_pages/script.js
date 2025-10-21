// Shared script for vercel landing and callback pages
(function(){
  // Utility: read query param by name
  function getQueryParam(name){
    var params = new URLSearchParams(window.location.search);
    return params.get(name);
  }

  // Callback page logic
  if (document.querySelector('.callback-card')){
    var status = (getQueryParam('status') || '').toLowerCase();
    var titleEl = document.getElementById('result-title');
    var messageEl = document.getElementById('result-message');
    var metaEl = document.getElementById('result-meta');
    var closeBtn = document.getElementById('close-cta');
    var whatsappLink = 'https://wa.me/15551751458?text=Hello';

    if (status === 'success'){
      titleEl.textContent = 'Payment Successful!';
      messageEl.textContent = 'Thank you — your payment was processed successfully.';
      metaEl.textContent = 'You will be redirected back to WhatsApp after you close this window.';
    } else if (status === 'failed'){
      titleEl.textContent = 'Payment Failed';
      messageEl.textContent = 'We could not complete your payment. Please try again or contact support.';
      metaEl.textContent = '';
    } else {
      titleEl.textContent = 'Payment Result';
      messageEl.textContent = 'Awaiting payment confirmation...';
      metaEl.textContent = '';
    }

    closeBtn.addEventListener('click', function(){
      // Try to close the window. In many contexts this will be blocked; fall back to redirecting to WhatsApp.
      try{
        window.close();
      }catch(e){}
      // Give the browser a short moment to close, then redirect to WhatsApp as fallback
      setTimeout(function(){
        window.location.href = whatsappLink;
      }, 350);
    });
  }
})();
