// ===================================================================
// CONFIGURAÇÕES E CONSTANTES
// ===================================================================

const CONFIG = {
  firebase: {
    apiKey: "AIzaSyDrKMIudQUfLS0j4tG-kEdkVksvSnZaIPQ",
    authDomain: "autopost-477601.firebaseapp.com",
    projectId: "autopost-477601",
    storageBucket: "autopost-477601.appspot.com",
    messagingSenderId: "191333777971",
    appId: "1:191333777971:web:5aab90e1f1e39d19f61946",
    measurementId: "G-X4SBER5XVP"
  },
  google: {
    clientId: "191333777971-7vjn3tn7t09tfhtf6mf0funjgibep2tf.apps.googleusercontent.com",
    scopes: 'https://www.googleapis.com/auth/youtube.upload https://www.googleapis.com/auth/youtube'
  }
};

// ===================================================================
// ESTADO GLOBAL
// ===================================================================

const AppState = {
  currentUser: null,
  currentChannel: null,
  schedulesCache: [],
  tokenClient: null,
  isGapiReady: false,
  isGisReady: false,
  db: null,
  auth: null,
  storage: null
};

// ===================================================================
// INICIALIZAÇÃO DO FIREBASE
// ===================================================================

function initFirebase() {
  try {
    if (!firebase || !firebase.apps.length) {
      firebase.initializeApp(CONFIG.firebase);
    }
    
    AppState.auth = firebase.auth();
    AppState.db = firebase.firestore();
    AppState.storage = firebase.storage();
    
    console.log("✓ Firebase inicializado com sucesso");
    return true;
  } catch (error) {
    console.error("✗ Erro ao inicializar Firebase:", error);
    showError("Erro ao conectar com o servidor. Recarregue a página.");
    return false;
  }
}

// ===================================================================
// INICIALIZAÇÃO DAS APIS DO GOOGLE
// ===================================================================

window.gapiLoaded = function() {
  gapi.load('client', initializeGapiClient);
};

window.gisLoaded = function() {
  try {
    AppState.tokenClient = google.accounts.oauth2.initTokenClient({
      client_id: CONFIG.google.clientId,
      scope: CONFIG.google.scopes,
      callback: ''
    });
    AppState.isGisReady = true;
    console.log("✓ GIS client inicializado");
    checkGoogleApiReadiness();
  } catch (error) {
    console.error("✗ Erro ao inicializar GIS:", error);
  }
};

async function initializeGapiClient() {
  try {
    await gapi.client.init({
      apiKey: CONFIG.firebase.apiKey,
      discoveryDocs: ['https://www.googleapis.com/discovery/v1/apis/youtube/v3/rest']
    });
    AppState.isGapiReady = true;
    console.log("✓ GAPI client inicializado");
    checkGoogleApiReadiness();
  } catch (error) {
    console.error("✗ Erro ao inicializar GAPI:", error);
  }
}

function checkGoogleApiReadiness() {
  if (AppState.isGapiReady && AppState.isGisReady) {
    const connectButton = document.getElementById('btn-connect-youtube');
    if (connectButton) {
      connectButton.disabled = false;
      connectButton.innerHTML = '<i data-feather="youtube" class="btn-icon-feather"></i> Conectar com o YouTube';
      if (typeof feather !== 'undefined') feather.replace();
    }
  }
}

// ===================================================================
// INICIALIZAÇÃO DO DOM
// ===================================================================

