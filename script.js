// ===================================================================
// CONFIGURAÇÕES E INICIALIZAÇÃO (VERSÃO FINAL UNIFICADA)
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

firebase.initializeApp(firebaseConfig );
const auth = firebase.auth();
const db = firebase.firestore();
const storage = firebase.storage();

let currentUser = null;
let canalAtual = null;
let agendamentosCache = [];
let tokenClient;
let gapiReady = false;
let gisReady = false;

// ===================================================================
// CALLBACKS DA API DO GOOGLE
// ===================================================================

window.gapiLoaded = function() {
    gapi.load('client', initializeGapiClient);
}

window.gisLoaded = function() {
    tokenClient = google.accounts.oauth2.initTokenClient({
        client_id: GOOGLE_CLIENT_ID,
        scope: YOUTUBE_SCOPES,
        callback: '', 
    });
    gisReady = true;
    console.log("GIS client inicializado.");
    checkGoogleApiReadiness();
}

async function initializeGapiClient() {
    try {
        await gapi.client.init({
            apiKey: GOOGLE_API_KEY,
            discoveryDocs: ['https://www.googleapis.com/discovery/v1/apis/youtube/v3/rest'],
        } );
        gapiReady = true;
        console.log("GAPI client inicializado.");
        checkGoogleApiReadiness();
    } catch (err) {
        console.error("Erro ao inicializar GAPI client:", err);
    }
}

function checkGoogleApiReadiness() {
    if (gapiReady && gisReady) {
        const connectButton = document.getElementById('btn-connect-youtube');
        if (connectButton) {
            connectButton.disabled = false;
            connectButton.innerHTML = `<i data-feather="youtube" class="btn-icon-feather"></i> Conectar com o YouTube`;
            feather.replace();
        }
    }
}

// ===================================================================
// LÓGICA PRINCIPAL DO APP
// ===================================================================

document.addEventListener('DOMContentLoaded', () => {
    // Páginas principais
    const loginPage = document.getElementById('login-page');
    const appContainer = document.querySelector('.container');

    // Monitora estado de autenticação
    auth.onAuthStateChanged(user => {
        if (user) {
            currentUser = user;
            loginPage.style.display = 'none';
            appContainer.style.display = 'flex';
            feather.replace();
            carregarCanais();
        } else {
            currentUser = null;
            loginPage.style.display = 'block';
            appContainer.style.display = 'none';
        }
    });

    // --- EVENT LISTENERS ---

    // Login / Logout
    document.getElementById('login-form').addEventListener('submit', handleLogin);
    document.getElementById('btn-logout').addEventListener('click', handleLogout);

    // Navegação
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
    document.getElementById('btn-back-to-dashboard').addEventListener('click', () => mostrarPagina('dashboard'));

    // Modais
    document.getElementById('btn-add-channel').addEventListener('click', () => openModal('channel-modal'));
    document.querySelectorAll('.modal .close-button').forEach(button => {
        button.addEventListener('click', () => closeModal(button.closest('.modal').id));
    });
    window.addEventListener('click', (event) => {
        document.querySelectorAll('.modal').forEach(modal => {
            if (event.target == modal) closeModal(modal.id);
        });
    });

    // Conexão com YouTube
    document.getElementById('btn-connect-youtube').addEventListener('click', solicitarAcessoYouTube);

    // Biblioteca
    document.getElementById('btn-upload-videos').addEventListener('click', () => document.getElementById('video-file-input').click());
    document.getElementById('video-file-input').addEventListener('change', handleFileUpload);
    document.getElementById('btn-upload-thumbnails').addEventListener('click', () => document.getElementById('thumbnail-file-input').click());
    document.getElementById('thumbnail-file-input').addEventListener('change', handleFileUpload);
    document.querySelectorAll('.tab-button').forEach(button => {
        button.addEventListener('click', () => switchTab(button.dataset.tab));
    });

    // Agendamento
    document.getElementById('btn-download-csv-template').addEventListener('click', baixarModeloCSV);
    document.getElementById('btn-import-csv').addEventListener('click', () => document.getElementById('csv-file-input').click());
    document.getElementById('csv-file-input').addEventListener('change', handleCsvImport);
    document.getElementById('schedule-form').addEventListener('submit', handleScheduleEdit);
    document.getElementById('btn-clear-schedules').addEventListener('click', limparTodosAgendamentos);
});


