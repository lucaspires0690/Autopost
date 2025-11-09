// ===================================================================
// CONFIGURAÇÕES E CONSTANTES
// ===================================================================

const firebaseConfig = {
  apiKey: "AIzaSyDrKMIudQUfLS0j4tG-kEdkVksvSnZaIPQ",
  authDomain: "autopost-477601.firebaseapp.com",
  projectId: "autopost-477601",
  storageBucket: "autopost-477601.appspot.com",
  messagingSenderId: "191333777971",
  appId: "1:191333777971:web:5aab90e1f1e39d19f61946",
  measurementId: "G-X4SBER5XVP"
};

const GOOGLE_API_KEY = firebaseConfig.apiKey;
const GOOGLE_CLIENT_ID = "191333777971-7vjn3tn7t09tfhtf6mf0funjgibep2tf.apps.googleusercontent.com";
const YOUTUBE_SCOPES = 'https://www.googleapis.com/auth/youtube.upload https://www.googleapis.com/auth/youtube';

// Inicialização do Firebase com verificação
if (!firebase.apps.length ) {
  firebase.initializeApp(firebaseConfig);
  console.log("✅ Firebase inicializado");
} else {
  console.log("ℹ️ Firebase já estava inicializado");
}

const auth = firebase.auth();
const db = firebase.firestore();
const storage = firebase.storage();

// Estado global da aplicação
const AppState = {
  currentUser: null,
  canalAtual: null,
  agendamentosCache: [],
  tokenClient: null,
  gapiReady: false,
  gisReady: false
};

// ===================================================================
// FUNÇÕES UTILITÁRIAS
// ===================================================================

