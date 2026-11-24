// [F5] Configurazione interfaccia | Dipende da F0, F1, F3 | STABLE | 2026-11-25
// [18] Identifica la home reale della PWA e i controlli della pagina.
const homeUrl = new URL('./', document.baseURI).href;
const dialog = document.getElementById('share-dialog');
const shareLink = document.getElementById('share-link');
const shareStatus = document.getElementById('share-status');
const notice = document.getElementById('notice');
const exitButton = document.getElementById('exit-button');
let deferredInstallPrompt = null;
let noticeTimer = null;

// [F6] Barra e condivisione | Dipende da F5, F3 | STABLE | 2026-11-25
// [19] Genera il messaggio di invito con le istruzioni destinate al destinatario.
function createInviteMessage() {
  return [
    'Scopri e installa Fassa Bortolo AI.',
    '',
    'iPhone/iPad: apri il link in Safari > Condividi > Aggiungi alla schermata Home.',
    'Android: apri il link in Chrome > menu ⋮ > Installa app/Aggiungi a schermata Home.',
    '',
    'Se il link si apre nel browser interno di WhatsApp, passa a Safari su iPhone/iPad o a Chrome su Android.',
    '',
    `Link della home: ${homeUrl}`
  ].join('\n');
}

// [20] Mostra un messaggio temporaneo senza esporre una guida interna.
function showNotice(message) {
  notice.textContent = message;
  notice.hidden = false;
  window.clearTimeout(noticeTimer);
  noticeTimer = window.setTimeout(() => { notice.hidden = true; }, 4500);
}

// [21] Copia il testo negli appunti con ripiego per browser compatibili.
async function copyText(text) {
  if (navigator.clipboard && window.isSecureContext) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (_) {
      // Il ripiego viene tentato solo se gli appunti non sono disponibili.
    }
  }
  const input = document.createElement('textarea');
  input.value = text;
  input.setAttribute('readonly', '');
  input.style.position = 'fixed';
  input.style.left = '-9999px';
  document.body.appendChild(input);
  input.select();
  let copied = false;
  try { copied = document.execCommand('copy'); } catch (_) { copied = false; }
  input.remove();
  return copied;
}

// [22] Prepara la home effettiva e il messaggio WhatsApp prima della condivisione.
function prepareShare() {
  shareLink.textContent = homeUrl;
  shareStatus.textContent = '';
  document.getElementById('share-whatsapp').href = `https://wa.me/?text=${encodeURIComponent(createInviteMessage())}`;
}

// [23] Apre e chiude la finestra di condivisione con controlli espliciti.
document.getElementById('share-open').addEventListener('click', () => {
  prepareShare();
  if (!dialog.open) dialog.showModal();
});
document.getElementById('share-close').addEventListener('click', () => dialog.close());
document.getElementById('share-dismiss').addEventListener('click', () => dialog.close());

// [24] Copia separatamente l'invito completo oppure il solo link.
document.getElementById('copy-message').addEventListener('click', async () => {
  const copied = await copyText(createInviteMessage());
  shareStatus.textContent = copied ? 'Messaggio completo copiato.' : 'Copia non disponibile. Riprova dal browser.';
});
document.getElementById('copy-link').addEventListener('click', async () => {
  const copied = await copyText(homeUrl);
  shareStatus.textContent = copied ? 'Link copiato.' : 'Copia non disponibile. Riprova dal browser.';
});

// [25] Conserva l'eventuale richiesta nativa di installazione senza mostrare banner automatici.
window.addEventListener('beforeinstallprompt', (event) => {
  event.preventDefault();
  deferredInstallPrompt = event;
});

// [26] Apre la richiesta nativa quando il dispositivo la mette a disposizione.
const installButton = document.getElementById('install-button');
if (installButton) installButton.addEventListener('click', async () => {
  if (isStandalone()) {
    showNotice('Questa app è già installata.');
    return;
  }
  if (!deferredInstallPrompt) {
    showNotice('Per installare la PWA consulta il messaggio di invito ricevuto.');
    return;
  }
  const promptEvent = deferredInstallPrompt;
  deferredInstallPrompt = null;
  try {
    await promptEvent.prompt();
    await promptEvent.userChoice;
  } catch (_) {
    showNotice('La richiesta di installazione non è disponibile su questo dispositivo.');
  }
});
window.addEventListener('appinstalled', () => { deferredInstallPrompt = null; showNotice('App installata.'); });

// [F7] Stato installazione e service worker | Dipende da F5, F9 | STABLE | 2026-11-25
// [27] Riconosce la modalità standalone anche sui dispositivi Apple compatibili.
function isStandalone() {
  return window.matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
}
function updateStandaloneState() {
  exitButton.hidden = !isStandalone();
}
updateStandaloneState();
const standaloneMedia = window.matchMedia('(display-mode: standalone)');
if (standaloneMedia.addEventListener) standaloneMedia.addEventListener('change', updateStandaloneState);

// [28] Registra il service worker della sola PWA in un contesto sicuro.
if ('serviceWorker' in navigator && window.isSecureContext) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(() => {
      console.warn('Service worker non disponibile.');
    });
  });
}

// [29] Aggiorna il service worker dell'app e ricarica la pagina.
document.getElementById('refresh-button').addEventListener('click', async () => {
  if ('serviceWorker' in navigator) {
    try {
      const registration = await navigator.serviceWorker.getRegistration(homeUrl);
      if (registration) await registration.update();
    } catch (_) {
      console.warn('Aggiornamento del service worker non disponibile.');
    }
  }
  window.location.reload();
});

// [30] Esce dalla modalità installata senza toccare registrazioni di altre applicazioni.
exitButton.addEventListener('click', async () => {
  if ('serviceWorker' in navigator) {
    try {
      const registration = await navigator.serviceWorker.getRegistration(homeUrl);
      if (registration && registration.scope === homeUrl) await registration.unregister();
    } catch (_) {
      console.warn('Rimozione della registrazione non disponibile.');
    }
  }
  window.location.assign('https://www.google.com/');
});