// ===================================================================
// FUNÇÕES DE AUTENTICAÇÃO
// ===================================================================

function handleLogin(e) {
    e.preventDefault();
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;
    const errorMessage = document.getElementById('login-error-message');
    errorMessage.textContent = '';

    auth.signInWithEmailAndPassword(email, password)
        .catch(error => {
            errorMessage.textContent = "E-mail ou senha inválidos.";
            console.error("Erro de login:", error);
        });
}

function handleLogout() {
    auth.signOut();
}

// ===================================================================
// FUNÇÕES DE NAVEGAÇÃO
// ===================================================================

function mostrarPagina(pageId) {
    document.querySelectorAll('.page').forEach(page => page.classList.remove('active'));
    document.getElementById(`${pageId}-page`).classList.add('active');
    document.querySelectorAll('.sidebar-nav .nav-item').forEach(item => {
        item.classList.toggle('active', item.dataset.page === pageId);
    });
}

function mostrarSubpagina(subpageId) {
    document.querySelectorAll('.channel-page').forEach(page => page.classList.remove('active'));
    document.getElementById(`${subpageId}-subpage`).classList.add('active');
    document.querySelectorAll('.channel-sidebar .channel-nav-item').forEach(item => {
        item.classList.toggle('active', item.dataset.subpage === subpageId);
    });

    // Lógica para carregar dados ao mudar de subpágina
    if (subpageId === 'biblioteca') {
        carregarMidias();
        switchTab('videos');
    } else if (subpageId === 'agendamento') {
        renderizarAgendamentos();
    }
}

function switchTab(tabId) {
    document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
    document.getElementById(`${tabId}-tab-content`).classList.add('active');
    document.querySelectorAll('.tab-button').forEach(button => {
        button.classList.toggle('active', button.dataset.tab === tabId);
    });
}

// ===================================================================
// FUNÇÕES DE CANAL
// ===================================================================

async function carregarCanais() {
    if (!currentUser) return;
    const tableBody = document.getElementById('channels-table').querySelector('tbody');
    tableBody.innerHTML = '<tr><td colspan="5">Carregando canais...</td></tr>';

    try {
        // CORREÇÃO: Usando a estrutura de subcoleção correta
        const snapshot = await db.collection('usuarios').doc(currentUser.uid).collection('canais').orderBy('dataCriacao', 'desc').get();
        if (snapshot.empty) {
            tableBody.innerHTML = '<tr><td colspan="5">Nenhum canal adicionado ainda.</td></tr>';
            return;
        }

        let html = '';
        snapshot.forEach(doc => {
            const canal = doc.data();
            html += `
                <tr data-id="${doc.id}" data-nome="${canal.nome}">
                    <td>${doc.id}</td>
                    <td>${canal.nome}</td>
                    <td>${canal.dataCriacao.toDate().toLocaleDateString()}</td>
                    <td><span class="status-badge active">Ativo</span></td>
                    <td class="actions">
                        <button class="btn-icon" onclick="entrarCanal('${doc.id}', '${canal.nome}')"><i data-feather="arrow-right-circle"></i></button>
                        <button class="btn-icon" onclick="excluirCanal('${doc.id}')"><i data-feather="trash-2"></i></button>
                    </td>
                </tr>
            `;
        });
        tableBody.innerHTML = html;
        feather.replace();
    } catch (error) {
        console.error("Erro ao carregar canais:", error);
        tableBody.innerHTML = '<tr><td colspan="5">Erro ao carregar canais.</td></tr>';
    }
}

function solicitarAcessoYouTube() {
    if (!gisReady || !gapiReady) {
        alert("A integração com o Google ainda não está pronta. Por favor, aguarde.");
        return;
    }

    tokenClient.callback = async (resp) => {
        if (resp.error !== undefined) {
            console.error("Erro no callback do token:", resp);
            alert("Ocorreu um erro durante a autorização com o Google.");
            return;
        }
        await buscarInfoCanalEAdicionar(resp.access_token);
    };

    tokenClient.requestAccessToken({ prompt: 'consent' });
}