function escapeHtml(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function showError(message) {
  console.error("❌ Erro:", message);
  alert(message);
}

function showSuccess(message) {
  console.log("✅ Sucesso:", message);
  alert(message);
}

function validarEmail(email) {
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return regex.test(email);
}

function validarArquivo(file, tiposAceitos) {
  if (!file) return false;
  return tiposAceitos.some(tipo => file.type.startsWith(tipo));
}

// ===================================================================
// CARREGAMENTO DINÂMICO DAS APIS DO GOOGLE
// ===================================================================

function loadGoogleApiScripts() {
  // Carrega GAPI
  const gapiScript = document.createElement('script');
  gapiScript.src = 'https://apis.google.com/js/api.js';
  gapiScript.async = true;
  gapiScript.defer = true;
  gapiScript.onload = ( ) => {
    console.log("📡 GAPI script carregado");
    gapi.load('client', initializeGapiClient);
  };
  document.head.appendChild(gapiScript);

  // Carrega GIS
  const gisScript = document.createElement('script');
  gisScript.src = 'https://accounts.google.com/gsi/client';
  gisScript.async = true;
  gisScript.defer = true;
  gisScript.onload = ( ) => {
    console.log("📡 GIS script carregado");
    try {
      AppState.tokenClient = google.accounts.oauth2.initTokenClient({
        client_id: GOOGLE_CLIENT_ID,
        scope: YOUTUBE_SCOPES,
        callback: ''
      });
      AppState.gisReady = true;
      console.log("✅ GIS client inicializado");
      checkGoogleApiReadiness();
    } catch (error) {
      console.error("❌ Erro ao inicializar GIS:", error);
    }
  };
  document.head.appendChild(gisScript);
}

async function initializeGapiClient() {
  try {
    await gapi.client.init({
      apiKey: GOOGLE_API_KEY,
      discoveryDocs: ['https://www.googleapis.com/discovery/v1/apis/youtube/v3/rest']
    } );
    AppState.gapiReady = true;
    console.log("✅ GAPI client inicializado");
    checkGoogleApiReadiness();
  } catch (error) {
    console.error("❌ Erro ao inicializar GAPI:", error);
  }
}

function checkGoogleApiReadiness() {
  if (AppState.gapiReady && AppState.gisReady) {
    const connectButton = document.getElementById('btn-connect-youtube');
    if (connectButton) {
      connectButton.disabled = false;
      connectButton.innerHTML = `<i data-feather="youtube" class="btn-icon-feather"></i> Conectar com o YouTube`;
      if (typeof feather !== 'undefined') feather.replace();
    }
  }
}

// ===================================================================
// FUNÇÕES GLOBAIS PARA ONCLICK (EXPOSTAS NO WINDOW)
// ===================================================================

window.entrarCanal = function(channelId, channelName) {
  AppState.canalAtual = { docId: channelId, nome: channelName };
  const titleElement = document.getElementById('channel-management-title');
  if (titleElement) {
    titleElement.textContent = `Gerenciando: ${escapeHtml(channelName)}`;
  }
  mostrarPagina('channel-management');
  mostrarSubpagina('biblioteca');
}

window.excluirCanal = async function(channelId) {
  if (!confirm("Tem certeza que deseja excluir este canal e todos os seus dados?")) return;
  
  try {
    await db.collection('usuarios').doc(AppState.currentUser.uid).collection('canais').doc(channelId).delete();
    showSuccess("Canal excluído com sucesso.");
    carregarCanais();
  } catch (error) {
    console.error("Erro ao excluir canal:", error);
    showError("Ocorreu um erro ao excluir o canal.");
  }
}

window.excluirMidia = async function(fullPath) {
  if (!confirm("Tem certeza que deseja excluir este arquivo?")) return;
  
  try {
    await storage.ref(fullPath).delete();
    showSuccess("Arquivo excluído com sucesso.");
    carregarMidias();
  } catch (error) {
    console.error("Erro ao excluir mídia:", error);
    showError("Ocorreu um erro ao excluir o arquivo.");
  }
}

window.abrirModalEdicao = function(docId) {
  const agendamento = AppState.agendamentosCache.find(a => a.docId === docId);
  if (!agendamento) return;

  try {
    const data = agendamento.dataHoraPublicacao.toDate();
    const dataISO = data.toISOString().split('T')[0];
    const horaISO = data.toTimeString().split(' ')[0].substring(0, 5);

    const fields = {
      'schedule-id-input': docId,
      'schedule-nome-video': agendamento.nome_video || '',
      'schedule-nome-thumbnail': agendamento.nome_thumbnail || '',
      'schedule-titulo': agendamento.titulo || '',
      'schedule-descricao': agendamento.descricao || '',
      'schedule-tags': agendamento.tags || '',
      'schedule-data-publicacao': dataISO,
      'schedule-hora-publicacao': horaISO
    };

    Object.entries(fields).forEach(([id, value]) => {
      const element = document.getElementById(id);
      if (element) element.value = value;
    });

    openModal('schedule-modal');
  } catch (error) {
    console.error("Erro ao abrir modal de edição:", error);
    showError("Erro ao carregar dados do agendamento.");
  }
}

window.excluirAgendamento = async function(docId) {
  if (!confirm("Tem certeza que deseja excluir este agendamento?")) return;
  
  try {
    await db.collection('agendamentos').doc(docId).delete();
    showSuccess("Agendamento excluído com sucesso.");
    renderizarAgendamentos();
  } catch (error) {
    console.error("Erro ao excluir agendamento:", error);
    showError("Ocorreu um erro ao excluir o agendamento.");
  }
}

// ===================================================================
// INICIALIZAÇÃO DO APP
// ===================================================================

document.addEventListener('DOMContentLoaded', () => {
  console.log("🚀 Aplicação inicializando...");
  
  const dependencies = {
    'Firebase': typeof firebase !== 'undefined',
    'PapaParse': typeof Papa !== 'undefined',
    'Feather Icons': typeof feather !== 'undefined'
  };
  
  console.log("📦 Dependências:", dependencies);
  
  const loginPage = document.getElementById('login-page');
  const appContainer = document.querySelector('.container');

  if (!loginPage || !appContainer) {
    console.error("❌ Elementos principais não encontrados!");
    return;
  }

  auth.onAuthStateChanged(user => {
    if (user) {
      AppState.currentUser = user;
      console.log("👤 Usuário autenticado:", user.email);
      loginPage.style.display = 'none';
      appContainer.style.display = 'flex';
      if (typeof feather !== 'undefined') feather.replace();
      carregarCanais();
      loadGoogleApiScripts();
    } else {
      AppState.currentUser = null;
      console.log("👤 Usuário não autenticado");
      loginPage.style.display = 'block';
      appContainer.style.display = 'none';
    }
  });

  setupEventListeners();
});

function setupEventListeners() {
  const loginForm = document.getElementById('login-form');
  if (loginForm) loginForm.addEventListener('submit', handleLogin);

  const logoutBtn = document.getElementById('btn-logout');
  if (logoutBtn) logoutBtn.addEventListener('click', handleLogout);

  document.querySelectorAll('.sidebar-nav .nav-item').forEach(item => {
    item.addEventListener('click', (e) => {
      e.preventDefault();
      mostrarPagina(item.dataset.page);
    });
  });

  document.querySelectorAll('.channel-sidebar .channel-nav-item').forEach(item => {
    item.addEventListener('click', (e) => {
      e.preventDefault();
      mostrarSubpagina(item.dataset.subpage);
    });
  });

  const backBtn = document.getElementById('btn-back-to-dashboard');
  if (backBtn) backBtn.addEventListener('click', () => mostrarPagina('dashboard'));

  const addChannelBtn = document.getElementById('btn-add-channel');
  if (addChannelBtn) addChannelBtn.addEventListener('click', () => openModal('channel-modal'));

  document.querySelectorAll('.modal .close-button').forEach(button => {
    button.addEventListener('click', () => {
      const modal = button.closest('.modal');
      if (modal) closeModal(modal.id);
    });
  });

  window.addEventListener('click', (event) => {
    document.querySelectorAll('.modal').forEach(modal => {
      if (event.target === modal) closeModal(modal.id);
    });
  });

  const connectBtn = document.getElementById('btn-connect-youtube');
  if (connectBtn) connectBtn.addEventListener('click', solicitarAcessoYouTube);

  const uploadVideosBtn = document.getElementById('btn-upload-videos');
  const videoInput = document.getElementById('video-file-input');
  if (uploadVideosBtn && videoInput) {
    uploadVideosBtn.addEventListener('click', () => videoInput.click());
    videoInput.addEventListener('change', handleFileUpload);
  }

  const uploadThumbsBtn = document.getElementById('btn-upload-thumbnails');
  const thumbInput = document.getElementById('thumbnail-file-input');
  if (uploadThumbsBtn && thumbInput) {
    uploadThumbsBtn.addEventListener('click', () => thumbInput.click());
    thumbInput.addEventListener('change', handleFileUpload);
  }

  document.querySelectorAll('.tab-button').forEach(button => {
    button.addEventListener('click', () => switchTab(button.dataset.tab));
  });

  const downloadTemplateBtn = document.getElementById('btn-download-csv-template');
  if (downloadTemplateBtn) downloadTemplateBtn.addEventListener('click', baixarModeloCSV);

  const importCsvBtn = document.getElementById('btn-import-csv');
  const csvInput = document.getElementById('csv-file-input');
  if (importCsvBtn && csvInput) {
    importCsvBtn.addEventListener('click', () => csvInput.click());
    csvInput.addEventListener('change', handleCsvImport);
  }

  const scheduleForm = document.getElementById('schedule-form');
  if (scheduleForm) scheduleForm.addEventListener('submit', handleScheduleEdit);

  const clearSchedulesBtn = document.getElementById('btn-clear-schedules');
  if (clearSchedulesBtn) clearSchedulesBtn.addEventListener('click', limparTodosAgendamentos);
}

// ===================================================================
// FUNÇÕES DE AUTENTICAÇÃO
// ===================================================================

function handleLogin(e) {
  e.preventDefault();
  
  const emailInput = document.getElementById('login-email');
  const passwordInput = document.getElementById('login-password');
  const errorMessage = document.getElementById('login-error-message');
  
  if (!emailInput || !passwordInput || !errorMessage) return;
  
  const email = emailInput.value.trim();
  const password = passwordInput.value;
  
  errorMessage.textContent = '';

  if (!validarEmail(email)) {
    errorMessage.textContent = "E-mail inválido.";
    return;
  }

  if (password.length < 6) {
    errorMessage.textContent = "A senha deve ter pelo menos 6 caracteres.";
    return;
  }

  auth.signInWithEmailAndPassword(email, password)
    .catch(error => {
      console.error("Erro de login:", error);
      let mensagem = "E-mail ou senha inválidos.";
      if (error.code === 'auth/user-not-found') mensagem = "Usuário não encontrado.";
      else if (error.code === 'auth/wrong-password') mensagem = "Senha incorreta.";
      else if (error.code === 'auth/invalid-email') mensagem = "E-mail inválido.";
      else if (error.code === 'auth/user-disabled') mensagem = "Usuário desabilitado.";
      errorMessage.textContent = mensagem;
    });
}

function handleLogout() {
  auth.signOut().catch(error => {
    console.error("Erro ao fazer logout:", error);
    showError("Erro ao fazer logout.");
  });
}

// ===================================================================
// FUNÇÕES DE NAVEGAÇÃO
// ===================================================================

function mostrarPagina(pageId) {
  document.querySelectorAll('.page').forEach(page => page.classList.remove('active'));
  const targetPage = document.getElementById(`${pageId}-page`);
  if (targetPage) targetPage.classList.add('active');
  
  document.querySelectorAll('.sidebar-nav .nav-item').forEach(item => {
    item.classList.toggle('active', item.dataset.page === pageId);
  });
}

function mostrarSubpagina(subpageId) {
  document.querySelectorAll('.channel-page').forEach(page => page.classList.remove('active'));
  const targetSubpage = document.getElementById(`${subpageId}-subpage`);
  if (targetSubpage) targetSubpage.classList.add('active');
  
  document.querySelectorAll('.channel-sidebar .channel-nav-item').forEach(item => {
    item.classList.toggle('active', item.dataset.subpage === subpageId);
  });

  if (subpageId === 'biblioteca') {
    carregarMidias();
    switchTab('videos');
  } else if (subpageId === 'agendamento') {
    renderizarAgendamentos();
  }
}

function switchTab(tabId) {
  document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
  const targetTab = document.getElementById(`${tabId}-tab-content`);
  if (targetTab) targetTab.classList.add('active');
  
  document.querySelectorAll('.tab-button').forEach(button => {
    button.classList.toggle('active', button.dataset.tab === tabId);
  });
}

// ===================================================================
// FUNÇÕES DE CANAL
// ===================================================================

async function carregarCanais() {
  if (!AppState.currentUser) return;
  
  const tableBody = document.getElementById('channels-table')?.querySelector('tbody');
  if (!tableBody) return;
  
  tableBody.innerHTML = '<tr><td colspan="5">Carregando canais...</td></tr>';

  try {
    const snapshot = await db.collection('usuarios')
      .doc(AppState.currentUser.uid)
      .collection('canais')
      .orderBy('dataCriacao', 'desc')
      .get();

    if (snapshot.empty) {
      tableBody.innerHTML = '<tr><td colspan="5">Nenhum canal adicionado ainda.</td></tr>';
      return;
    }

    let html = '';
    snapshot.forEach(doc => {
      const canal = doc.data();
      const nomeCanal = escapeHtml(canal.nome);
      const dataFormatada = canal.dataCriacao ? 
        canal.dataCriacao.toDate().toLocaleDateString('pt-BR') : 
        'N/A';

      html += `
        <tr data-id="${escapeHtml(doc.id)}" data-nome="${nomeCanal}">
          <td>${escapeHtml(doc.id)}</td>
          <td>${nomeCanal}</td>
          <td>${dataFormatada}</td>
          <td><span class="status-badge active">Ativo</span></td>
          <td class="actions">
            <button class="btn-icon" onclick="entrarCanal('${escapeHtml(doc.id)}', '${nomeCanal}')">
              <i data-feather="arrow-right-circle"></i>
            </button>
            <button class="btn-icon" onclick="excluirCanal('${escapeHtml(doc.id)}')">
              <i data-feather="trash-2"></i>
            </button>
          </td>
        </tr>
      `;
    });
    
    tableBody.innerHTML = html;
    if (typeof feather !== 'undefined') feather.replace();
  } catch (error) {
    console.error("Erro ao carregar canais:", error);
    tableBody.innerHTML = '<tr><td colspan="5">Erro ao carregar canais.</td></tr>';
  }
}

function solicitarAcessoYouTube() {
  if (!AppState.gisReady || !AppState.gapiReady) {
    showError("A integração com o Google ainda não está pronta. Por favor, aguarde.");
    return;
  }

  AppState.tokenClient.callback = async (resp) => {
    if (resp.error !== undefined) {
      console.error("Erro no callback do token:", resp);
      showError("Ocorreu um erro durante a autorização com o Google.");
      return;
    }
    await buscarInfoCanalEAdicionar(resp.access_token);
  };

  try {
    AppState.tokenClient.requestAccessToken({ prompt: 'consent' });
  } catch (error) {
    console.error("Erro ao solicitar acesso:", error);
    showError("Erro ao solicitar autorização.");
  }
}

async function buscarInfoCanalEAdicionar(accessToken) {
  try {
    gapi.client.setToken({ access_token: accessToken });
    const response = await gapi.client.youtube.channels.list({ 
      part: 'snippet', 
      mine: true 
    });

    if (response.result.items && response.result.items.length > 0) {
      const channel = response.result.items[0];
      const channelId = channel.id;
      const channelName = channel.snippet.title;

      const canalExistente = await db.collection('usuarios')
        .doc(AppState.currentUser.uid)
        .collection('canais')
        .doc(channelId)
        .get();

      if (canalExistente.exists) {
        showError(`O canal "${channelName}" já está adicionado.`);
        closeModal('channel-modal');
        return;
      }

      await db.collection('usuarios')
        .doc(AppState.currentUser.uid)
        .collection('canais')
        .doc(channelId)
        .set({
          nome: channelName,
          dataCriacao: firebase.firestore.FieldValue.serverTimestamp()
        });

      showSuccess(`Canal "${channelName}" adicionado com sucesso!`);
      closeModal('channel-modal');
      carregarCanais();
    } else {
      showError("Nenhum canal do YouTube encontrado para esta conta Google.");
    }
  } catch (error) {
    console.error("Erro ao buscar informações do canal:", error);
    showError("Ocorreu um erro ao adicionar o canal.");
  } finally {
    gapi.client.setToken(null);
  }
}

// ===================================================================
// FUNÇÕES DE BIBLIOTECA
// ===================================================================

function handleFileUpload(event) {
  const files = event.target.files;
  if (!files.length || !AppState.canalAtual || !AppState.currentUser) return;

  const isVideo = event.target.id === 'video-file-input';
  const folder = isVideo ? 'videos' : 'thumbnails';
  const tiposAceitos = isVideo ? ['video'] : ['image'];

  Array.from(files).forEach(file => {
    if (!validarArquivo(file, tiposAceitos)) {
      showError(`Arquivo "${file.name}" não é um ${isVideo ? 'vídeo' : 'imagem'} válido.`);
      return;
    }

    const filePath = `${AppState.currentUser.uid}/${AppState.canalAtual.docId}/${folder}/${file.name}`;
    const uploadTask = storage.ref(filePath).put(file);

    uploadTask.on('state_changed',
      (snapshot) => {
        const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
        console.log(`Upload ${file.name}: ${progress.toFixed(0)}%`);
      },
      (error) => {
        console.error(`Erro no upload de ${file.name}:`, error);
        showError(`Erro ao enviar ${file.name}.`);
      },
      () => {
        console.log(`✅ ${file.name} enviado com sucesso.`);
        carregarMidias();
      }
    );
  });

  event.target.value = '';
}

async function carregarMidias() {
  if (!AppState.currentUser || !AppState.canalAtual) return;
  await carregarArquivosDaPasta('videos');
  await carregarArquivosDaPasta('thumbnails');
}

async function carregarArquivosDaPasta(folder) {
  const tableBody = document.getElementById(`${folder}-table`)?.querySelector('tbody');
  if (!tableBody) return;
  
  tableBody.innerHTML = `<tr><td colspan="3">Carregando...</td></tr>`;
  
  const folderPath = `${AppState.currentUser.uid}/${AppState.canalAtual.docId}/${folder}/`;

  try {
    const res = await storage.ref(folderPath).listAll();
    
    if (res.items.length === 0) {
      tableBody.innerHTML = `<tr><td colspan="3">Nenhum arquivo encontrado.</td></tr>`;
      return;
    }
    
    let html = '';
    for (const itemRef of res.items) {
      const nomeArquivo = escapeHtml(itemRef.name);
      html += `
        <tr>
          <td>${nomeArquivo}</td>
          <td><span class="status-badge uploaded">Carregado</span></td>
          <td class="actions">
            <button class="btn-icon" onclick="excluirMidia('${escapeHtml(itemRef.fullPath)}')">
              <i data-feather="trash-2"></i>
            </button>
          </td>
        </tr>
      `;
    }
    
    tableBody.innerHTML = html;
    if (typeof feather !== 'undefined') feather.replace();
  } catch (error) {
    console.error(`Erro ao listar ${folder}:`, error);
    tableBody.innerHTML = `<tr><td colspan="3">Erro ao carregar arquivos.</td></tr>`;
  }
}

// ===================================================================
// FUNÇÕES DE AGENDAMENTO
// ===================================================================

function baixarModeloCSV() {
  const header = "nome_video,nome_thumbnail,titulo,descricao,tags,data_publicacao,hora_publicacao";
  const exemplo = "video_exemplo.mp4,thumb_exemplo.jpg,Meu Título Incrível,Descrição detalhada do vídeo.,tag1;tag2;tag3,2025-12-31,18:00";
  const csv = `${header}\n${exemplo}`;
  
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);
  
  link.setAttribute("href", url);
  link.setAttribute("download", "modelo_agendamento.csv");
  link.style.visibility = 'hidden';
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  URL.revokeObjectURL(url);
}

