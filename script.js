// ===================================================================
// CONFIGURAÇÕES E CONSTANTES
// ===================================================================
const firebaseConfig = {
  apiKey: "AIzaSyDrKMIudQUfLS0j4tG-kEdkVksvSnZaIPQ",
  authDomain: "autopost-477601.firebaseapp.com",
  projectId: "autopost-477601",
  storageBucket: "autopost-477601.firebasestorage.app",
  messagingSenderId: "191333777971",
  appId: "1:191333777971:web:5aab90e1f1e39d19f61946",
  measurementId: "G-X4SBER5XVP"
};
const GOOGLE_CLIENT_ID = "191333777971-7vjn3tn7t09tfhtf6mf0funjgibep2tf.apps.googleusercontent.com";
const YOUTUBE_SCOPES = 'https://www.googleapis.com/auth/youtube.upload https://www.googleapis.com/auth/youtube';

if (!firebase.apps.length ) { firebase.initializeApp(firebaseConfig); }
const auth = firebase.auth();
const db = firebase.firestore();
const storage = firebase.storage();
const AppState = { currentUser: null, canalAtual: null, agendamentosCache: [], tokenClient: null, gapiReady: false, gisReady: false };

// ===================================================================
// FUNÇÕES UTILITÁRIAS E DE MODAL
// ===================================================================
function escapeHtml(text) { if (!text) return ''; const div = document.createElement('div'); div.textContent = text; return div.innerHTML; }
function showError(message) { console.error("❌ Erro:", message); alert(message); }
function showSuccess(message) { console.log("✅ Sucesso:", message); alert(message); }
function openModal(modalId) { const modal = document.getElementById(modalId); if (modal) modal.style.display = 'flex'; }
function closeModal(modalId) { const modal = document.getElementById(modalId); if (modal) modal.style.display = 'none'; }

// ===================================================================
// CARREGAMENTO DAS APIS DO GOOGLE
// ===================================================================
function loadGoogleApiScripts() {
  const gapiScript = document.createElement('script');
  gapiScript.src = 'https://apis.google.com/js/api.js';
  gapiScript.async = true; gapiScript.defer = true;
  gapiScript.onload = ( ) => gapi.load('client', initializeGapiClient);
  document.head.appendChild(gapiScript);
  const gisScript = document.createElement('script');
  gisScript.src = 'https://accounts.google.com/gsi/client';
  gisScript.async = true; gisScript.defer = true;
  gisScript.onload = ( ) => {
    try {
      AppState.tokenClient = google.accounts.oauth2.initTokenClient({ client_id: GOOGLE_CLIENT_ID, scope: YOUTUBE_SCOPES, callback: '' });
      AppState.gisReady = true;
      checkGoogleApiReadiness();
    } catch (error) { console.error("❌ Erro ao inicializar GIS:", error); }
  };
  document.head.appendChild(gisScript);
}
async function initializeGapiClient() {
  try {
    await gapi.client.init({ apiKey: firebaseConfig.apiKey, discoveryDocs: ['https://www.googleapis.com/discovery/v1/apis/youtube/v3/rest'] } );
    AppState.gapiReady = true;
    checkGoogleApiReadiness();
  } catch (error) { console.error("❌ Erro ao inicializar GAPI:", error); }
}
function checkGoogleApiReadiness() {
  if (AppState.gapiReady && AppState.gisReady) {
    const btn = document.getElementById('btn-connect-youtube');
    if (btn) { btn.disabled = false; btn.innerHTML = `<i data-feather="youtube"></i> Conectar com o YouTube`; if (typeof feather !== 'undefined') feather.replace(); }
  }
}