async function buscarInfoCanalEAdicionar(accessToken) {
    try {
        gapi.client.setToken({ access_token: accessToken });
        const response = await gapi.client.youtube.channels.list({ part: 'snippet', mine: true });

        if (response.result.items && response.result.items.length > 0) {
            const channel = response.result.items[0];
            const channelId = channel.id;
            const channelName = channel.snippet.title;

            // CORREÇÃO: Salvando na subcoleção do usuário
            await db.collection('usuarios').doc(currentUser.uid).collection('canais').doc(channelId).set({
                nome: channelName,
                dataCriacao: firebase.firestore.FieldValue.serverTimestamp()
            });

            alert(`Canal "${channelName}" adicionado com sucesso!`);
            closeModal('channel-modal');
            carregarCanais();
        } else {
            alert("Nenhum canal do YouTube encontrado para esta conta Google.");
        }
    } catch (error) {
        console.error("Erro ao buscar informações do canal:", error);
        alert("Ocorreu um erro ao adicionar o canal.");
    } finally {
        gapi.client.setToken(null);
    }
}

async function excluirCanal(channelId) {
    if (!confirm("Tem certeza que deseja excluir este canal e todos os seus dados?")) return;
    try {
        // CORREÇÃO: Excluindo da subcoleção do usuário
        await db.collection('usuarios').doc(currentUser.uid).collection('canais').doc(channelId).delete();
        alert("Canal excluído com sucesso.");
        carregarCanais();
    } catch (error) {
        console.error("Erro ao excluir canal:", error);
        alert("Ocorreu um erro ao excluir o canal.");
    }
}

function entrarCanal(channelId, channelName) {
    canalAtual = { docId: channelId, nome: channelName };
    document.getElementById('channel-management-title').textContent = `Gerenciando: ${channelName}`;
    mostrarPagina('channel-management');
    mostrarSubpagina('biblioteca');
}

// ===================================================================
// FUNÇÕES DE BIBLIOTECA (UPLOAD/DOWNLOAD)
// ===================================================================

function handleFileUpload(event) {
    const files = event.target.files;
    if (!files.length || !canalAtual || !currentUser) return;

    const isVideo = event.target.id === 'video-file-input';
    const folder = isVideo ? 'videos' : 'thumbnails';

    for (const file of files) {
        // CORREÇÃO: Usando a estrutura de pastas correta
        const filePath = `${currentUser.uid}/${canalAtual.docId}/${folder}/${file.name}`;
        const uploadTask = storage.ref(filePath).put(file);

        uploadTask.on('state_changed',
            () => {},
            (error) => {
                console.error(`Erro no upload de ${file.name}:`, error);
                alert(`Erro ao enviar ${file.name}.`);
            },
            () => {
                console.log(`${file.name} enviado com sucesso.`);
                carregarMidias();
            }
        );
    }
}

async function carregarMidias() {
    if (!currentUser || !canalAtual) return;
    await carregarArquivosDaPasta('videos');
    await carregarArquivosDaPasta('thumbnails');
}

async function carregarArquivosDaPasta(folder) {
    const tableBody = document.getElementById(`${folder}-table`).querySelector('tbody');
    tableBody.innerHTML = `<tr><td colspan="3">Carregando...</td></tr>`;
    // CORREÇÃO: Usando a estrutura de pastas correta
    const folderPath = `${currentUser.uid}/${canalAtual.docId}/${folder}/`;

    try {
        const res = await storage.ref(folderPath).listAll();
        if (res.items.length === 0) {
            tableBody.innerHTML = `<tr><td colspan="3">Nenhum arquivo encontrado.</td></tr>`;
            return;
        }
        let html = '';
        for (const itemRef of res.items) {
            html += `
                <tr>
                    <td>${itemRef.name}</td>
                    <td><span class="status-badge uploaded">Carregado</span></td>
                    <td class="actions">
                        <button class="btn-icon" onclick="excluirMidia('${itemRef.fullPath}')"><i data-feather="trash-2"></i></button>
                    </td>
                </tr>
            `;
        }
        tableBody.innerHTML = html;
        feather.replace();
    } catch (error) {
        console.error(`Erro ao listar ${folder}:`, error);
        tableBody.innerHTML = `<tr><td colspan="3">Erro ao carregar arquivos.</td></tr>`;
    }
}