function handleCsvImport(event) {
  const file = event.target.files[0];
  if (!file || !AppState.canalAtual) return;

  if (!file.name.endsWith('.csv')) {
    showError('Por favor, selecione um arquivo .CSV válido.');
    event.target.value = '';
    return;
  }

  const statusBox = document.getElementById('csv-status');
  if (!statusBox) return;

  const logCsvStatus = (message, type = 'info') => {
    statusBox.innerHTML = `<p class="${type}">${escapeHtml(message)}</p>`;
  };

  logCsvStatus('Lendo arquivo CSV...');
  
  if (typeof Papa === 'undefined') {
    logCsvStatus('ERRO: Biblioteca PapaParse não carregada.', 'error');
    return;
  }

  Papa.parse(file, {
    header: true,
    skipEmptyLines: true,
    complete: async (results) => {
      try {
        if (!results.data || results.data.length === 0) {
          logCsvStatus('Nenhum dado encontrado no arquivo CSV.', 'error');
          return;
        }

        logCsvStatus(`Arquivo lido. ${results.data.length} registros encontrados. Validando...`);

        const linhasValidas = results.data.filter((row, index) => {
          if (!row.data_publicacao || !row.hora_publicacao) {
            console.warn(`Linha ${index + 1} ignorada: faltam data/hora`);
            return false;
          }
          try {
            const dataHora = `${row.data_publicacao}T${row.hora_publicacao}:00`;
            const date = new Date(dataHora);
            if (isNaN(date.getTime())) {
              console.warn(`Linha ${index + 1} ignorada: data/hora inválida`);
              return false;
            }
          } catch (error) {
            console.warn(`Linha ${index + 1} ignorada: erro ao processar data/hora`);
            return false;
          }
          return true;
        });

        if (linhasValidas.length === 0) {
          logCsvStatus('Nenhuma linha válida encontrada no CSV.', 'error');
          return;
        }

        logCsvStatus(`${linhasValidas.length} linhas válidas. Salvando no banco...`);

        const batch = db.batch();
        linhasValidas.forEach(row => {
          const dataHora = `${row.data_publicacao}T${row.hora_publicacao}:00`;
          const dataHoraTimestamp = firebase.firestore.Timestamp.fromDate(new Date(dataHora));

          const agendamentoRef = db.collection('agendamentos').doc();
          batch.set(agendamentoRef, {
            canalId: AppState.canalAtual.docId,
            nome_video: row.nome_video || '',
            nome_thumbnail: row.nome_thumbnail || '',
            titulo: row.titulo || '',
            descricao: row.descricao || '',
            tags: row.tags || '',
            dataHoraPublicacao: dataHoraTimestamp,
            status: 'Agendado'
          });
        });

        await batch.commit();
        logCsvStatus(`${linhasValidas.length} agendamentos importados com sucesso!`, 'success');
        renderizarAgendamentos();
      } catch (error) {
        console.error("Erro ao processar CSV:", error);
        logCsvStatus(`ERRO ao salvar no banco de dados: ${error.message}`, 'error');
      }
    },
    error: (error) => {
      console.error("Erro ao parsear CSV:", error);
      logCsvStatus(`ERRO: Não foi possível ler o arquivo CSV.`, 'error');
    }
  });

  event.target.value = '';
}