document.addEventListener('DOMContentLoaded', async () => {
  // Inicializa Firebase
  if (!initFirebase()) return;

  // Elementos do DOM
  const elements = {
    loginPage: document.getElementById('login-page'),
    appContainer: document.querySelector('.container'),
    loginForm: document.getElementById('login-form'),
    logoutBtn: document.getElementById('btn-logout'),
    addChannelBtn: document.getElementById('btn-add-channel'),
    connectYoutubeBtn: document.getElementById('btn-connect-youtube'),
    backToDashboardBtn: document.getElementById('btn-back-to-dashboard'),
    uploadVideosBtn: document.getElementById('btn-upload-videos'),
    uploadThumbnailsBtn: document.getElementById('btn-upload-thumbnails'),
    videoFileInput: document.getElementById('video-file-input'),
    thumbnailFileInput: document.getElementById('thumbnail-file-input'),
    downloadCsvBtn: document.getElementById('btn-download-csv-template'),
    importCsvBtn: document.getElementById('btn-import-csv'),
    csvFileInput: document.getElementById('csv-file-input'),
    scheduleForm: document.getElementById('schedule-form'),
    clearSchedulesBtn: document.getElementById('btn-clear-schedules')
  };

  // Verifica se elementos essenciais existem
  if (!elements.loginPage || !elements.appContainer) {
    console.error("✗ Elementos essenciais do DOM não encontrados");
    return;
  }

  // ===================================================================
  // AUTENTICAÇÃO
  // ===================================================================

  AppState.auth.onAuthStateChanged(user => {
    if (user) {
      AppState.currentUser = user;
      elements.loginPage.style.display = 'none';
      elements.appContainer.style.display = 'flex';
      if (typeof feather !== 'undefined') feather.replace();
      loadChannels();
    } else {
      AppState.currentUser = null;
      AppState.currentChannel = null;
      elements.loginPage.style.display = 'block';
      elements.appContainer.style.display = 'none';
    }
  });

  // ===================================================================
  // EVENT LISTENERS
  // ===================================================================

  // Login/Logout
  if (elements.loginForm) {
    elements.loginForm.addEventListener('submit', handleLogin);
  }
  if (elements.logoutBtn) {
    elements.logoutBtn.addEventListener('click', handleLogout);
  }

  // Navegação principal
  document.querySelectorAll('.sidebar-nav .nav-item').forEach(item => {
    item.addEventListener('click', (e) => {
      e.preventDefault();
      const page = item.dataset.page;
      if (page) showPage(page);
    });
  });

  // Navegação do canal
  document.querySelectorAll('.channel-sidebar .channel-nav-item').forEach(item => {
    item.addEventListener('click', (e) => {
      e.preventDefault();
      const subpage = item.dataset.subpage;
      if (subpage) showSubpage(subpage);
    });
  });

  // Botões de ação
  if (elements.addChannelBtn) {
    elements.addChannelBtn.addEventListener('click', () => openModal('channel-modal'));
  }
  if (elements.connectYoutubeBtn) {
    elements.connectYoutubeBtn.addEventListener('click', requestYouTubeAccess);
  }
  if (elements.backToDashboardBtn) {
    elements.backToDashboardBtn.addEventListener('click', () => showPage('dashboard'));
  }

  // Upload de arquivos
  if (elements.uploadVideosBtn && elements.videoFileInput) {
    elements.uploadVideosBtn.addEventListener('click', () => elements.videoFileInput.click());
    elements.videoFileInput.addEventListener('change', (e) => handleFileUpload(e, 'videos'));
  }
  if (elements.uploadThumbnailsBtn && elements.thumbnailFileInput) {
    elements.uploadThumbnailsBtn.addEventListener('click', () => elements.thumbnailFileInput.click());
    elements.thumbnailFileInput.addEventListener('change', (e) => handleFileUpload(e, 'thumbnails'));
  }

  // CSV
  if (elements.downloadCsvBtn) {
    elements.downloadCsvBtn.addEventListener('click', downloadCsvTemplate);
  }
  if (elements.importCsvBtn && elements.csvFileInput) {
    elements.importCsvBtn.addEventListener('click', () => elements.csvFileInput.click());
    elements.csvFileInput.addEventListener('change', handleCsvImport);
  }

  // Agendamentos
  if (elements.scheduleForm) {
    elements.scheduleForm.addEventListener('submit', handleScheduleEdit);
  }
  if (elements.clearSchedulesBtn) {
    elements.clearSchedulesBtn.addEventListener('click', clearAllSchedules);
  }

  // Tabs
  document.querySelectorAll('.tab-button').forEach(button => {
    button.addEventListener('click', () => {
      const tab = button.dataset.tab;
      if (tab) switchTab(tab);
    });
  });

  // Modais
  document.querySelectorAll('.modal .close-button').forEach(button => {
    button.addEventListener('click', () => {
      const modal = button.closest('.modal');
      if (modal) closeModal(modal.id);
    });
  });

  window.addEventListener('click', (event) => {
    if (event.target.classList.contains('modal')) {
      closeModal(event.target.id);
    }
  });
});