async function excluirMidia(fullPath) {
    if (!confirm("Tem certeza que deseja excluir este arquivo?")) return;
    try {
        await storage.ref(fullPath).delete();
        alert("Arquivo excluído com sucesso.");
        carregarMidias();
    } catch (error) {
        console.error("Erro ao excluir mídia:", error);
        alert("Ocorreu um erro ao excluir o arquivo.");
    }
}

// ===================================================================
// FUNÇÕES DE AGENDAMENTO
// ===================================================================

function baixarModeloCSV() {
    const header = "nome_video,nome_thumbnail,titulo,descricao,tags,data_publicacao,hora_publicacao";
    const content = "video_exemplo.mp4,thumb_exemplo.jpg,Meu Título Incrível,Descrição detalhada do vídeo.,tag1,tag2,2025-12-31,18:00";
    const csv = `${header}\n${content}`;
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", "modelo_agendamento.csv");
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

function handleCsvImport(event) {
    const file = event.target.files[0];
    if (!file || !canalAtual) return;

    const statusBox = document.getElementById('csv-status');
    const logCsvStatus = (message, type = 'info') => {
        statusBox.innerHTML = `<p class="${type}">${message}</p>`;
    };

    logCsvStatus('Lendo arquivo CSV...');
    Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: async (results) => {
            logCsvStatus(`Arquivo lido. ${results.data.length} registros encontrados. Salvando...`);
            const batch = db.batch();
            results.data.forEach(row => {
                const dataHora = `${row.data_publicacao}T${row.hora_publicacao}:00`;
                const dataHoraTimestamp = firebase.firestore.Timestamp.fromDate(new Date(dataHora));

                const agendamentoRef = db.collection('agendamentos').doc();
                batch.set(agendamentoRef, {
                    canalId: canalAtual.docId,
                    nome_video: row.nome_video || '',
                    nome_thumbnail: row.nome_thumbnail || '',
                    titulo: row.titulo || '',
                    descricao: row.descricao || '',
                    tags: row.tags || '',
                    dataHoraPublicacao: dataHoraTimestamp,
                    status: 'Agendado'
                });
            });

            try {
                await batch.commit();
                logCsvStatus(`${results.data.length} agendamentos importados com sucesso!`, 'success');
                renderizarAgendamentos();
            } catch (error) {
                console.error("Erro ao salvar agendamentos:", error);
                logCsvStatus(`ERRO FATAL ao salvar no banco de dados.`, 'error');
            }
        },
        error: (error) => {
            console.error("Erro ao parsear CSV:", error);
            logCsvStatus(`ERRO: Não foi possível ler o arquivo CSV.`, 'error');
        }
    });
}

async function renderizarAgendamentos() {
    if (!currentUser || !canalAtual) return;
    const tableBody = document.getElementById('schedules-table').querySelector('tbody');
    tableBody.innerHTML = '<tr><td colspan="4">Carregando agendamentos...</td></tr>';

    try {
        const snapshot = await db.collection('agendamentos')
            .where('canalId', '==', canalAtual.docId)
            .orderBy('dataHoraPublicacao', 'asc')
            .get();

        agendamentosCache = snapshot.docs.map(doc => ({ docId: doc.id, ...doc.data() }));

        if (agendamentosCache.length === 0) {
            tableBody.innerHTML = '<tr><td colspan="4">Nenhum agendamento na fila.</td></tr>';
            return;
        }

        let html = '';
        agendamentosCache.forEach(agendamento => {
            const data = agendamento.dataHoraPublicacao.toDate();
            const dataFormatada = data.toLocaleDateString() + ' ' + data.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            html += `
                <tr data-id="${agendamento.docId}">
                    <td>${agendamento.titulo}</td>
                    <td>${dataFormatada}</td>
                    <td><span class="status-badge scheduled">${agendamento.status}</span></td>
                    <td class="actions">
                        <button class="btn-icon" onclick="abrirModalEdicao('${agendamento.docId}')"><i data-feather="edit"></i></button>
                        <button class="btn-icon" onclick="excluirAgendamento('${agendamento.docId}')"><i data-feather="trash-2"></i></button>
                    </td>
                </tr>
            `;
        });
        tableBody.innerHTML = html;
        feather.replace();
    } catch (error) {
        console.error("Erro ao renderizar agendamentos:", error);
        tableBody.innerHTML = `<tr><td colspan="4">Erro ao carregar agendamentos.</td></tr>`;
    }
}