async function renderizarAgendamentos() {
  if (!AppState.currentUser || !AppState.canalAtual) return;
  
  const tableBody = document.getElementById('schedules-table')?.querySelector('tbody');
  if (!tableBody) return;
  
  tableBody.innerHTML = '<tr><td colspan="4">Carregando agendamentos...</td></tr>';

  try {
    const snapshot = await db.collection('agendamentos')
      .where('canalId', '==', AppState.canalAtual.docId)
      .orderBy('dataHoraPublicacao', 'asc')
      .get();

    AppState.agendamentosCache = snapshot.docs.map(doc => ({ 
      docId: doc.id, 
      ...doc.data() 
    }));

    if (AppState.agendamentosCache.length === 0) {
      tableBody.innerHTML = '<tr><td colspan="4">Nenhum agendamento na fila.</td></tr>';
      return;
    }

    let html = '';
    AppState.agendamentosCache.forEach(agendamento => {
      const data = agendamento.dataHoraPublicacao.toDate();
      const dataFormatada = data.toLocaleDateString('pt-BR') + ' ' + 
        data.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
      
      const titulo = escapeHtml(agendamento.titulo);
      const status = escapeHtml(agendamento.status);
      
      html += `
        <tr data-id="${escapeHtml(agendamento.docId)}">
          <td>${titulo}</td>
          <td>${dataFormatada}</td>
          <td><span class="status-badge scheduled">${status}</span></td>
          <td class="actions">
            <button class="btn-icon" onclick="abrirModalEdicao('${escapeHtml(agendamento.docId)}')">
              <i data-feather="edit"></i>
            </button>
            <button class="btn-icon" onclick="excluirAgendamento('${escapeHtml(agendamento.docId)}')">
              <i data-feather="trash-2"></i>
            </button>
          </td>
        </tr>
      `;
    });
    
    tableBody.innerHTML = html;
    if (typeof feather !== 'undefined') feather.replace();
  } catch (error) {
    console.error("Erro ao renderizar agendamentos:", error);
    tableBody.innerHTML = `<tr><td colspan="4">Erro ao carregar agendamentos.</td></tr>`;
  }
}

async function handleScheduleEdit(e) {
  e.preventDefault();
  
  const docIdInput = document.getElementById('schedule-id-input');
  if (!docIdInput) return;
  
  const docId = docIdInput.value;
  if (!docId) return;

  const campos = {
    nome_video: document.getElementById('schedule-nome-video')?.value || '',
    nome_thumbnail: document.getElementById('schedule-nome-thumbnail')?.value || '',
    titulo: document.getElementById('schedule-titulo')?.value || '',
    descricao: document.getElementById('schedule-descricao')?.value || '',
    tags: document.getElementById('schedule-tags')?.value || '',
    data: document.