// ===================================================================
// FUNÇÕES DE AUTENTICAÇÃO
// ===================================================================

async function handleLogin(e) {
  e.preventDefault();
  
  const emailInput = document.getElementById('login-email');
  const passwordInput = document.getElementById('login-password');
  const errorMessage = document.getElementById('login-error-message');
  
  if (!emailInput || !passwordInput || !errorMessage) return;
  
  const email = emailInput.value.trim();
  const password = passwordInput.value;
  
  // Validação básica
  if (!email || !password) {
    errorMessage.textContent = 'Por favor, preencha todos os campos.';
    return;
  }
  
  if (!isValidEmail(email)) {
    errorMessage.textContent = 'Por favor, insira um e-mail válido.';
    return;
  }
  
  errorMessage.textContent = '';
  
  try {
    await AppState.auth.signInWithEmailAndPassword(email, password);
  } catch (error) {
    console.error("Erro no login:", error);
    
    let message = 'E-mail ou senha inválidos.';
    if (error.code === 'auth/user-not-found') {
      message = 'Usuário não encontrado.';
    } else if (error.code === 'auth/wrong-password') {
      message = 'Senha incorreta.';
    } else if (error.code === 'auth/too-many-requests') {
      message = 'Muitas tentativas. Tente novamente mais tarde.';
    }
    
    errorMessage.textContent = message;
  }
}

async function handleLogout() {
  try {
    await AppState.auth.signOut();
  } catch (error) {
    console.error("Erro no logout:", error);
    showError("Erro ao fazer logout.");
  }
}

// ===================================================================
// FUNÇÕES DE NAVEGAÇÃO
// ===================================================================

function showPage(pageId) {
  document.querySelectorAll('.page').forEach(page => {
    page.classList.remove('active');
  });
  
  const targetPage = document.getElementById(`${pageId}-page`);
  if (targetPage) {
    targetPage.classList.add('active');
  }
  
  document.querySelectorAll('.sidebar-nav .nav-item').forEach(item => {
    item.classList.toggle('active', item.dataset.page === pageId);
  });
}

function showSubpage(subpageId) {
  document.querySelectorAll('.channel-page').forEach(page => {
    page.classList.remove('active');
  });
  
  const targetSubpage = document.getElementById(`${subpageId}-subpage`);
  if (targetSubpage) {
    targetSubpage.classList.add('active');
  }
  
  document.querySelectorAll('.channel-sidebar .channel-nav-item').forEach(item => {
    item.classList.toggle('active', item.dataset.subpage === subpageId);
  });

  // Carrega dados específicos da subpágina
  if (subpageId === 'biblioteca') {
    loadMedia();
    switchTab('videos');
  } else if (subpageId === 'agendamento') {
    renderSchedules();
  }
}

function switchTab(tabId) {
  document.querySelectorAll('.tab-content').forEach(content => {
    content.classList.remove('active');
  });
  
  const targetContent = document.getElementById(`${tabId}-tab-content`);
  if (targetContent) {
    targetContent.classList.add('active');
  }
  
  document.querySelectorAll('.tab-button').forEach(button => {
    button.classList.toggle('active', button.dataset.tab === tabId);
  });
}

// ===================================================================
// FUNÇÕES DE CANAL
// ===================================================================