function abrirModalEdicao(docId) {
    const agendamento = agendamentosCache.find(a => a.docId === docId);
    if (!agendamento) return;

    const data = agendamento.dataHoraPublicacao.toDate();
    const dataISO = data.toISOString().split('T')[0];
    const horaISO = data.toTimeString().split(' ')[0].substring(0, 5);

    document.getElementById('schedule-id-input').value = docId;
    document.getElementById('schedule-nome-video').value = agendamento.nome_video || '';
    document.getElementById('schedule-nome-thumbnail').value = agendamento.nome_thumbnail || '';
    document.getElementById('schedule-titulo').value = agendamento.titulo || '';
    document.getElementById('schedule-descricao').value = agendamento.descricao || '';
    document.getElementById('schedule-tags').value = agendamento.tags || '';
    document.getElementById('schedule-data-publicacao').value = dataISO;
    document.getElementById('schedule-hora-publicacao').value = horaISO;

    openModal('schedule-modal');
}

async function handleScheduleEdit(e) {
    e.preventDefault();
    const docId = document.getElementById('schedule-id-input').value;
    if (!docId) return;

    const data = document.getElementById('schedule-data-publicacao').value;
    const hora = document.getElementById('schedule-hora-publicacao').value;
    const dataHora = `${data}T${hora}:00`;
    const dataHoraTimestamp = firebase.firestore.Timestamp.fromDate(new Date(dataHora));

    const dadosAtualizados = {
        nome_video: document.getElementById('schedule-nome-video').value,
        nome_thumbnail: document.getElementById('schedule-nome-thumbnail').value,
        titulo: document.getElementById('schedule-titulo').value,
        descricao: document.getElementById('schedule-descricao').value,
        tags: document.getElementById('schedule-tags').value,
        dataHoraPublicacao: dataHoraTimestamp
    };

    try {
        await db.collection('agendamentos').doc(docId).update(dadosAtualizados);
        alert("Agendamento atualizado com sucesso!");
        closeModal('schedule-modal');
        renderizarAgendamentos();
    } catch (error) {
        console.error("Erro ao salvar alterações:", error);
        alert("Não foi possível salvar as alterações.");
    }
}

async function excluirAgendamento(docId) {
    if (!confirm("Tem certeza que deseja excluir este agendamento?")) return;
    try {
        await db.collection('agendamentos').doc(docId).delete();
        alert("Agendamento excluído com sucesso.");
        renderizarAgendamentos();
    } catch (error) {
        console.error("Erro ao excluir agendamento:", error);
        alert("Ocorreu um erro ao excluir o agendamento.");
    }
}

async function limparTodosAgendamentos() {
    if (!canalAtual || agendamentosCache.length === 0) {
        alert("Não há agendamentos para limpar.");
        return;
    }
    if (!confirm(`Tem certeza que deseja excluir TODOS os ${agendamentosCache.length} agendamentos deste canal?`)) {
        return;
    }

    const batch = db.batch();
    agendamentosCache.forEach(agendamento => {
        const docRef = db.collection('agendamentos').doc(agendamento.docId);
        batch.delete(docRef);
    });

    try {
        await batch.commit();
        alert("Todos os agendamentos foram excluídos com sucesso.");
        renderizarAgendamentos();
    } catch (error) {
        console.error("Erro ao limpar agendamentos:", error);
        alert("Ocorreu um erro ao limpar a fila.");
    }
}

// ===================================================================
// FUNÇÕES UTILITÁRIAS (MODAIS)
// ===================================================================

function openModal(modalId) {
    document.getElementById(modalId).style.display = 'flex';
}

function closeModal(modalId) {
    document.getElementById(modalId).style.display = 'none';
}