// ===================================================================
// FUNÇÕES GLOBAIS (ONCLICK)
// ===================================================================
window.entrarCanal = (id, nome) => { AppState.canalAtual = { docId: id, nome: nome }; document.getElementById('channel-management-title').textContent = `Gerenciando: ${escapeHtml(nome)}`; mostrarPagina('channel-management'); mostrarSubpagina('biblioteca'); };
window.excluirCanal = async (id) => { if (!confirm("Tem certeza?")) return; try { await db.collection('usuarios').doc(AppState.currentUser.uid).collection('canais').doc(id).delete(); showSuccess("Canal excluído."); carregarCanais(); } catch (e) { showError("Erro ao excluir canal."); } };
window.excluirMidia = async (path) => { if (!confirm("Tem certeza?")) return; try { await storage.ref(path).delete(); showSuccess("Arquivo excluído."); carregarMidias(); } catch (e) { showError("Erro ao excluir arquivo."); } };
window.abrirModalEdicao = (docId) => { const agendamento = AppState.agendamentosCache.find(a => a.docId === docId); if (!agendamento) return; try { const data = agendamento.dataHoraPublicacao.toDate(); const dataISO = data.toISOString().split('T')[0]; const horaISO = data.toTimeString().split(' ')[0].substring(0, 5); const fields = { 'schedule-id-input': docId, 'schedule-nome-video': agendamento.nome_video || '', 'schedule-nome-thumbnail': agendamento.nome_thumbnail || '', 'schedule-titulo': agendamento.titulo || '', 'schedule-descricao': agendamento.descricao || '', 'schedule-tags': agendamento.tags || '', 'schedule-data-publicacao': dataISO, 'schedule-hora-publicacao': horaISO }; Object.entries(fields).forEach(([id, value]) => { document.getElementById(id).value = value; }); openModal('schedule-modal'); } catch (e) { showError("Erro ao carregar dados."); } };
window.excluirAgendamento = async (docId) => { if (!confirm("Tem certeza?")) return; try { await db.collection('usuarios').doc(AppState.currentUser.uid).collection('canais').doc(AppState.canalAtual.docId).collection('agendamentos').doc(docId).delete(); showSuccess("Agendamento excluído."); renderizarAgendamentos(); } catch (e) { showError("Erro ao excluir agendamento."); } };

// ===================================================================
// INICIALIZAÇÃO E EVENT LISTENERS
// ===================================================================
document.addEventListener('DOMContentLoaded', () => {
  const loginPage = document.getElementById('login-page');
  const appContainer = document.querySelector('.container');
  auth.onAuthStateChanged(user => {
    if (user) {
      AppState.currentUser = user;
      loginPage.style.display = 'none';
      appContainer.style.display = 'flex';
      if (typeof feather !== 'undefined') feather.replace();
      carregarCanais();
      loadGoogleApiScripts();
    } else {
      AppState.currentUser = null;
      loginPage.style.display = 'block';
      appContainer.style.display = 'none';
    }
  });
  setupEventListeners();
});
function setupEventListeners() {
    document.getElementById('login-form')?.addEventListener('submit', handleLogin);
    document.getElementById('btn-logout')?.addEventListener('click', handleLogout);
    document.querySelectorAll('.sidebar-nav .nav-item').forEach(item => item.addEventListener('click', (e) => { e.preventDefault(); mostrarPagina(item.dataset.page); }));
    document.querySelectorAll('.channel-sidebar .channel-nav-item').forEach(item => item.addEventListener('click', (e) => { e.preventDefault(); mostrarSubpagina(item.dataset.subpage); }));
    document.getElementById('btn-back-to-dashboard')?.addEventListener('click', () => mostrarPagina('dashboard'));
    document.getElementById('btn-add-channel')?.addEventListener('click', () => openModal('channel-modal'));
    document.querySelectorAll('.modal .close-button').forEach(button => button.addEventListener('click', () => closeModal(button.closest('.modal').id)));
    window.addEventListener('click', (event) => document.querySelectorAll('.modal').forEach(modal => { if (event.target === modal) closeModal(modal.id); }));
    document.getElementById('btn-connect-youtube')?.addEventListener('click', solicitarAcessoYouTube);
    const videoInput = document.getElementById('video-file-input');
    document.getElementById('btn-upload-videos')?.addEventListener('click', () => videoInput.click());
    videoInput?.addEventListener('change', handleFileUpload);
    const thumbInput = document.getElementById('thumbnail-file-input');
    document.getElementById('btn-upload-thumbnails')?.addEventListener('click', () => thumbInput.click());
    thumbInput?.addEventListener('change', handleFileUpload);
    document.querySelectorAll('.tab-button').forEach(button => button.addEventListener('click', () => switchTab(button.dataset.tab)));
    document.getElementById('btn-download-csv-template')?.addEventListener('click', baixarModeloCSV);
    const csvInput = document.getElementById('csv-file-input');
    document.getElementById('btn-import-csv')?.addEventListener('click', () => csvInput.click());
    csvInput?.addEventListener('change', handleCsvImport);
    document.getElementById('schedule-form')?.addEventListener('submit', handleScheduleEdit);
    document.getElementById('btn-clear-schedules')?.addEventListener('click', limparTodosAgendamentos);
}