async function loadChannels() {
  if (!AppState.currentUser) return;
  
  const tableBody = document.querySelector('#channels-table tbody');
  if (!tableBody) return;
  
  tableBody.innerHTML = '<tr><td colspan="5">Carregando canais...</td></tr>';

  try {
    const snapshot = await AppState.db
      .collection('usuarios')
      .doc(AppState.currentUser.uid)
      .collection('canais')
      .orderBy('dataCriacao', 'desc')
      .get();

    if (snapshot.empty) {
      tableBody.innerHTML = '<tr><td colspan="5">Nenhum canal adicionado. Clique em "Adicionar Canal" para começar.</td></tr>';
      return;
    }

    let html = '';
    snapshot.forEach(doc => {
      const canal = doc.data();
      const dataCriacao = canal.dataCriacao ? canal.dataCriacao.toDate().toLocaleDateString('pt-BR') : 'N/A';
      const nomeSeguro = escapeHtml(canal.nome || 'Sem nome');
      
      html += `
        <tr data-id="${doc.id}">
          <td>${escapeHtml(doc.id)}</td>
          <td>${nomeSeguro}</td>
          <td>${dataCriacao}</td>
          <td><span class="status-badge active">Ativo</span></td>
          <td class="actions">
            <button class="btn-icon" onclick="window.enterChannel('${doc.id}', '${nomeSeguro.replace(/'/g, "\\'")}')">
              <i data-feather="arrow-right-circle"></i>
            </button>
            <button class="btn-icon" onclick="window.deleteChannel('${doc.id}')">
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
    tableBody.innerHTML = '<tr><td colspan="5">Erro ao carregar canais. Tente recarregar a página.</td></tr>';
  }
}

function requestYouTubeAccess() {
  if (!AppState.isGisReady || !AppState.isGapiReady) {
    showError("A integração com o Google ainda não está pronta. Aguarde alguns segundos.");
    return;
  }

  AppState.tokenClient.callback = async (response) => {
    if (response.error !== undefined) {
      console.error("Erro na autorização:", response);
      showError("Erro durante a autorização com o Google.");
      return;
    }
    
    await fetchChannelInfoAndAdd(response.access_token);
  };

  try {
    AppState.tokenClient.requestAccessToken({ prompt: 'consent' });
  } catch (error) {
    console.error("Erro ao solicitar acesso:", error);
    showError("Erro ao iniciar autorização.");
  }
}

async function fetchChannelInfoAndAdd(accessToken) {
  try {
    gapi.client.setToken({ access_token: accessToken });
    
    const response = await gapi.client.youtube.channels.list({
      part: 'snippet',
      mine: true
    });

    if (!response.result.items || response.result.items.length === 0) {
      showError("Nenhum canal do YouTube encontrado nesta conta Google.");
      return;
    }

    const channel = response.result.items[0];
    const channelId = channel.id;
    const channelName = channel.snippet.title;

    // Verifica se o canal já existe
    const existingChannel = await AppState.db
      .collection('usuarios')
      .doc(AppState.currentUser.uid)
      .collection('canais')
      .doc(channelId)
      .get();

    if (existingChannel.exists) {
      showError(`O canal "${channelName}" já está adicionado.`);
      return;
    }

    // Adiciona o canal
    await AppState.db
      .collection('usuarios')
      .doc(AppState.currentUser.uid)
      .collection('canais')
      .doc(channelId)
      .set({
        nome: channelName,
        dataCriacao: firebase.firestore.FieldValue.serverTimestamp()
      });

    showSuccess(`Canal "${channelName}" adicionado com sucesso!`);
    closeModal('channel-modal');
    loadChannels();
  } catch (error) {
    console.error("Erro ao buscar canal:", error);
    showError("Erro ao adicionar o canal. Tente novamente.");
  } finally {
    gapi.client.setToken(null);
  }
}

window.deleteChannel = async function(channelId) {
  if (!confirm("Tem certeza que deseja excluir este canal e todos os seus dados?")) {
    return;
  }

  try {
    await AppState.db
      .collection('usuarios')
      .doc(AppState.currentUser.uid)
      .collection('canais')
      .doc(channelId)
      .delete();

    showSuccess("Canal excluído com sucesso.");
    loadChannels();
  } catch (error) {
    console.error("Erro ao excluir canal:", error);
    showError("Erro ao excluir o canal.");
  }
};

window.enterChannel = function(channelId, channelName) {
  AppState.currentChannel = { id: channelId, name: channelName };
  
  const titleElement = document.getElementById('channel-management-title');
  if (titleElement) {
    titleElement.textContent = `Gerenciando: ${channelName}`;
  }
  
  showPage('channel-management');
  showSubpage('biblioteca');
};

// ===================================================================
// FUNÇÕES DE BIBLIOTECA (UPLOAD/DOWNLOAD)
// ===================================================================

async function handleFileUpload(event, folder) {
  const files = event.target.files;
  if (!files || files.length === 0) return;
  if (!AppState.currentChannel || !AppState.currentUser) {
    showError("Nenhum canal selecionado.");
    return;
  }

  const uploadPromises = [];
  
  for (const file of files) {
    // Validação do arquivo
    if (folder === 'videos') {
      if (!file.type.startsWith('video/')) {
        showError(`${file.name} não é um arquivo de vídeo válido.`);
        continue;
      }
    } else if (folder === 'thumbnails') {
      if (!file.type.startsWith('image/')) {
        showError(`${file.name} não é uma imagem válida.`);
        continue;
      }
    }

    const filePath = `${AppState.currentUser.uid}/${AppState.currentChannel.id}/${folder}/${file.name}`;
    const uploadTask = AppState.storage.ref(filePath).put(file);

    const promise = new Promise((resolve, reject) => {
      uploadTask.on('state_changed',
        (snapshot) => {
          const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
          console.log(`Upload de ${file.name}: ${progress.toFixed(0)}%`);
        },
        (error) => {
          console.error(`Erro no upload de ${file.name}:`, error);
          showError(`Erro ao enviar ${file.name}.`);
          reject(error);
        },
        () => {
          console.log(`${file.name} enviado com sucesso.`);
          resolve();
        }
      );
    });

    uploadPromises.push(promise);
  }

  try {
    await Promise.all(uploadPromises);
    showSuccess(`${files.length} arquivo(s) enviado(s) com sucesso!`);
    loadMedia();
  } catch (error) {
    console.error("Erro em alguns uploads:", error);
  }

  // Limpa o input
  event.target.value = '';
}

async function loadMedia() {
  if (!AppState.currentUser || !AppState.currentChannel) return;
  
  await loadFilesFromFolder('videos');
  await loadFilesFromFolder('thumbnails');
}

async function loadFilesFromFolder(folder) {
  const tableBody = document.querySelector(`#${folder}-table tbody`);
  if (!tableBody) return;
  
  tableBody.innerHTML = '<tr><td colspan="3">Carregando...</td></tr>';
  
  const folderPath = `${AppState.currentUser.uid}/${AppState.currentChannel.id}/${folder}/`;

  try {
    const result = await AppState.storage.ref(folderPath).listAll();
    
    if (result.items.length === 0) {
      tableBody.innerHTML = '<tr><td colspan="3">Nenhum arquivo encontrado.</td></tr>';
      return;
    }

    let html = '';
    for (const itemRef of result.items) {
      const fileName = escapeHtml(itemRef.name);
      const fullPath = itemRef.fullPath;
      
      html += `
        <tr>
          <td>${fileName}</td>
          <td><span class="status-badge uploaded">Carregado</span></td>
          <td class="actions">
            <button class="btn-icon" onclick="window.deleteMedia('${fullPath}')">
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
    tableBody.innerHTML = '<tr><td colspan="3">Erro ao carregar arquivos.</td></tr>';
  }
}

window.deleteMedia = async function(fullPath) {
  if (!confirm("Tem certeza que deseja excluir este arquivo?")) {
    return;
  }

  try {
    await AppState.storage.ref(fullPath).delete();
    showSuccess("Arquivo excluído com sucesso.");
    loadMedia();
  } catch (error) {
    console.error("Erro ao excluir mídia:", error);
    showError("Erro ao excluir o arquivo.");
  }
};

// ===================================================================
// FUNÇÕES DE AGENDAMENTO
// ===================================================================

function downloadCsvTemplate() {
  const header = "nome_video,nome_thumbnail,titulo,descricao,tags,data_publicacao,hora_publicacao";
  const exemplo = "video_exemplo.mp4,thumb_exemplo.jpg,Meu Título Incrível,Descrição detalhada do vídeo.,tag1|tag2|tag3,2025-12-31,18:00";
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

async function handleCsvImport(event) {
  const file = event.target.files[0];
  if (!file) return;
  
  if (!AppState.currentChannel) {
    showError("Nenhum canal selecionado.");
    return;
  }

  const statusBox = document.getElementById('csv-status');
  if (!statusBox) return;

  const logStatus = (message, type = 'info') => {
    statusBox.innerHTML = `<p class="${type}">${escapeHtml(message)}</p>`;
  };

  logStatus('Lendo arquivo CSV...');

  // Verifica se Papa está disponível
  if (typeof Papa === 'undefined') {
    logStatus('Biblioteca PapaParse não encontrada. Recarregue a página.', 'error');
    return;
  }

  Papa.parse(file, {
    header: true,
    skipEmptyLines: true,
    complete: async (results) => {
      if (!results.data || results.data.length === 0) {
        logStatus('Arquivo CSV vazio ou inválido.', 'error');
        return;
      }

      logStatus(`Arquivo lido. ${results.data.length} registro(s) encontrado(s). Salvando...`);

      const batch = AppState.db.batch();
      let validCount = 0;

      results.data.forEach(row => {
        // Valida dados obrigatórios
        if (!row.nome_video || !row.titulo || !row.data_publicacao || !row.hora_publicacao) {
          console.warn("Linha inválida ignorada:", row);
          return;
        }

        try {
          const dataHora = `${row.data_publicacao}T${row.hora_publicacao}:00`;
          const date = new Date(dataHora);
          
          if (isNaN(date.getTime())) {
            console.warn("Data/hora inválida:", row);
            return;
          }

          const dataHoraTimestamp = firebase.firestore.Timestamp.fromDate(date);
          const agendamentoRef = AppState.db.collection('agendamentos').doc();
          
          batch.set(agendamentoRef, {
            canalId: AppState.currentChannel.id,
            nome_video: row.nome_video.trim(),
            nome_thumbnail: row.nome_thumbnail ? row.nome_thumbnail.trim() : '',
            titulo: row.titulo.trim(),
            descricao: row.descricao ? row.descricao.trim() : '',
            tags: row.tags ? row.tags.trim() : '',
            dataHoraPublicacao: dataHoraTimestamp,
            status: 'Agendado',
            criadoEm: firebase.firestore.FieldValue.serverTimestamp()
          });
          
          validCount++;
        } catch (error) {
          console.warn("Erro ao processar linha:", row, error);
        }
      });

      if (validCount === 0) {
        logStatus('Nenhum registro válido encontrado no CSV.', 'error');
        return;
      }

      try {
        await batch.commit();
        logStatus(`${validCount} agendamento(s) importado(s) com sucesso!`, 'success');
        renderSchedules();
      } catch (error) {
        console.error("Erro ao salvar agendamentos:", error);
        logStatus('Erro ao salvar no banco de dados.', 'error');
      }
    },
    error: (error) => {
      console.error("Erro ao parsear CSV:", error);
      logStatus('Erro ao ler o arquivo CSV.', 'error');
    }
  });

  // Limpa o input
  event.target.value = '';
}

async function renderSchedules() {
  if (!AppState.currentUser || !AppState.currentChannel) return;
  
  const tableBody = document.querySelector('#schedules-table tbody');
  if (!tableBody) return;
  
  tableBody.innerHTML = '<tr><td colspan="4">Carregando agendamentos...</td></tr>';

  try {
    const snapshot = await AppState.db
      .collection('agendamentos')
      .where('canalId', '==', AppState.currentChannel.id)
      .orderBy('dataHoraPublicacao', 'asc')
      .get();

    AppState.schedulesCache = snapshot.docs.map(doc => ({
      docId: doc.id,
      ...doc.data()
    }));

    if (AppState.schedulesCache.length === 0) {
      tableBody.innerHTML = '<tr><td colspan="4">Nenhum agendamento na fila.</td></tr>';
      return;
    }

    let html = '';
    AppState.schedulesCache.forEach(schedule => {
      const date = schedule.dataHoraPublicacao.toDate();
      const formattedDate = date.toLocaleDateString('pt-BR') + ' ' + 
                           date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
      const titulo = escapeHtml(schedule.titulo);
      
      html += `
        <tr data-id="${schedule.docId}">
          <td>${titulo}</td>
          <td>${formattedDate}</td>
          <td><span class="status-badge scheduled">${escapeHtml(schedule.status)}</span></td>
          <td class="actions">
            <button class="btn-icon" onclick="window.openScheduleEditModal('${schedule.docId}')">
              <i data-feather="edit"></i>
            </button>
            <button class="btn-icon" onclick="window.deleteSchedule('${schedule.docId}')">
              <i data-feather="trash-2"></i>
            </button>
          </td>