// ===================================================================
// FUNÇÕES DE AUTENTICAÇÃO E NAVEGAÇÃO
// ===================================================================
function handleLogin(e) { e.preventDefault(); const email = document.getElementById('login-email').value.trim(); const password = document.getElementById('login-password').value; const errorMessage = document.getElementById('login-error-message'); errorMessage.textContent = ''; if (!email.includes('@')) { errorMessage.textContent = "E-mail inválido."; return; } if (password.length < 6) { errorMessage.textContent = "A senha deve ter pelo menos 6 caracteres."; return; } auth.signInWithEmailAndPassword(email, password).catch(error => { let msg = "E-mail ou senha inválidos."; if (error.code === 'auth/user-not-found') msg = "Usuário não encontrado."; else if (error.code === 'auth/wrong-password') msg = "Senha incorreta."; errorMessage.textContent = msg; }); }
function handleLogout() { auth.signOut().catch(e => showError("Erro ao fazer logout.")); }
function mostrarPagina(pageId) { document.querySelectorAll('.page').forEach(p => p.classList.remove('active')); document.getElementById(`${pageId}-page`)?.classList.add('active'); document.querySelectorAll('.sidebar-nav .nav-item').forEach(i => i.classList.toggle('active', i.dataset.page === pageId)); }
function mostrarSubpagina(subpageId) { document.querySelectorAll('.channel-page').forEach(p => p.classList.remove('active')); document.getElementById(`${subpageId}-subpage`)?.classList.add('active'); document.querySelectorAll('.channel-sidebar .channel-nav-item').forEach(i => i.classList.toggle('active', i.dataset.subpage === subpageId)); if (subpageId === 'biblioteca') { carregarMidias(); switchTab('videos'); } else if (subpageId === 'agendamento') { renderizarAgendamentos(); } }
function switchTab(tabId) { document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active')); document.getElementById(`${tabId}-tab-content`)?.classList.add('active'); document.querySelectorAll('.tab-button').forEach(b => b.classList.toggle('active', b.dataset.tab === tabId)); }

// ===================================================================
// FUNÇÕES DE CANAL
// ===================================================================
async function carregarCanais() { if (!AppState.currentUser) return; const tableBody = document.getElementById('channels-table')?.querySelector('tbody'); if (!tableBody) return; tableBody.innerHTML = '<tr><td colspan="5">Carregando...</td></tr>'; try { const snapshot = await db.collection('usuarios').doc(AppState.currentUser.uid).collection('canais').orderBy('dataCriacao', 'desc').get(); if (snapshot.empty) { tableBody.innerHTML = '<tr><td colspan="5">Nenhum canal adicionado.</td></tr>'; return; } let html = ''; snapshot.forEach(doc => { const canal = doc.data(); const nomeCanal = escapeHtml(canal.nome); const dataFormatada = canal.dataCriacao ? canal.dataCriacao.toDate().toLocaleDateString('pt-BR') : 'N/A'; html += `<tr data-id="${escapeHtml(doc.id)}" data-nome="${nomeCanal}"><td>${escapeHtml(doc.id)}</td><td>${nomeCanal}</td><td>${dataFormatada}</td><td><span class="status-badge active">Ativo</span></td><td class="actions"><button class="btn-icon" onclick="entrarCanal('${escapeHtml(doc.id)}', '${nomeCanal}')"><i data-feather="arrow-right-circle"></i></button><button class="btn-icon" onclick="excluirCanal('${escapeHtml(doc.id)}')"><i data-feather="trash-2"></i></button></td></tr>`; }); tableBody.innerHTML = html; if (typeof feather !== 'undefined') feather.replace(); } catch (e) { tableBody.innerHTML = '<tr><td colspan="5">Erro ao carregar.</td></tr>'; } }
function solicitarAcessoYouTube() {
  if (!AppState.gisReady || !AppState.gapiReady) { showError("Integração com Google não pronta."); return; }
  AppState.tokenClient.callback = async (resp) => {
    if (resp.error !== undefined) { showError("Erro na autorização com o Google."); return; }
    await buscarInfoCanalEAdicionar(resp);
  };
  AppState.tokenClient.requestAccessToken({ prompt: 'consent', access_type: 'offline' });
}
async function buscarInfoCanalEAdicionar(tokenResponse) {
  try {
    gapi.client.setToken({ access_token: tokenResponse.access_token });
    const response = await gapi.client.youtube.channels.list({ part: 'snippet', mine: true });
    if (response.result.items && response.result.items.length > 0) {
      const channel = response.result.items[0];
      const channelId = channel.id;
      const channelName = channel.snippet.title;
      const canalRef = db.collection('usuarios').doc(AppState.currentUser.uid).collection('canais').doc(channelId);
      if ((await canalRef.get()).exists) { showError(`Canal "${channelName}" já adicionado.`); closeModal('channel-modal'); return; }
      const oauthData = { access_token: tokenResponse.access_token, expires_in: tokenResponse.expires_in || 3600, token_type: tokenResponse.token_type || "Bearer", scope: tokenResponse.scope || YOUTUBE_SCOPES, created_at: firebase.firestore.FieldValue.serverTimestamp() };
      if (tokenResponse.refresh_token) { oauthData.refresh_token = tokenResponse.refresh_token; console.log("✅ Refresh token obtido!"); } else { console.warn("⚠️ Refresh token NÃO foi retornado."); }
      await canalRef.set({ nome: channelName, dataCriacao: firebase.firestore.FieldValue.serverTimestamp(), oauth: oauthData });
      showSuccess(`Canal "${channelName}" adicionado!`);
      closeModal('channel-modal');
      carregarCanais();
    } else { showError("Nenhum canal do YouTube encontrado."); }
  } catch (e) { showError("Ocorreu um erro ao adicionar o canal."); } finally { gapi.client.setToken(null); }
}

// ===================================================================
// FUNÇÕES DE BIBLIOTECA
// ===================================================================
function handleFileUpload(event) { const files = event.target.files; if (!files.length || !AppState.canalAtual || !AppState.currentUser) return; const isVideo = event.target.id === 'video-file-input'; const folder = isVideo ? 'videos' : 'thumbnails'; const tiposAceitos = isVideo ? ['video'] : ['image']; Array.from(files).forEach(file => { if (!file.type.startsWith(tiposAceitos[0])) { showError(`Arquivo "${file.name}" inválido.`); return; } const filePath = `${AppState.currentUser.uid}/${AppState.canalAtual.docId}/${folder}/${file.name}`; storage.ref(filePath).put(file).on('state_changed', s => console.log(`Upload ${file.name}: ${((s.bytesTransferred / s.totalBytes) * 100).toFixed(0)}%`), e => showError(`Erro ao enviar ${file.name}.`), () => { console.log(`✅ ${file.name} enviado.`); carregarMidias(); }); }); event.target.value = ''; }
async function carregarMidias() { if (!AppState.currentUser || !AppState.canalAtual) return; await carregarArquivosDaPasta('videos'); await carregarArquivosDaPasta('thumbnails'); }
async function carregarArquivosDaPasta(folder) { const tableBody = document.getElementById(`${folder}-table`)?.querySelector('tbody'); if (!tableBody) return; tableBody.innerHTML = `<tr><td colspan="3">Carregando...</td></tr>`; const folderPath = `${AppState.currentUser.uid}/${AppState.canalAtual.docId}/${folder}/`; try { const res = await storage.ref(folderPath).listAll(); if (res.items.length === 0) { tableBody.innerHTML = `<tr><td colspan="3">Nenhum arquivo.</td></tr>`; return; } let html = ''; for (const itemRef of res.items) { html += `<tr><td>${escapeHtml(itemRef.name)}</td><td><span class="status-badge uploaded">Carregado</span></td><td class="actions"><button class="btn-icon" onclick="excluirMidia('${escapeHtml(itemRef.fullPath)}')"><i data-feather="trash-2"></i></button></td></tr>`; } tableBody.innerHTML = html; if (typeof feather !== 'undefined') feather.replace(); } catch (e) { tableBody.innerHTML = `<tr><td colspan="3">Erro ao carregar.</td></tr>`; } }

// ===================================================================
// FUNÇÕES DE AGENDAMENTO - CORRIGIDAS
// ===================================================================
function baixarModeloCSV() { const h = "nome_video,nome_thumbnail,titulo,descricao,tags,data_publicacao,hora_publicacao"; const e = "video.mp4,thumb.jpg,Meu Título,Descrição,tag1;tag2,2025-12-31,18:00"; const c = `${h}\n${e}`; const b = new Blob([c],{type:'text/csv;charset=utf-8;'}); const l = document.createElement("a"); l.href = URL.createObjectURL(b); l.download = "modelo_agendamento.csv"; l.click(); URL.revokeObjectURL(l.href); }
function handleCsvImport(event) {
  const file = event.target.files[0]; if (!file || !AppState.canalAtual) return;
  const statusBox = document.getElementById('csv-status');
  const log = (message, type = 'info') => { statusBox.innerHTML = `<p class="${type}">${escapeHtml(message)}</p>`; };
  log('Lendo arquivo...');
  Papa.parse(file, {
    header: true, skipEmptyLines: true,
    complete: async (results) => {
      try {
        const linhas = results.data.filter(r => r.data_publicacao && r.hora_publicacao);
        if (linhas.length === 0) { log('Nenhuma linha válida encontrada.', 'error'); return; }
        log(`${linhas.length} linhas válidas. Salvando...`);
        const batch = db.batch();
        linhas.forEach(row => {
          const ref = db.collection('usuarios').doc(AppState.currentUser.uid).collection('canais').doc(AppState.canalAtual.docId).collection('agendamentos').doc();
          batch.set(ref, { 
            userId: AppState.currentUser.uid, // <-- CORREÇÃO CRÍTICA
            canalId: AppState.canalAtual.docId, 
            nome_video: row.nome_video || '', 
            nome_thumbnail: row.nome_thumbnail || '', 
            titulo: row.titulo || '', 
            descricao: row.descricao || '', 
            tags: row.tags || '', 
            dataHoraPublicacao: firebase.firestore.Timestamp.fromDate(new Date(`${row.data_publicacao}T${row.hora_publicacao}:00`)), 
            status: 'Agendado', 
            dataCriacao: firebase.firestore.FieldValue.serverTimestamp() 
          });
        });
        await batch.commit();
        log(`✅ ${linhas.length} agendamentos importados!`, 'success');
        renderizarAgendamentos();
      } catch (e) { log(`ERRO: ${e.message}`, 'error'); }
    },
    error: (e) => log(`ERRO: Não foi possível ler o arquivo.`, 'error')
  });
  event.target.value = '';
}
async function renderizarAgendamentos() {
  if (!AppState.currentUser || !AppState.canalAtual) return;
  const tableBody = document.getElementById('schedules-table')?.querySelector('tbody');
  if (!tableBody) return; tableBody.innerHTML = '<tr><td colspan="4">Carregando...</td></tr>';
  try {
    const snapshot = await db.collection('usuarios').doc(AppState.currentUser.uid).collection('canais').doc(AppState.canalAtual.docId).collection('agendamentos').orderBy('dataHoraPublicacao', 'asc').get();
    AppState.agendamentosCache = snapshot.docs.map(doc => ({ docId: doc.id, ...doc.data() }));
    if (AppState.agendamentosCache.length === 0) { tableBody.innerHTML = '<tr><td colspan="4">Nenhum agendamento.</td></tr>'; return; }
    let html = '';
    AppState.agendamentosCache.forEach(ag => {
      const data = ag.dataHoraPublicacao.toDate();
      const dataFmt = data.toLocaleDateString('pt-BR') + ' ' + data.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
      let statusClass = 'scheduled';
      if (ag.status === 'Publicado') statusClass = 'published'; else if (ag.status === 'Erro') statusClass = 'error'; else if (ag.status === 'Processando') statusClass = 'processing';
      html += `<tr><td>${escapeHtml(ag.titulo)}</td><td>${dataFmt}</td><td><span class="status-badge ${statusClass}">${escapeHtml(ag.status)}</span></td><td class="actions"><button class="btn-icon" onclick="abrirModalEdicao('${escapeHtml(ag.docId)}')"><i data-feather="edit"></i></button><button class="btn-icon" onclick="excluirAgendamento('${escapeHtml(ag.docId)}')"><i data-feather="trash-2"></i></button></td></tr>`;
    });
    tableBody.innerHTML = html;
    if (typeof feather !== 'undefined') feather.replace();
  } catch (e) { tableBody.innerHTML = `<tr><td colspan="4">Erro ao carregar: ${e.message}</td></tr>`; console.error(e); }
}
async function handleScheduleEdit(e) {
  e.preventDefault();
  const docId = document.getElementById('schedule-id-input')?.value; if (!docId) return;
  const campos = { nome_video: document.getElementById('schedule-nome-video')?.value || '', nome_thumbnail: document.getElementById('schedule-nome-thumbnail')?.value || '', titulo: document.getElementById('schedule-titulo')?.value || '', descricao: document.getElementById('schedule-descricao')?.value || '', tags: document.getElementById('schedule-tags')?.value || '', data_publicacao: document.getElementById('schedule-data-publicacao')?.value || '', hora_publicacao: document.getElementById('schedule-hora-publicacao')?.value || '' };
  if (!campos.data_publicacao || !campos.hora_publicacao) { showError("Data e hora são obrigatórias."); return; }
  try {
    const dataHoraTimestamp = firebase.firestore.Timestamp.fromDate(new Date(`${campos.data_publicacao}T${campos.hora_publicacao}:00`));
    await db.collection('usuarios').doc(AppState.currentUser.uid).collection('canais').doc(AppState.canalAtual.docId).collection('agendamentos').doc(docId).update({ 
        // A função update não precisa do userId, pois ele não deve mudar.
        // Apenas os campos editáveis são atualizados.
        nome_video: campos.nome_video, 
        nome_thumbnail: campos.nome_thumbnail, 
        titulo: campos.titulo, 
        descricao: campos.descricao, 
        tags: campos.tags, 
        dataHoraPublicacao: dataHoraTimestamp 
    });
    showSuccess("Agendamento atualizado!");
    closeModal('schedule-modal');
    renderizarAgendamentos();
  } catch (e) { showError("Erro ao atualizar."); }
}
async function limparTodosAgendamentos() {
  if (!AppState.canalAtual || !confirm("Limpar TODOS os agendamentos?")) return;
  try {
    const snapshot = await db.collection('usuarios').doc(AppState.currentUser.uid).collection('canais').doc(AppState.canalAtual.docId).collection('agendamentos').get();
    if (snapshot.empty) { showError("Não há agendamentos para limpar."); return; }
    const batch = db.batch();
    snapshot.docs.forEach(doc => batch.delete(doc.ref));
    await batch.commit();
    showSuccess(`${snapshot.size} agendamentos excluídos.`);
    renderizarAgendamentos();
  } catch (e) { showError("Erro ao limpar agendamentos."); }
}
